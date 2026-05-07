import { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Alert, Backdrop, CircularProgress, Snackbar } from "@mui/material";
import Header from "./components/Header/Header";
import CertListPage from "./pages/CertListPage";
import CertEditorPage from "./pages/CertEditor/CertEditorPage";
import { BatchProvider } from "./pages/Batch/BatchContext";
import BatchUploadPage from "./pages/Batch/BatchUploadPage";
import BatchPreviewPage from "./pages/Batch/BatchPreviewPage";
import BatchDraftEditorPage from "./pages/Batch/BatchDraftEditorPage";
import LoginPage from "./pages/LoginPage";
import { getAll } from "./services/cert";
import type { Cert } from "./types";

interface AlertInfo {
  type: "success" | "error";
  message: string;
}

interface AppContextValue {
  certs: Cert[];
  refreshCerts: () => Promise<void>;
  showBackdrop: (v: boolean) => void;
  setAlert: (v: AlertInfo | null) => void;
  logout: () => void;
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue);
export const useAppContext = () => useContext(AppContext);

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem("token");
    const exp = localStorage.getItem("tokenExp");
    if (t && exp && Date.now() > Number(exp)) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExp");
      return null;
    }
    return t;
  });
  const [certs, setCerts] = useState<Cert[]>([]);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [alert, setAlert] = useState<AlertInfo | null>(null);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExp");
    setToken(null);
    setCerts([]);
  };

  const refreshCerts = async () => {
    setBackdropOpen(true);
    try {
      setCerts(await getAll());
    } catch {
      setAlert({ type: "error", message: "获取证书列表失败" });
    } finally {
      setBackdropOpen(false);
    }
  };

  useEffect(() => {
    if (token) refreshCerts();
  }, [token]);

  return (
    <AppContext.Provider value={{ certs, refreshCerts, showBackdrop: setBackdropOpen, setAlert, logout }}>
      <Header token={token} setToken={setToken} />
      <Routes>
        <Route path="/" element={<CertListPage token={token} />} />
        <Route path="/login" element={<LoginPage token={token} setToken={setToken} />} />
        <Route path="/certs/new" element={<CertEditorPage />} />
        <Route path="/certs/:id/edit" element={<CertEditorPage />} />
        <Route element={<BatchProvider />}>
          <Route path="/batch" element={<Navigate to="/batch/upload" replace />} />
          <Route path="/batch/upload" element={<BatchUploadPage token={token} />} />
          <Route path="/batch/preview" element={<BatchPreviewPage token={token} />} />
          <Route path="/batch/draft/:index/edit" element={<BatchDraftEditorPage />} />
        </Route>
      </Routes>
      <Snackbar
        open={!!alert}
        autoHideDuration={5000}
        onClose={() => setAlert(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={alert?.type} onClose={() => setAlert(null)} sx={{ width: "100%" }}>
          {alert?.message}
        </Alert>
      </Snackbar>
      <Backdrop open={backdropOpen} sx={{ zIndex: 9999, color: "#fff" }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </AppContext.Provider>
  );
}
