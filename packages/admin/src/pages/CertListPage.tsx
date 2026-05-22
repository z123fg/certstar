import { Box } from "@mui/material";
import CertTable from "../components/CertTable/CertTable";
import { useAppContext } from "../App";
import { deleteMany } from "../services/cert";
import intl from "../intl/intl";

export default function CertListPage() {
    const { certs, refreshCerts, setAlert, showBackdrop } = useAppContext();
    const handleBatchDelete = async (ids: string[]) => {
        showBackdrop(true);
        try {
            await deleteMany(ids);
            await refreshCerts();
            setAlert({
                type: "success",
                message: `已删除 ${ids.length} 条证书`,
            });
        } catch {
            setAlert({ type: "error", message: intl.deleteError });
        } finally {
            showBackdrop(false);
        }
    };

    return (
        <Box
            sx={{
                p: 3,
                height: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
            }}
        >
            <CertTable certs={certs} onBatchDelete={handleBatchDelete} />
        </Box>
    );
}
