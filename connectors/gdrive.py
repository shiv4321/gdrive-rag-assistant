"""
connectors/gdrive.py
──────────────────────────────────────────────────────────────────
Google Drive connector.

Supports two auth modes (auto-detected from env):
  1. Service Account  – set GOOGLE_SERVICE_ACCOUNT_JSON
  2. OAuth 2.0        – set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET

Public surface
──────────────
  DriveConnector.list_files()         → list of DriveFile metadata dicts
  DriveConnector.download_file(meta)  → bytes
  DriveConnector.get_oauth_url()      → str (OAuth flow only)
  DriveConnector.exchange_code(code)  → stores credentials
"""

from __future__ import annotations

import io
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from config import get_settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# MIME types we care about
SUPPORTED_MIME = {
    "application/pdf": "pdf",
    "application/vnd.google-apps.document": "gdoc",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

# Google Docs must be exported; all others are downloaded directly
EXPORT_MIME = {
    "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}


@dataclass
class DriveFile:
    id: str
    name: str
    mime_type: str
    modified_time: str
    size: int = 0
    parents: list[str] = field(default_factory=list)

    @property
    def ext(self) -> str:
        return SUPPORTED_MIME.get(self.mime_type, "bin")

    def to_dict(self) -> dict:
        return {
            "doc_id": self.id,
            "file_name": self.name,
            "mime_type": self.mime_type,
            "modified_time": self.modified_time,
            "size": self.size,
            "source": "gdrive",
        }


class DriveConnector:
    """Thin wrapper around the Drive v3 API."""

    def __init__(self, credentials: Any | None = None) -> None:
        self._creds = credentials or self._build_credentials()
        self._service = build("drive", "v3", credentials=self._creds, cache_discovery=False)

    # ── Auth helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _build_credentials() -> Any:
        settings = get_settings()

        if settings.google_service_account_json:
            raw = settings.google_service_account_json.strip()
            info = json.loads(raw) if raw.startswith("{") else json.loads(open(raw).read())
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

        raise RuntimeError(
            "No Google credentials configured. "
            "Set GOOGLE_SERVICE_ACCOUNT_JSON or use OAuth flow."
        )

    @staticmethod
    def get_oauth_url() -> str:
        """Return the Google OAuth consent-screen URL (OAuth mode)."""
        settings = get_settings()
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        return url

    @staticmethod
    def from_oauth_code(code: str) -> "DriveConnector":
        """Exchange an OAuth auth-code for a DriveConnector instance."""
        settings = get_settings()
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        flow.fetch_token(code=code)
        return DriveConnector(credentials=flow.credentials)

    # ── Core API ──────────────────────────────────────────────────────────────

    def list_files(self, page_size: int = 100) -> list[DriveFile]:
        """Return all supported files from Drive (paginated)."""
        mime_filter = " or ".join(
            f"mimeType='{m}'" for m in SUPPORTED_MIME
        )
        query = f"({mime_filter}) and trashed=false"

        files: list[DriveFile] = []
        page_token: str | None = None

        while True:
            kwargs: dict[str, Any] = dict(
                q=query,
                pageSize=page_size,
                fields="nextPageToken, files(id, name, mimeType, modifiedTime, size, parents)",
            )
            if page_token:
                kwargs["pageToken"] = page_token

            resp = self._service.files().list(**kwargs).execute()

            for f in resp.get("files", []):
                files.append(
                    DriveFile(
                        id=f["id"],
                        name=f["name"],
                        mime_type=f["mimeType"],
                        modified_time=f.get("modifiedTime", ""),
                        size=int(f.get("size", 0)),
                        parents=f.get("parents", []),
                    )
                )

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        logger.info("Drive listed %d supported files", len(files))
        return files

    def download_file(self, drive_file: DriveFile) -> bytes:
        """Download or export a Drive file and return raw bytes."""
        if drive_file.mime_type in EXPORT_MIME:
            export_mime = EXPORT_MIME[drive_file.mime_type]
            request = self._service.files().export_media(
                fileId=drive_file.id, mimeType=export_mime
            )
        else:
            request = self._service.files().get_media(fileId=drive_file.id)

        buf = io.BytesIO()
        downloader = MediaIoBaseDownload(buf, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        return buf.getvalue()
