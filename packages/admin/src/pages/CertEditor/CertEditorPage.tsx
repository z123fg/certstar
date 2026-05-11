import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { parseExpDate } from "@certstar/shared";
import type { CertVariant } from "../../utils/canvasUtils";
import { useAppContext } from "../../App";
import CertForm from "./CertForm";
import CertCanvas from "./CertCanvas";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import type { Cert } from "../../types";
import { createOne, deleteOne, updateOne } from "../../services/cert";
import { getUploadUrl } from "../../services/sts";
import {
    exportCanvasAsDataUrl,
    getCanvas,
    getSnapshotLayout,
    renderCertToBlob,
    triggerBlobDownload,
} from "../../utils/canvasUtils";
import { isCertDraftValid } from "../../utils/certValidation";

export default function CertEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { certs, refreshCerts, setAlert, showBackdrop, complianceMode } = useAppContext();
    const isNew = !id;
    const [formData, setFormData] = useState<Partial<Cert>>(() =>
        (id ? certs.find((c) => c.id === id) : undefined) ?? { certType: "WTOP" }
    );

    const isFormValid = isCertDraftValid(formData);
    const [profileImageDataUrl, setProfileImageDataUrl] = useState(() => formData.profileImageUrl ?? "");
    const [deleteOpen, setDeleteOpen] = useState(false);

    // Hydrate form once certs load (handles direct URL access / page refresh)
    useEffect(() => {
        if (!id || formData.id) return;
        const cert = certs.find((c) => c.id === id);
        if (cert) {
            setFormData(cert);
            setProfileImageDataUrl(cert.profileImageUrl ?? "");
        }
    }, [certs]);

    useEffect(() => {
        showBackdrop(true);
        return () => showBackdrop(false);
    }, []);

    // In compliance mode we show a PDF preview instead of canvas — dismiss backdrop once URL is available
    useEffect(() => {
        if (complianceMode && !isNew && formData.certImageUrl) {
            showBackdrop(false);
        }
    }, [complianceMode, formData.certImageUrl]);
    const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(
        null,
    );

    const uploadCertImage = async (): Promise<string> => {
        if (!getCanvas()) throw new Error("Canvas is not ready");
        const blob = await renderCertToBlob(formData, profileImageDataUrl, "stamped");
        const filename = `cert-image/${formData.certNum}.pdf`;
        const uploadUrl = await getUploadUrl(filename, "application/pdf");
        await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": "application/pdf" },
        });
        return `${import.meta.env.VITE_OSS_BASE_URL}/${filename}`;
    };

    const uploadProfileImage = async (
        idNum: string,
    ): Promise<string | undefined> => {
        if (!profileImageDataUrl) return undefined;
        const blob = await fetch(profileImageDataUrl).then((r) => r.blob());
        const filename = `profile-image/${idNum}.jpg`;
        const uploadUrl = await getUploadUrl(filename, "image/jpeg");
        await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": "image/jpeg" },
        });
        return `${import.meta.env.VITE_OSS_BASE_URL}/${filename}`;
    };

    const handleSubmit = async () => {
        showBackdrop(true);
        try {
            const certImageUrl = await uploadCertImage();
            const profileImageUrl = await uploadProfileImage(formData.idNum!);
            const payload = {
                ...formData,
                ...getSnapshotLayout(),
                certImageUrl,
                ...(profileImageUrl ? { profileImageUrl } : {}),
                ...(formData.expDate
                    ? { expDate: parseExpDate(formData.expDate)! }
                    : {}),
            } as Omit<Cert, "id" | "createdAt" | "updatedAt">;

            if (isNew) {
                await createOne(payload);
            } else {
                await updateOne(id!, payload);
            }
            await refreshCerts();
            setAlert({
                type: "success",
                message: isNew ? "证书创建成功！" : "证书更新成功！",
            });
            navigate("/");
        } catch {
            setAlert({ type: "error", message: "保存失败，请重试" });
        } finally {
            showBackdrop(false);
        }
    };

    const handleDownload = async (variant: CertVariant) => {
        setDownloadAnchor(null);
        showBackdrop(true);
        try {
            const blob = await renderCertToBlob(
                formData,
                profileImageDataUrl,
                variant,
            );
            triggerBlobDownload(
                blob,
                `${formData.certNum ?? "certificate"}.pdf`,
            );
        } catch {
            setAlert({ type: "error", message: "下载失败，请重试" });
        } finally {
            showBackdrop(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        showBackdrop(true);
        try {
            await deleteOne(id);
            await refreshCerts();
            setAlert({ type: "success", message: "证书已删除" });
            navigate("/");
        } catch {
            setAlert({ type: "error", message: "删除失败，请重试" });
        } finally {
            showBackdrop(false);
            setDeleteOpen(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Hidden canvas used by renderCertToBlob for download */}
            <div
                aria-hidden="true"
                style={{
                    position: "fixed",
                    left: "-99999px",
                    top: "-99999px",
                    overflow: "hidden",
                }}
            >
                <canvas id="download-canvas" />
            </div>

            <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                {/* Form panel */}
                <Box sx={{ width: 320, flexShrink: 0 }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mb: 3, alignItems: "center" }}
                    >
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(-1)}
                            size="small"
                        >
                            返回
                        </Button>
                        <Typography variant="h6">
                            {isNew ? "添加证书" : "编辑证书"}
                        </Typography>
                    </Stack>
                    <CertForm
                        data={formData}
                        profileImageDataUrl={profileImageDataUrl}
                        onChange={setFormData}
                        onProfileImageChange={setProfileImageDataUrl}
                    />
                    <Divider sx={{ my: 2 }} />
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap" }}
                    >
                        <Tooltip title={complianceMode ? "当前模式不允许上传有章证书" : ""}>
                            <span>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={!isFormValid || complianceMode}
                                >
                                    提交
                                </Button>
                            </span>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            disabled={!isFormValid}
                            onClick={(e) => setDownloadAnchor(e.currentTarget)}
                        >
                            下载
                        </Button>
                        <Menu
                            anchorEl={downloadAnchor}
                            open={Boolean(downloadAnchor)}
                            onClose={() => setDownloadAnchor(null)}
                        >
                            <Tooltip title={complianceMode ? "当前模式不允许下载有章证书" : ""} placement="left">
                                <span>
                                    <MenuItem
                                        disabled={complianceMode}
                                        onClick={() => handleDownload("stamped")}
                                    >
                                        带章版
                                    </MenuItem>
                                </span>
                            </Tooltip>
                            <MenuItem
                                onClick={() => handleDownload("stampless")}
                            >
                                无章版
                            </MenuItem>
                        </Menu>
                        {!isNew && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => setDeleteOpen(true)}
                            >
                                删除
                            </Button>
                        )}
                    </Stack>
                </Box>

                {/* Right panel: PDF preview in compliance mode, canvas otherwise */}
                {complianceMode && !isNew ? (
                    formData.certImageUrl ? (
                        <Box
                            component="iframe"
                            src={formData.certImageUrl}
                            sx={{
                                flex: 1,
                                height: "calc(100vh - 80px)",
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1,
                                display: "block",
                            }}
                        />
                    ) : null /* backdrop stays open while certImageUrl loads */
                ) : (
                    <Box sx={{ overflow: "hidden" }}>
                        <Box sx={{ mt: "-100px" }}>
                            <CertCanvas
                                cert={formData}
                                profileImageDataUrl={profileImageDataUrl}
                                onReady={() => showBackdrop(false)}
                                onLoading={showBackdrop}
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
