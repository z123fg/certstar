import api from "./api";

export const login = async (username: string, password: string) => {
  const res = await api.post("/auth/login", { username, password });
  return res.data as { token: string; expiresIn: number };
};
