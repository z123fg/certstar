import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>确认删除</DialogTitle>
      <DialogContent>
        <DialogContentText>删除后无法恢复，确认删除此证书吗？</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>确认删除</Button>
      </DialogActions>
    </Dialog>
  );
}
