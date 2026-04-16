import api from "./api";

export const getPublicTrackingTicket = async (tenantId, ticketId) => {
  const response = await api.get(`/tickets/track/${ticketId}?tenantId=${tenantId}`);
  return response.data;
};

export const getQueueStatusByTrack = async (tenantId, track) => {
  const response = await api.get(`/tickets/queue-status?tenantId=${tenantId}&track=${track}`);
  return response.data;
};