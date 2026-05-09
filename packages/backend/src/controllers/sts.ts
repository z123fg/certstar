import { Request, Response } from "express";
import oss from "../lib/oss";

const ALLOWED_UPLOAD_PREFIXES = ["cert-image/", "profile-image/"];
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

export const getUploadUrl = (req: Request, res: Response) => {
  const { filename, mimeType } = req.body;
  if (!filename || !ALLOWED_UPLOAD_PREFIXES.some((p) => filename.startsWith(p))) {
    res.status(400).json({ message: "filename must start with cert-image/ or profile-image/" });
    return;
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ message: "mimeType must be image/png or image/jpeg" });
    return;
  }
  const url = oss.signatureUrl(filename, {
    expires: 1800,
    method: "PUT",
    "Content-Type": mimeType,
  });
  res.json({ url });
};
