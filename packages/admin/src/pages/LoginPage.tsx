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
            setError("用户名或密码错误");
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
                    登录
                </Typography>
                {sessionExpired && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        登录已过期，请重新登录
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="密码"
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
                        登录
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
