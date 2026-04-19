import api from "./api";

export const createTicket = async (payload) => {
  const response = await api.post("/tickets", payload);
  return response.data;
};

export const getAllTickets = async (tenantId) => {
  const response = await api.get(`/tickets?tenantId=${tenantId}`);
  return response.data;
};

export const callNextTicket = async (tenantId) => {
  const response = await api.post("/tickets/call-next", { tenantId });
  return response.data;
};

export const completeCurrentTicket = async (tenantId) => {
  const response = await api.post("/tickets/complete", { tenantId });
  return response.data;
};

export const markCurrentTicketAbsent = async (tenantId) => {
  const response = await api.post("/tickets/absent", { tenantId });
  return response.data;
};