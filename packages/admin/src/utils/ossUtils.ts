import { getUploadUrl } from "../services/sts";

export class OssUploadError extends Error {
  readonly filename: string;
  readonly status?: number;
  constructor(filename: string, status?: number) {
    super(status ? `HTTP ${status} uploading ${filename}` : `Network error uploading ${filename}`);
    this.name = "OssUploadError";
    this.filename = filename;
    this.status = status;
  }
}

export const uploadObject = async (
  filename: string,
  mimeType: string,
  blob: Blob,
  signal?: AbortSignal,
) => {
  let res: Response;
  try {
    res = await fetch(await getUploadUrl(filename, mimeType), {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": mimeType },
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new OssUploadError(filename);
  }
  if (!res.ok) throw new OssUploadError(filename, res.status);
};

export const ossErrorMessage = (err: OssUploadError): string => {
  const file = err.filename.split("/").pop() ?? err.filename;
  if (!err.status) return `上传 ${file} 时网络连接失败，请检查网络后重试`;
  if (err.status === 403) return `上传 ${file} 被拒绝（权限不足），请联系管理员`;
  if (err.status >= 500) return `上传 ${file} 时服务器错误（${err.status}），请稍后重试`;
  return `上传 ${file} 失败（${err.status}），请重试`;
};

export const dbErrorMessage = (err: unknown): string => {
  const status = (err as any)?.response?.status as number | undefined;
  const serverMsg = (err as any)?.response?.data?.message as string | undefined;
  if (status === 409) return "部分证书已存在于数据库中，请检查是否重复提交";
  if (status === 400) return serverMsg ? `数据格式错误：${serverMsg}` : "数据格式错误，请检查后重试";
  if (status && status >= 500) return `服务器内部错误（${status}），请稍后重试`;
  if (!status) return "网络连接失败，请检查网络后重试";
  return `写入数据库失败（${status}），请重试`;
};
