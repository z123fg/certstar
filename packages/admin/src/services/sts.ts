import api from "./api";

export const getUploadUrl = async (filename: string, mimeType: string): Promise<string> => {
  const res = await api.post("/sts/upload-url", { filename, mimeType });
  return res.data.url;
};
