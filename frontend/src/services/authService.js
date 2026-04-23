import api from "./api";

export const login = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};

export const logout = async (tenantId) => {
  const response = await api.post("/auth/logout", { tenantId });
  return response.data;
};