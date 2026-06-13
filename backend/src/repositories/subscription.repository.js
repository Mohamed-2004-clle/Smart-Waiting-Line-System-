import { readJson, updateJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getSubscriptionsFilePath = (tenantId) => {
  return getTenantFilePath(tenantId, "subscriptions.json");
};

export const saveSubscriptionForTicket = async ({
  tenantId,
  ticketId,
  subscription,
}) => {
  const filePath = getSubscriptionsFilePath(tenantId);

  return await updateJson(filePath, (data) => {
    if (!data || typeof data !== "object") {
      data = {};
    }

    if (!Array.isArray(data.subscriptions)) {
      data.subscriptions = [];
    }

    const existingIndex = data.subscriptions.findIndex(
      (item) => item.ticketId === ticketId
    );

    const record = {
      ticketId,
      subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      data.subscriptions[existingIndex] = {
        ...data.subscriptions[existingIndex],
        subscription,
        updatedAt: record.updatedAt,
      };
    } else {
      data.subscriptions.push(record);
    }

    return data;
  });
};

export const getSubscriptionByTicketId = async ({ tenantId, ticketId }) => {
  const filePath = getSubscriptionsFilePath(tenantId);
  const data = await readJson(filePath);

  if (!data || !Array.isArray(data.subscriptions)) {
    return null;
  }

  return data.subscriptions.find((item) => item.ticketId === ticketId) || null;
};