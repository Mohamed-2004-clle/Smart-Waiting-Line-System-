import { addAuditEvent } from "../repositories/audit.repository.js";

export const logAuditEvent = async ({
  tenantId = null,
  userId = null,
  action,
  entityType,
  entityId = null,
  details = {}
}) => {
  const event = {
    id: `audit-${Date.now()}`,
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString()
  };

  await addAuditEvent(event);

  return event;
};