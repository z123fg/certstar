import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    Button,
    Alert,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { login } from "../services/auth";
import intl from "../intl/intl";

interface Props {
    token: string | null;
    setToken: (t: string) => void;
}

export default function LoginPage({ token, setToken }: Props) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionExpired = searchParams.get("reason") === "session_expired";
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (token) return <Navigate to="/" replace />;

    const handleSubmit = async () => {
        setError("");
        try {
            const { token: t, expiresIn } = await login(username, password);
            localStorage.setItem("token", t);
            localStorage.setItem(
                "tokenExp",
                String(Date.now() + expiresIn * 1000),
            );
            setToken(t);
            navigate("/", { replace: true });
        } catch {
            setError(intl.loginError);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                minHeight: "calc(100vh - 64px)",
                p: 2,
            }}
        >
            <Paper
                elevation={3}
                sx={{ p: 4, width: "100%", maxWidth: 360, marginTop: "50px" }}
            >
                <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
                    {intl.login}
                </Typography>
                {sessionExpired && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {intl.sessionExpired}
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label={intl.username}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label={intl.password}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        fullWidth
                        size="small"
                    />
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit}
                        sx={{ mt: 1 }}
                    >
                        {intl.login}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
