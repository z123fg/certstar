import { useState } from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useAppContext } from "../../App";
import LoginDialog from "../LoginDialog/LoginDialog";

interface Props {
  token: string | null;
  setToken: (t: string) => void;
}

export default function Header({ token, setToken }: Props) {
  const [loginOpen, setLoginOpen] = useState(false);
  const { logout } = useAppContext();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>CertStar</Typography>
        {token ? (
          <Button color="inherit" onClick={logout}>登出</Button>
        ) : (
          <Button color="inherit" onClick={() => setLoginOpen(true)}>登录</Button>
        )}
      </Toolbar>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={setToken} />
    </AppBar>
  );
}
