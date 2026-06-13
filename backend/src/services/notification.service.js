import "dotenv/config";
import webpush from "web-push";
import { AppError } from "../errors/AppError.js";
import {
  saveSubscriptionForTicket,
  getSubscriptionByTicketId,
} from "../repositories/subscription.repository.js";

let vapidConfigured = false;

const configureWebPush = () => {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:test@example.com";

  console.log("VAPID_PUBLIC_KEY exists:", Boolean(publicKey));
  console.log("VAPID_PRIVATE_KEY exists:", Boolean(privateKey));

  if (!publicKey || !privateKey) {
    throw new AppError(
      "VAPID keys are missing. Check backend/.env",
      500
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
};

export const saveTicketSubscriptionService = async ({
  tenantId,
  ticketId,
  subscription,
}) => {
  if (!tenantId || !ticketId || !subscription) {
    throw new AppError("tenantId, ticketId and subscription are required", 400);
  }

  await saveSubscriptionForTicket({
    tenantId,
    ticketId,
    subscription,
  });

  return {
    ticketId,
    subscribed: true,
  };
};

export const sendNotificationToTicketService = async ({
  tenantId,
  ticketId,
  title,
  body,
  url,
}) => {
  configureWebPush();

  const record = await getSubscriptionByTicketId({
    tenantId,
    ticketId,
  });

  if (!record) {
    return {
      sent: false,
      reason: "No subscription found for this ticket",
    };
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
  });

  await webpush.sendNotification(record.subscription, payload);

  return {
    sent: true,
    ticketId,
  };
};

export const sendTestNotificationService = async ({ tenantId, ticketId }) => {
  return await sendNotificationToTicketService({
    tenantId,
    ticketId,
    title: "Smart Queue",
    body: "Test notification: your ticket notifications are enabled.",
    url: `/track/${ticketId}?tenantId=${tenantId}`,
  });
};