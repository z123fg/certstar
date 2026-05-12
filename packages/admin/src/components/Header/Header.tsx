import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useAppContext } from "../../App";
import intl from "../../intl/intl";

interface Props {
  token: string | null;
  setToken: (t: string) => void;
}

export default function Header({ token }: Props) {
  const { logout } = useAppContext();
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, cursor: "pointer", userSelect: "none" }}
          onClick={() => navigate("/")}
        >
          CertStar
        </Typography>
        {token ? (
          <Button color="inherit" onClick={logout}>{intl.logout}</Button>
        ) : (
          <Button color="inherit" onClick={() => navigate("/login")}>{intl.login}</Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
