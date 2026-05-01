import { useState } from "react";
import {
  Button, Dialog, DialogActions, DialogContent,
  DialogTitle, TextField, Alert,
} from "@mui/material";
import { login } from "../../services/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export default function LoginDialog({ open, onClose, onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      const { token } = await login(username, password);
      localStorage.setItem("token", token);
      onSuccess(token);
      onClose();
    } catch {
      setError("用户名或密码错误");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>登录</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit}>登录</Button>
      </DialogActions>
    </Dialog>
  );
}
