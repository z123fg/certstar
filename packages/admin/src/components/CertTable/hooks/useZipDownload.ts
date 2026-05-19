import { useState } from "react";
import JSZip from "jszip";
import {
    renderCertToBlob,
    triggerBlobDownload,
    type CertVariant,
} from "../../../utils/canvasUtils";
import type { Cert } from "../../../types";
import intl from "../../../intl/intl";

export function useZipDownload(
    certs: Cert[],
    selected: Set<string>,
    setAlert: (alert: { type: "error"; message: string }) => void,
) {
    const [downloading, setDownloading] = useState(false);
    const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null);

    const handleDownloadZip = async (variant: CertVariant) => {
        setDownloadAnchor(null);
        setDownloading(true);
        try {
            const selectedCerts = certs.filter((c) => selected.has(c.id));
            const zip = new JSZip();
            // Render sequentially — canvas is a singleton
            for (const cert of selectedCerts) {
                const profileDataUrl = cert.profileImageUrl ?? "";
                const blob = await renderCertToBlob(cert, profileDataUrl, variant);
                zip.file(`${cert.certNum}.pdf`, blob);
            }
            const zipBlob = await zip.generateAsync({ type: "blob" });
            triggerBlobDownload(zipBlob, `certificates-${variant}.zip`);
        } catch {
            setAlert({ type: "error", message: intl.downloadError });
        } finally {
            setDownloading(false);
        }
    };

    return { downloading, downloadAnchor, setDownloadAnchor, handleDownloadZip };
}
