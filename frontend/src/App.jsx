import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import AskPage from "./pages/AskPage";
import SyncPage from "./pages/SyncPage";
import StatusPage from "./pages/StatusPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"       element={<AskPage />} />
          <Route path="/sync"   element={<SyncPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
