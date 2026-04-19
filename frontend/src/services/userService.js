import api from "./api";

export const getAllUsers = async (tenantId) => {
  const response = await api.get(`/users?tenantId=${tenantId}`);
  return response.data;
};

export const createUser = async (payload) => {
  const response = await api.post("/users", payload);
  return response.data;
};

export const disableUser = async (tenantId, userId) => {
  const response = await api.post("/users/disable", { tenantId, userId });
  return response.data;
};

export const enableUser = async (tenantId, userId) => {
  const response = await api.post("/users/enable", { tenantId, userId });
  return response.data;
};

export const deleteUser = async (tenantId, userId) => {
  const response = await api.post("/users/delete", { tenantId, userId });
  return response.data;
};