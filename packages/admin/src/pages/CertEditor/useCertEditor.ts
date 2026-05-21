import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseExpDate } from "@certstar/shared";
import { useAppContext } from "../../App";
import type { Cert } from "../../types";
import { createOne, deleteOne, updateOne } from "../../services/cert";
import { getSnapshotLayout, renderCertToBlob, triggerBlobDownload, type CertVariant } from "../../utils/canvasUtils";
import { uploadCertImage, uploadProfileImage } from "../../utils/certUpload";
import { normalizeCert } from "../../utils/certUtils";
import { isCertDraftValid } from "../../utils/certValidation";
import intl from "../../intl/intl";

export function useCertEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { certs, refreshCerts, setAlert, showBackdrop, complianceMode } = useAppContext();
    const isNew = !id;

    const [formData, setFormData] = useState<Partial<Cert>>(() => {
        const cert = id ? certs.find((c) => c.id === id) : undefined;
        return cert ? normalizeCert(cert) : { certType: "WTOP" };
    });
    const [profileImageDataUrl, setProfileImageDataUrl] = useState(
        () => formData.profileImageUrl ?? "",
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null);

    const isFormValid = isCertDraftValid(formData);

    // Hydrate form once certs load (handles direct URL access / page refresh)
    useEffect(() => {
        if (!id || formData.id) return;
        const cert = certs.find((c) => c.id === id);
        if (cert) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(normalizeCert(cert));
            setProfileImageDataUrl(cert.profileImageUrl ?? "");
        }
    }, [certs]);

    useEffect(() => {
        showBackdrop(true);
        return () => showBackdrop(false);
    }, []);

    // In compliance mode show PDF preview instead of canvas — dismiss backdrop once URL is available
    useEffect(() => {
        if (complianceMode && !isNew && formData.certImageUrl) {
            showBackdrop(false);
        }
    }, [complianceMode, formData.certImageUrl]);

    const handleSubmit = async () => {
        showBackdrop(true);
        try {
            const certData = { ...formData, ...getSnapshotLayout() };
            const certImageUrl = await uploadCertImage(certData, profileImageDataUrl);
            const profileImageUrl = await uploadProfileImage(certData.idNum!, profileImageDataUrl);
            const payload = {
                ...certData,
                certImageUrl,
                ...(profileImageUrl ? { profileImageUrl } : {}),
                ...(certData.expDate ? { expDate: parseExpDate(certData.expDate)! } : {}),
            } as Omit<Cert, "id" | "createdAt" | "updatedAt">;

            if (isNew) {
                await createOne(payload);
            } else {
                await updateOne(id!, payload);
            }
            await refreshCerts();
            setAlert({ type: "success", message: isNew ? intl.saveSuccess : intl.updateSuccess });
            navigate("/");
        } catch {
            setAlert({ type: "error", message: intl.saveError });
        } finally {
            showBackdrop(false);
        }
    };

    const handleDownload = async (variant: CertVariant) => {
        setDownloadAnchor(null);
        showBackdrop(true);
        try {
            const blob = await renderCertToBlob(
                { ...formData, ...getSnapshotLayout() },
                profileImageDataUrl,
                variant,
            );
            triggerBlobDownload(blob, `${formData.certNum ?? "certificate"}.pdf`);
        } catch {
            setAlert({ type: "error", message: intl.downloadError });
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
            setAlert({ type: "success", message: intl.deleteSuccess });
            navigate("/");
        } catch {
            setAlert({ type: "error", message: intl.deleteError });
        } finally {
            showBackdrop(false);
            setDeleteOpen(false);
        }
    };

    return {
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
        onCanvasReady: () => showBackdrop(false),
        onCanvasLoading: showBackdrop,
        navigate,
    };
}
