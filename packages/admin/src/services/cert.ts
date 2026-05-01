import api from "./api";
import type { Cert } from "../types";

export const getAll = async (): Promise<Cert[]> => {
  const res = await api.get("/certs");
  return res.data.result;
};

export const getOne = async (id: string): Promise<Cert> => {
  const res = await api.get(`/certs/${id}`);
  return res.data.result;
};

export const createOne = async (cert: Omit<Cert, "id" | "createdAt" | "updatedAt">): Promise<Cert> => {
  const res = await api.post("/certs", cert);
  return res.data.result;
};

export const createMany = async (certs: Omit<Cert, "id" | "createdAt" | "updatedAt">[]): Promise<Cert[]> => {
  const res = await api.post("/certs/batch", certs);
  return res.data.result;
};

export const updateOne = async (id: string, cert: Partial<Cert>): Promise<Cert> => {
  const res = await api.put(`/certs/${id}`, cert);
  return res.data.result;
};

export const deleteOne = async (id: string): Promise<void> => {
  await api.delete(`/certs/${id}`);
};
