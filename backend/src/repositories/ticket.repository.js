import { readJson, updateJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getTicketsFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "tickets.json");

export const getTicketsData = async (tenantId) => {
  const filePath = getTicketsFilePath(tenantId);
  return await readJson(filePath);
};

export const getAllTickets = async (tenantId) => {
  const data = await getTicketsData(tenantId);
  return Array.isArray(data.tickets) ? data.tickets : [];
};

export const saveTicketsData = async (tenantId, ticketsData) => {
  const filePath = getTicketsFilePath(tenantId);
  return await updateJson(filePath, () => ticketsData);
};

export const getTicketById = async (tenantId, ticketId) => {
  const tickets = await getAllTickets(tenantId);
  return tickets.find((ticket) => ticket.id === ticketId) || null;
};

export const getTicketsByTrack = async (tenantId, track) => {
  const tickets = await getAllTickets(tenantId);
  return tickets.filter((ticket) => ticket.track === track);
};

export const getWaitingTicketsByTrack = async (tenantId, track) => {
  const tickets = await getTicketsByTrack(tenantId, track);

  return tickets
    .filter((ticket) => ticket.status === "waiting")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const getFirstWaitingTicketByTrack = async (tenantId, track) => {
  const waitingTickets = await getWaitingTicketsByTrack(tenantId, track);
  return waitingTickets.length > 0 ? waitingTickets[0] : null;
};