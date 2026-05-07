import { Request, Response } from "express";
import oss from "../lib/oss";
import logger from "../logger";

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

export const proxyImage = async (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) { res.status(400).json({ message: "Missing key" }); return; }
  if (!ALLOWED_UPLOAD_PREFIXES.some((p) => key.startsWith(p))) {
    res.status(400).json({ message: "Invalid key" });
    return;
  }
  try {
    const result = await oss.get(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
    res.set("Content-Type", mime[ext] ?? "image/jpeg");
    res.send(result.content as Buffer);
  } catch (err) {
    logger.error(err, "Failed to proxy image from OSS");
    res.status(404).json({ message: "Not found" });
  }
};
