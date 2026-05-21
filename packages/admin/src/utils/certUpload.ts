import type { Cert } from "../types";
import { getUploadUrl } from "../services/sts";
import { getCanvas, renderCertToBlob } from "./canvasUtils";

export const uploadCertImage = async (
    cert: Partial<Cert>,
    profileImageDataUrl: string,
): Promise<string> => {
    if (!getCanvas()) throw new Error("Canvas is not ready");
    const blob = await renderCertToBlob(cert, profileImageDataUrl, "stamped");
    const filename = `cert-image/${cert.certNum}.pdf`;
    const uploadUrl = await getUploadUrl(filename, "application/pdf");
    await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "application/pdf" } });
    return `${import.meta.env.VITE_OSS_BASE_URL}/${filename}`;
};

export const uploadProfileImage = async (
    idNum: string,
    profileImageDataUrl: string,
): Promise<string | undefined> => {
    if (!profileImageDataUrl) return undefined;
    const blob = await fetch(profileImageDataUrl).then((r) => r.blob());
    const filename = `profile-image/${idNum}.jpg`;
    const uploadUrl = await getUploadUrl(filename, "image/jpeg");
    await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
    return `${import.meta.env.VITE_OSS_BASE_URL}/${filename}`;
};
