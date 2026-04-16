import { createTicketService } from "./services/ticket.service.js";

const tenantId = "tenant-001";
const serviceId = "service-general";

const ticket = await createTicketService(tenantId, serviceId);

console.log("Created ticket:", ticket);