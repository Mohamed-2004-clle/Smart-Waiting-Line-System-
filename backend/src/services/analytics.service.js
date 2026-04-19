import { getAllTickets } from "../repositories/ticket.repository.js";
import { getAllCounters } from "../repositories/counter.repository.js";

export const getDashboardAnalyticsService = async (tenantId) => {
  const tickets = await getAllTickets(tenantId);
  const counters = await getAllCounters(tenantId);

  const totalTickets = tickets.length;
  const waitingTickets = tickets.filter((ticket) => ticket.status === "waiting").length;
  const calledTickets = tickets.filter((ticket) => ticket.status === "called").length;
  const completedTickets = tickets.filter((ticket) => ticket.status === "completed").length;
  const cancelledTickets = tickets.filter((ticket) => ticket.status === "cancelled").length;
  const absentTickets = tickets.filter((ticket) => ticket.status === "absent").length;

  const completedWithTimes = tickets.filter(
    (ticket) => ticket.status === "completed" && ticket.createdAt && ticket.completedAt
  );

  const totalWaitMinutes = completedWithTimes.reduce((sum, ticket) => {
    const createdAt = new Date(ticket.createdAt).getTime();
    const completedAt = new Date(ticket.completedAt).getTime();
    return sum + (completedAt - createdAt) / (1000 * 60);
  }, 0);

  const averageCompletionMinutes =
    completedWithTimes.length > 0
      ? Number((totalWaitMinutes / completedWithTimes.length).toFixed(2))
      : 0;

  const openCounters = counters.filter((counter) => counter.status === "open").length;
  const closedCounters = counters.filter((counter) => counter.status !== "open").length;

  const counterPerformance = counters.map((counter) => {
    const counterTickets = tickets.filter((ticket) => ticket.counterId === counter.id);
    const completedByCounter = counterTickets.filter(
      (ticket) => ticket.status === "completed"
    ).length;
    const calledByCounter = counterTickets.filter(
      (ticket) => ticket.status === "called"
    ).length;
    const absentByCounter = counterTickets.filter(
      (ticket) => ticket.status === "absent"
    ).length;

    return {
      counterId: counter.id,
      counterName: counter.name,
      status: counter.status,
      currentStaffId: counter.currentStaffId,
      currentTicketId: counter.currentTicketId,
      totalTicketsHandled: counterTickets.length,
      completedTickets: completedByCounter,
      calledTickets: calledByCounter,
      absentTickets: absentByCounter
    };
  });

  return {
    overview: {
      totalTickets,
      waitingTickets,
      calledTickets,
      completedTickets,
      cancelledTickets,
      absentTickets,
      averageCompletionMinutes,
      totalCounters: counters.length,
      openCounters,
      closedCounters
    },
    counterPerformance
  };
};