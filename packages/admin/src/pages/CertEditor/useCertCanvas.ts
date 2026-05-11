import { useEffect, useRef, useState } from "react";
import type { Cert } from "../../types";
import {
    destroyCanvas,
    initCanvas,
    loadFonts,
    loadTemplate,
    PRINT_ZOOM,
    renderProfileImage,
    renderQRCode,
    renderTextFields,
} from "../../utils/canvasUtils";

export function useCertCanvas(
    cert: Partial<Cert>,
    profileImageDataUrl: string,
    onReady?: () => void,
    onLoading?: (loading: boolean) => void,
) {
    const [initialized, setInitialized] = useState(false);
    const certTypeRef = useRef<string | undefined>(undefined);
    const initProfileUrlRef = useRef<string>(profileImageDataUrl);

    // ── Init: runs once on mount ───────────────────────────────────────────────
    // Captures cert/profileImageDataUrl at mount time intentionally —
    // subsequent changes are handled by the effects below.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await loadFonts();
                if (cancelled) return;
                initCanvas("main-canvas", PRINT_ZOOM);

                if (cert.certType) {
                    certTypeRef.current = cert.certType;
                    await loadTemplate(cert.certType, "stamped");
                }
                renderTextFields(cert);
                if (profileImageDataUrl)
                    await renderProfileImage(profileImageDataUrl, cert);
                if (cert.idNum && cert.certNum)
                    await renderQRCode(cert.idNum, cert.certNum);
                if (!cancelled) {
                    setInitialized(true);
                    onReady?.();
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Canvas init failed:", err);
                    onReady?.();
                }
            }
        })();
        return () => {
            cancelled = true;
            destroyCanvas();
            setInitialized(false);
        };
    }, []);

    // ── Cert type ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initialized || !cert.certType) return;
        if (cert.certType === certTypeRef.current) return;
        certTypeRef.current = cert.certType;
        onLoading?.(true);
        loadTemplate(cert.certType, "stamped")
            .catch((err) => console.error("Failed to load template:", err))
            .finally(() => onLoading?.(false));
    }, [initialized, cert.certType]);

    // ── Text fields ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initialized) return;
        renderTextFields(cert);
    }, [
        initialized,
        cert.name,
        cert.idNum,
        cert.organization,
        cert.certNum,
        cert.expDate,
        cert.issuingAgency,
    ]);

    // ── QR code ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initialized || !cert.idNum || !cert.certNum) return;
        renderQRCode(cert.idNum, cert.certNum);
    }, [initialized, cert.idNum, cert.certNum]);

    // ── Profile image ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!initialized || !profileImageDataUrl) return;
        // Skip if this URL was already rendered during init
        if (profileImageDataUrl === initProfileUrlRef.current) {
            initProfileUrlRef.current = "";
            return;
        }
        renderProfileImage(profileImageDataUrl, cert);
    }, [initialized, profileImageDataUrl]);
}
