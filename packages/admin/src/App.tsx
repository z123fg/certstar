import { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Alert, Backdrop, CircularProgress, Snackbar } from "@mui/material";
import Header from "./components/Header/Header";
import CertListPage from "./pages/CertListPage";
import CertEditorPage from "./pages/CertEditor/CertEditorPage";
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [certs, setCerts] = useState<Cert[]>([]);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [alert, setAlert] = useState<AlertInfo | null>(null);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setCerts([]);
  };

  const refreshCerts = async () => {
    setBackdropOpen(true);
    try {
      setCerts(await getAll());
    } catch (err: any) {
      if (err?.response?.status === 401) logout();
      else setAlert({ type: "error", message: "获取证书列表失败" });
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
        <Route path="/certs/new" element={<CertEditorPage />} />
        <Route path="/certs/:id/edit" element={<CertEditorPage />} />
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
