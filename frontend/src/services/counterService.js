import api from "./api";

export const getAllCounters = async (tenantId) => {
  const response = await api.get(`/counters?tenantId=${tenantId}`);
  return response.data;
};

export const openCounter = async (tenantId, counterId) => {
  const response = await api.post("/counters/open", { tenantId, counterId });
  return response.data;
};

export const closeCounter = async (tenantId, counterId) => {
  const response = await api.post("/counters/close", { tenantId, counterId });
  return response.data;
};