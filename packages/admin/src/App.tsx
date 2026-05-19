import { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { Alert, Backdrop, CircularProgress, Snackbar } from "@mui/material";
import Header from "./components/Header/Header";
import CertListPage from "./pages/CertListPage";
import CertEditorPage from "./pages/CertEditor/CertEditorPage";
import { BatchProvider } from "./pages/Batch/BatchContext";
import BatchUploadPage from "./pages/Batch/BatchUploadPage";
import BatchPreviewPage from "./pages/Batch/BatchPreviewPage";
import BatchDraftEditorPage from "./pages/Batch/BatchDraftEditorPage";
import { PdfBatchProvider } from "./pages/PdfBatch/PdfBatchContext";
import PdfBatchUploadPage from "./pages/PdfBatch/PdfBatchUploadPage";
import PdfBatchPreviewPage from "./pages/PdfBatch/PdfBatchPreviewPage";
import PdfBatchDraftEditorPage from "./pages/PdfBatch/PdfBatchDraftEditorPage";
import LoginPage from "./pages/LoginPage";
import { getAll } from "./services/cert";
import { loadFonts } from "./utils/canvasUtils";
import type { Cert } from "./types";
import intl from "./intl/intl";

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
    complianceMode: boolean;
    setComplianceMode: (v: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue>({} as AppContextValue);
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext);

/** Redirects unauthenticated users to /login and shows an alert. */
function ProtectedRoute({ token }: { token: string | null }) {
    const location = useLocation();
    const { setAlert } = useAppContext();
    useEffect(() => {
        if (!token) setAlert({ type: "error", message: intl.notLoggedIn });
    }, []);
    if (!token) {
        return <Navigate to="/login" state={{ next: location.pathname }} replace />;
    }
    return <Outlet />;
}

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
    const [complianceMode, setComplianceMode] = useState(true);

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
            setAlert({ type: "error", message: intl.fetchError });
        } finally {
            setBackdropOpen(false);
        }
    };

    useEffect(() => {
        if (!token) {
            loadFonts().catch(() => {});
            return;
        }
        // On login: keep backdrop open until both certs and font are ready
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBackdropOpen(true);
        Promise.all([
            getAll()
                .then(setCerts)
                .catch(() =>
                    setAlert({ type: "error", message: intl.fetchError }),
                ),
            loadFonts().catch(() => {}),
        ]).finally(() => setBackdropOpen(false));
    }, [token]);

    return (
        <AppContext.Provider
            value={{
                certs,
                refreshCerts,
                showBackdrop: setBackdropOpen,
                setAlert,
                logout,
                complianceMode,
                setComplianceMode,
            }}
        >
            <Header token={token} setToken={setToken} />
            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage token={token} setToken={setToken} />}
                />
                {/* All routes below require authentication */}
                <Route element={<ProtectedRoute token={token} />}>
                    <Route path="/" element={<CertListPage />} />
                    <Route path="/certs/new" element={<CertEditorPage />} />
                    <Route path="/certs/:id/edit" element={<CertEditorPage />} />
                    <Route element={<BatchProvider />}>
                        <Route
                            path="/batch"
                            element={<Navigate to="/batch/upload" replace />}
                        />
                        <Route path="/batch/upload" element={<BatchUploadPage />} />
                        <Route path="/batch/preview" element={<BatchPreviewPage />} />
                        <Route
                            path="/batch/draft/:localId/edit"
                            element={<BatchDraftEditorPage />}
                        />
                    </Route>
                    <Route element={<PdfBatchProvider />}>
                        <Route
                            path="/pdf-batch"
                            element={<Navigate to="/pdf-batch/upload" replace />}
                        />
                        <Route path="/pdf-batch/upload" element={<PdfBatchUploadPage />} />
                        <Route path="/pdf-batch/preview" element={<PdfBatchPreviewPage />} />
                        <Route
                            path="/pdf-batch/draft/:localId/edit"
                            element={<PdfBatchDraftEditorPage />}
                        />
                    </Route>
                </Route>
            </Routes>
            <Snackbar
                open={!!alert}
                autoHideDuration={5000}
                onClose={() => setAlert(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={alert?.type}
                    onClose={() => setAlert(null)}
                    sx={{ width: "100%" }}
                >
                    {alert?.message}
                </Alert>
            </Snackbar>
            <Backdrop open={backdropOpen} sx={{ zIndex: 9999, color: "#fff" }}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </AppContext.Provider>
    );
}
