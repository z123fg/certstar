import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import intl from "../../intl/intl";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{intl.confirmDeleteTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText>{intl.confirmDeleteMsg}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{intl.cancel}</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>{intl.confirmDeleteBtn}</Button>
      </DialogActions>
    </Dialog>
  );
}
