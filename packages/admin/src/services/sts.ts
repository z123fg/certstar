import api from "./api";

export const getUploadUrl = async (filename: string, mimeType: string): Promise<string> => {
  const res = await api.post("/sts/upload-url", { filename, mimeType });
  return res.data.url;
};

export const getProxiedImageDataUrl = async (key: string): Promise<string> => {
  const res = await api.get("/sts/proxy-image", { params: { key }, responseType: "blob" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(res.data);
  });
};
