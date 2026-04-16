import { getAllTickets } from "./repositories/ticket.repository.js";
import { getAllQueues } from "./repositories/queue.repository.js";
import { getAllCounters } from "./repositories/counter.repository.js";
import { getAllUsers } from "./repositories/user.repository.js";
import { getAllServices } from "./repositories/service.repository.js";
import { getSettings } from "./repositories/settings.repository.js";

const tenantId = "tenant-001";

console.log("Tickets:", await getAllTickets(tenantId));
console.log("Queues:", await getAllQueues(tenantId));
console.log("Counters:", await getAllCounters(tenantId));
console.log("Users:", await getAllUsers(tenantId));
console.log("Services:", await getAllServices(tenantId));
console.log("Settings:", await getSettings(tenantId));