import { getTicketsData, saveTicketsData } from "../repositories/ticket.repository.js";
import { getCountersData, saveCountersData } from "../repositories/counter.repository.js";

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || "tenant-001";

export const resetDemoDataOnStartup = async () => {
  if (process.env.RESET_DEMO_ON_START !== "true") {
    console.log("Demo reset on startup is disabled");
    return;
  }

  console.log("Resetting demo data on startup...");

  const ticketsData = await getTicketsData(DEMO_TENANT_ID);

  ticketsData.lastSequenceByTrack = {
    A: 0,
    B: 0,
    C: 0
  };

  ticketsData.tickets = [];

  await saveTicketsData(DEMO_TENANT_ID, ticketsData);

  const countersData = await getCountersData(DEMO_TENANT_ID);

  countersData.counters = countersData.counters.map((counter) => ({
    ...counter,
    status: "closed",
    currentTicketId: null,
    updatedAt: new Date().toISOString()
  }));

  await saveCountersData(DEMO_TENANT_ID, countersData);

  console.log("Demo data reset successfully");
};  