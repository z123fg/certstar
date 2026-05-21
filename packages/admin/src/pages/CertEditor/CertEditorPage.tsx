import {
    Box,
    Button,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import CertForm from "./CertForm";
import CertCanvas from "./CertCanvas";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import PdfViewer from "../../components/PdfViewer";
import { useCertEditor } from "./useCertEditor";
import intl from "../../intl/intl";

export default function CertEditorPage() {
    const {
        isNew,
        isFormValid,
        complianceMode,
        formData,
        setFormData,
        profileImageDataUrl,
        setProfileImageDataUrl,
        deleteOpen,
        setDeleteOpen,
        downloadAnchor,
        setDownloadAnchor,
        handleSubmit,
        handleDownload,
        handleDelete,
        onCanvasReady,
        onCanvasLoading,
        navigate,
    } = useCertEditor();

    return (
        <Box sx={{ p: 3 }}>
            {/* Hidden canvas used by renderCertToBlob for download */}
            <div
                aria-hidden="true"
                style={{ position: "fixed", left: "-99999px", top: "-99999px", overflow: "hidden" }}
            >
                <canvas id="download-canvas" />
            </div>

            <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                {/* Form panel */}
                <Box sx={{ width: 320, flexShrink: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
                            {intl.back}
                        </Button>
                        <Typography variant="h6">
                            {isNew ? intl.addOne : intl.editCert}
                        </Typography>
                    </Stack>

                    <CertForm
                        data={formData}
                        profileImageDataUrl={profileImageDataUrl}
                        onChange={setFormData}
                        onProfileImageChange={setProfileImageDataUrl}
                    />

                    <Divider sx={{ my: 2 }} />

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        <Tooltip title={complianceMode ? intl.complianceNoStampedSubmit : ""}>
                            <span>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={!isFormValid || complianceMode}
                                >
                                    {intl.submit}
                                </Button>
                            </span>
                        </Tooltip>

                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            disabled={!isFormValid}
                            onClick={(e) => setDownloadAnchor(e.currentTarget)}
                        >
                            {intl.download}
                        </Button>
                        <Menu
                            anchorEl={downloadAnchor}
                            open={Boolean(downloadAnchor)}
                            onClose={() => setDownloadAnchor(null)}
                        >
                            <Tooltip title={complianceMode ? intl.complianceNoStampedDownload : ""} placement="left">
                                <span>
                                    <MenuItem disabled={complianceMode} onClick={() => handleDownload("stamped")}>
                                        {intl.stamped}
                                    </MenuItem>
                                </span>
                            </Tooltip>
                            <MenuItem onClick={() => handleDownload("stampless")}>
                                {intl.stampless}
                            </MenuItem>
                        </Menu>

                        {!isNew && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => setDeleteOpen(true)}
                            >
                                {intl.delete}
                            </Button>
                        )}
                    </Stack>
                </Box>

                {/* Right panel: PDF/image preview in compliance mode, canvas otherwise */}
                {complianceMode && !isNew ? (
                    formData.certImageUrl ? (
                        /\.(png|jpe?g)$/i.test(formData.certImageUrl) ? (
                            <Box
                                component="img"
                                src={formData.certImageUrl}
                                alt="证书"
                                sx={{
                                    flex: 1,
                                    height: "calc(100vh - 80px)",
                                    objectFit: "contain",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    display: "block",
                                }}
                            />
                        ) : (
                            <Box sx={{ flex: 1, height: "calc(100vh - 80px)", overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                                <PdfViewer url={formData.certImageUrl!} />
                            </Box>
                        )
                    ) : null /* backdrop stays open while certImageUrl loads */
                ) : (
                    <Box sx={{ overflow: "hidden" }}>
                        <Box sx={{ mt: "-100px" }}>
                            <CertCanvas
                                cert={formData}
                                profileImageDataUrl={profileImageDataUrl}
                                onReady={onCanvasReady}
                                onLoading={onCanvasLoading}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <DeleteConfirmDialog
                open={deleteOpen}
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />
        </Box>
    );
}
