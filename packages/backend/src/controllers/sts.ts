import { Request, Response } from "express";
import OSS from "ali-oss";

const getClient = () =>
  new OSS({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
  });

export const getUploadUrl = (req: Request, res: Response) => {
  const { filename, mimeType } = req.body;
  const url = getClient().signatureUrl(filename, {
    expires: 1800,
    method: "PUT",
    "Content-Type": mimeType,
  });
  res.json({ url });
};

export const getDownloadUrl = (req: Request, res: Response) => {
  const { filename } = req.body;
  const url = getClient().signatureUrl(`${filename}`, { expires: 180 });
  res.json({ url });
};

export const proxyImage = async (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) { res.status(400).json({ message: "Missing key" }); return; }
  try {
    const result = await getClient().get(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
    res.set("Content-Type", mime[ext] ?? "image/jpeg");
    res.send(result.content as Buffer);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
};
