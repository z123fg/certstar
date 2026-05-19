import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import intl from "../../../intl/intl";

interface ComplianceDialogProps {
    open: boolean;
    onClose: () => void;
    complianceMode: boolean;
    onConfirm: () => void;
}

function ComplianceDialog({
    open,
    onClose,
    complianceMode,
    onConfirm,
}: ComplianceDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                {complianceMode ? "关闭完全合规模式" : "开启完全合规模式"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>{intl.complianceModeDesc}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{intl.cancel}</Button>
                <Button color="warning" onClick={onConfirm}>
                    {complianceMode ? "关闭" : "开启"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface DeleteDialogProps {
    open: boolean;
    onClose: () => void;
    selectedCount: number;
    onConfirm: () => void;
}

function DeleteDialog({ open, onClose, selectedCount, onConfirm }: DeleteDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{intl.confirmDeleteTitle}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    确定要删除选中的 {selectedCount} 条证书吗？此操作不可撤销。
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{intl.cancel}</Button>
                <Button color="error" onClick={onConfirm}>
                    {intl.delete}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface CertDialogsProps {
    complianceConfirmOpen: boolean;
    onComplianceConfirmClose: () => void;
    complianceMode: boolean;
    onComplianceModeToggle: () => void;
    deleteOpen: boolean;
    onDeleteClose: () => void;
    selectedCount: number;
    onDeleteConfirm: () => void;
}

export default function CertDialogs({
    complianceConfirmOpen,
    onComplianceConfirmClose,
    complianceMode,
    onComplianceModeToggle,
    deleteOpen,
    onDeleteClose,
    selectedCount,
    onDeleteConfirm,
}: CertDialogsProps) {
    return (
        <>
            <ComplianceDialog
                open={complianceConfirmOpen}
                onClose={onComplianceConfirmClose}
                complianceMode={complianceMode}
                onConfirm={() => {
                    onComplianceModeToggle();
                    onComplianceConfirmClose();
                }}
            />
            <DeleteDialog
                open={deleteOpen}
                onClose={onDeleteClose}
                selectedCount={selectedCount}
                onConfirm={onDeleteConfirm}
            />
        </>
    );
}
