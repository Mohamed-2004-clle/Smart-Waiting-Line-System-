import api from "./api";

export const getDashboardAnalytics = async (tenantId) => {
  const response = await api.get(`/analytics/dashboard?tenantId=${tenantId}`);
  return response.data;
};