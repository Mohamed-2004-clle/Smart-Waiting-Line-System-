import {
  getTicketsData,
  saveTicketsData,
  getAllTickets,
  getTicketById,
  getFirstWaitingTicketByTrack
} from "../repositories/ticket.repository.js";
import {
  getCountersData,
  getOpenCounterByStaffId,
  saveCountersData
} from "../repositories/counter.repository.js";
import {
  getServiceByTrackAndCustomerType,
  getServiceByTrack
} from "../repositories/service.repository.js";
import { getQueueByTrack } from "../repositories/queue.repository.js";
import { AppError } from "../errors/AppError.js";
import { emitToTenant } from "../sockets/index.js";
import { logAuditEvent } from "./audit.service.js";
import { sendNotificationToTicketService } from "./notification.service.js";
import {
  generateTicketVerificationHash,
  generateTicketQrCodeDataUrl,
  buildTrackingUrl
} from "./qrcode.service.js";

const TRACK_PRIORITY = {
  A: 2,
  B: 3,
  C: 1
};

const TRACK_ROLE = {
  A: "admin",
  B: "agent",
  C: "agent"
};

const recalculateTrackQueueData = async (tenantId, tickets) => {
  const updatedTickets = [...tickets];
  const tracks = ["A", "B", "C"];

  for (const track of tracks) {
    const waitingTickets = updatedTickets
      .filter((ticket) => ticket.track === track && ticket.status === "waiting")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const service = await getServiceByTrack(tenantId, track);
    const averageServiceMinutes = service?.averageServiceMinutes || 10;

    waitingTickets.forEach((ticket, index) => {
      ticket.position = index + 1;
      ticket.estimatedWaitMinutes = (index + 1) * averageServiceMinutes;
    });
  }

  updatedTickets.forEach((ticket) => {
    if (ticket.status !== "waiting") {
      ticket.position = null;
      ticket.estimatedWaitMinutes = 0;
    }
  });

  return updatedTickets;
};
const notifyApproachingTickets = async (tenantId, tickets) => {
  for (const ticket of tickets) {
    if (
      ticket.status === "waiting" &&
      ticket.position !== null &&
      ticket.position <= 2 &&
      !ticket.approachNotificationSentAt
    ) {
      try {
        const result = await sendNotificationToTicketService({
          tenantId,
          ticketId: ticket.id,
          title: "Votre tour approche",
          body: `Votre ticket ${ticket.number} est proche. Position: ${ticket.position}.`,
          url: `/track/${ticket.id}?tenantId=${tenantId}`
        });

        if (result?.sent) {
          ticket.approachNotificationSentAt = new Date().toISOString();
        }
      } catch (error) {
        console.error(
          `Failed to send approaching notification for ticket ${ticket.id}:`,
          error.message
        );
      }
    }
  }

  return tickets;
};

const notifyCalledTicket = async (tenantId, ticket) => {
  if (!ticket || ticket.calledNotificationSentAt) {
    return ticket;
  }

  try {
    const result = await sendNotificationToTicketService({
      tenantId,
      ticketId: ticket.id,
      title: "C'est votre tour",
      body: `Votre ticket ${ticket.number} est appelé. Veuillez vous présenter au guichet ${ticket.counterId || "-"}.`,
      url: `/track/${ticket.id}?tenantId=${tenantId}`
    });

    if (result?.sent) {
      ticket.calledNotificationSentAt = new Date().toISOString();
    }
  } catch (error) {
    console.error(
      `Failed to send called notification for ticket ${ticket.id}:`,
      error.message
    );
  }

  return ticket;
};

const getNextTrackForRole = async (tenantId, role) => {
  if (role === "admin") {
    return "A";
  }

  if (role === "agent") {
    const nextB = await getFirstWaitingTicketByTrack(tenantId, "B");
    if (nextB) return "B";

    const nextC = await getFirstWaitingTicketByTrack(tenantId, "C");
    if (nextC) return "C";
  }

  return null;
};

export const createTicketService = async (
  tenantId,
  { track, customerType, companyName = null }
) => {
  if (!["A", "B", "C"].includes(track)) {
    throw new AppError("Invalid track", 400);
  }

  const service =
    (await getServiceByTrackAndCustomerType(tenantId, track, customerType)) ||
    (await getServiceByTrack(tenantId, track));

  if (!service) {
    throw new AppError("Service not found for this track/customer type", 404);
  }

  const queue = await getQueueByTrack(tenantId, track);
  if (!queue) {
    throw new AppError("Queue not found for this track", 404);
  }

  const ticketsData = await getTicketsData(tenantId);

  if (!ticketsData.lastSequenceByTrack) {
    ticketsData.lastSequenceByTrack = { A: 0, B: 0, C: 0 };
  }

  const nextSequence = (ticketsData.lastSequenceByTrack[track] || 0) + 1;
  ticketsData.lastSequenceByTrack[track] = nextSequence;

  const number = `${track}-${String(nextSequence).padStart(3, "0")}`;
  const ticketId = `ticket-${Date.now()}`;
  const qrCodeHash = generateTicketVerificationHash(ticketId);

  const ticket = {
    id: ticketId,
    number,
    track,
    customerType,
    companyName: track === "A" ? companyName : null,
    priority: TRACK_PRIORITY[track],
    assignedRole: TRACK_ROLE[track],
    qrCodeHash,
    status: "waiting",
    position: null,
    estimatedWaitMinutes: 0,
    counterId: null,
    createdAt: new Date().toISOString(),
    calledAt: null,
    completedAt: null,
    absentAt: null,
    approachNotificationSentAt: null,
    calledNotificationSentAt: null
  };

  ticketsData.tickets.push(ticket);
  ticketsData.tickets = await recalculateTrackQueueData(tenantId, ticketsData.tickets);

  await saveTicketsData(tenantId, ticketsData);

  const allTickets = await getAllTickets(tenantId);
  const createdTicket = allTickets.find((t) => t.id === ticket.id);

  await logAuditEvent({
    tenantId,
    userId: null,
    action: "CREATE_TICKET",
    entityType: "ticket",
    entityId: createdTicket.id,
    details: {
      number: createdTicket.number,
      track: createdTicket.track,
      customerType: createdTicket.customerType
    }
  });

  emitToTenant(tenantId, "queue_updated", allTickets);
  emitToTenant(tenantId, "new_ticket", createdTicket);

  const qrCode = await generateTicketQrCodeDataUrl(
    createdTicket.id,
    tenantId,
    createdTicket.qrCodeHash
  );

  return {
    ...createdTicket,
    qrCode,
    trackingUrl: buildTrackingUrl(createdTicket.id, tenantId)
  };
};

export const getAllTicketsService = async (tenantId) => {
  return await getAllTickets(tenantId);
};

export const getTicketByIdService = async (tenantId, ticketId) => {
  const ticket = await getTicketById(tenantId, ticketId);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return ticket;
};

export const getPublicTrackingTicketService = async (tenantId, ticketId) => {
  const ticket = await getTicketById(tenantId, ticketId);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return {
    id: ticket.id,
    number: ticket.number,
    track: ticket.track,
    status: ticket.status,
    position: ticket.position,
    estimatedWaitMinutes: ticket.estimatedWaitMinutes,
    counterId: ticket.counterId,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
    absentAt: ticket.absentAt || null
  };
};

export const getQueueStatusByTrackService = async (tenantId, track) => {
  const tickets = await getAllTickets(tenantId);

  const trackTickets = tickets.filter((ticket) => ticket.track === track);
  const waitingTickets = trackTickets.filter((ticket) => ticket.status === "waiting");
  const calledTickets = trackTickets.filter((ticket) => ticket.status === "called");
  const completedTickets = trackTickets.filter((ticket) => ticket.status === "completed");
  const absentTickets = trackTickets.filter((ticket) => ticket.status === "absent");

  return {
    track,
    totalTickets: trackTickets.length,
    waitingTickets: waitingTickets.length,
    calledTickets: calledTickets.length,
    completedTickets: completedTickets.length,
    absentTickets: absentTickets.length,
    queue: waitingTickets.sort((a, b) => (a.position || 0) - (b.position || 0))
  };
};

export const callNextTicketService = async (tenantId, userId = null, role = null) => {
  if (!userId) {
    throw new AppError("User is required", 401);
  }

  if (!role) {
    throw new AppError("Role is required", 401);
  }

  const nextTrack = await getNextTrackForRole(tenantId, role);

  if (!nextTrack) {
    throw new AppError("No waiting tickets available for your role", 404);
  }

  const openCounter = await getOpenCounterByStaffId(tenantId, userId);

  if (!openCounter) {
    throw new AppError("You must open a counter first", 400);
  }

  if (!Array.isArray(openCounter.allowedTracks) || !openCounter.allowedTracks.includes(nextTrack)) {
    throw new AppError("Your open counter does not support this track", 403);
  }

  if (openCounter.currentTicketId) {
    throw new AppError("This counter already has a current ticket", 400);
  }

  const nextTicket = await getFirstWaitingTicketByTrack(tenantId, nextTrack);

  if (!nextTicket) {
    throw new AppError("No waiting tickets found", 404);
  }

  const ticketsData = await getTicketsData(tenantId);
  const countersData = await getCountersData(tenantId);

  const ticketIndex = ticketsData.tickets.findIndex((ticket) => ticket.id === nextTicket.id);
  const counterIndex = countersData.counters.findIndex((counter) => counter.id === openCounter.id);

  if (ticketIndex === -1) {
    throw new AppError("Ticket not found", 404);
  }

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  ticketsData.tickets[ticketIndex].status = "called";
  ticketsData.tickets[ticketIndex].calledAt = new Date().toISOString();
  ticketsData.tickets[ticketIndex].counterId = openCounter.id;

  countersData.counters[counterIndex].currentTicketId = nextTicket.id;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  ticketsData.tickets = await recalculateTrackQueueData(tenantId, ticketsData.tickets);

const updatedTicket = ticketsData.tickets[ticketIndex];

await notifyCalledTicket(tenantId, updatedTicket);
ticketsData.tickets = await notifyApproachingTickets(tenantId, ticketsData.tickets);

await saveTicketsData(tenantId, ticketsData);
await saveCountersData(tenantId, countersData);
  const allTickets = await getAllTickets(tenantId);

  await logAuditEvent({
    tenantId,
    userId,
    action: "CALL_NEXT_TICKET",
    entityType: "ticket",
    entityId: updatedTicket.id,
    details: {
      number: updatedTicket.number,
      track: updatedTicket.track,
      counterId: openCounter.id
    }
  });

  emitToTenant(tenantId, "ticket_called", updatedTicket);
  emitToTenant(tenantId, "queue_updated", allTickets);
  emitToTenant(tenantId, "counter_updated", countersData.counters[counterIndex]);
  emitToTenant(tenantId, `ticket_updated:${updatedTicket.id}`, updatedTicket);

  return updatedTicket;
};

export const completeCurrentTicketService = async (tenantId, userId = null) => {
  if (!userId) {
    throw new AppError("User is required", 401);
  }

  const openCounter = await getOpenCounterByStaffId(tenantId, userId);

  if (!openCounter) {
    throw new AppError("You must open a counter first", 400);
  }

  if (!openCounter.currentTicketId) {
    throw new AppError("No current ticket on this counter", 404);
  }

  const ticketsData = await getTicketsData(tenantId);
  const countersData = await getCountersData(tenantId);

  const ticketIndex = ticketsData.tickets.findIndex(
    (ticket) => ticket.id === openCounter.currentTicketId
  );
  const counterIndex = countersData.counters.findIndex(
    (counter) => counter.id === openCounter.id
  );

  if (ticketIndex === -1) {
    throw new AppError("Ticket not found", 404);
  }

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  ticketsData.tickets[ticketIndex].status = "completed";
  ticketsData.tickets[ticketIndex].completedAt = new Date().toISOString();

  countersData.counters[counterIndex].currentTicketId = null;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  ticketsData.tickets = await recalculateTrackQueueData(tenantId, ticketsData.tickets);
ticketsData.tickets = await notifyApproachingTickets(tenantId, ticketsData.tickets);

await saveTicketsData(tenantId, ticketsData);
await saveCountersData(tenantId, countersData);

  const completedTicket = ticketsData.tickets[ticketIndex];
  const allTickets = await getAllTickets(tenantId);

  await logAuditEvent({
    tenantId,
    userId,
    action: "COMPLETE_TICKET",
    entityType: "ticket",
    entityId: completedTicket.id,
    details: {
      number: completedTicket.number,
      track: completedTicket.track,
      counterId: openCounter.id
    }
  });

  emitToTenant(tenantId, "ticket_completed", completedTicket);
  emitToTenant(tenantId, "queue_updated", allTickets);
  emitToTenant(tenantId, "counter_updated", countersData.counters[counterIndex]);
  emitToTenant(tenantId, `ticket_updated:${completedTicket.id}`, completedTicket);

  return completedTicket;
};

export const markCurrentTicketAbsentService = async (tenantId, userId = null) => {
  if (!userId) {
    throw new AppError("User is required", 401);
  }

  const openCounter = await getOpenCounterByStaffId(tenantId, userId);

  if (!openCounter) {
    throw new AppError("You must open a counter first", 400);
  }

  if (!openCounter.currentTicketId) {
    throw new AppError("No current ticket on this counter", 404);
  }

  const ticketsData = await getTicketsData(tenantId);
  const countersData = await getCountersData(tenantId);

  const ticketIndex = ticketsData.tickets.findIndex(
    (ticket) => ticket.id === openCounter.currentTicketId
  );
  const counterIndex = countersData.counters.findIndex(
    (counter) => counter.id === openCounter.id
  );

  if (ticketIndex === -1) {
    throw new AppError("Ticket not found", 404);
  }

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  ticketsData.tickets[ticketIndex].status = "absent";
  ticketsData.tickets[ticketIndex].absentAt = new Date().toISOString();

  countersData.counters[counterIndex].currentTicketId = null;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  ticketsData.tickets = await recalculateTrackQueueData(tenantId, ticketsData.tickets);
ticketsData.tickets = await notifyApproachingTickets(tenantId, ticketsData.tickets);

await saveTicketsData(tenantId, ticketsData);
await saveCountersData(tenantId, countersData);

  const absentTicket = ticketsData.tickets[ticketIndex];
  const allTickets = await getAllTickets(tenantId);

  await logAuditEvent({
    tenantId,
    userId,
    action: "MARK_TICKET_ABSENT",
    entityType: "ticket",
    entityId: absentTicket.id,
    details: {
      number: absentTicket.number,
      track: absentTicket.track,
      counterId: openCounter.id
    }
  });

  emitToTenant(tenantId, "ticket_absent", absentTicket);
  emitToTenant(tenantId, "queue_updated", allTickets);
  emitToTenant(tenantId, "counter_updated", countersData.counters[counterIndex]);
  emitToTenant(tenantId, `ticket_updated:${absentTicket.id}`, absentTicket);

  return absentTicket;
};