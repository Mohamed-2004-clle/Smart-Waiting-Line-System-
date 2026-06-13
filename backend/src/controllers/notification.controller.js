import {
  saveTicketSubscriptionService,
  sendTestNotificationService,
} from "../services/notification.service.js";

export const subscribeToNotificationsController = async (req, res, next) => {
  try {
    const { tenantId, ticketId, subscription } = req.body;

    const data = await saveTicketSubscriptionService({
      tenantId,
      ticketId,
      subscription,
    });

    res.status(201).json({
      success: true,
      message: "Notification subscription saved",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestNotificationController = async (req, res, next) => {
  try {
    const { tenantId, ticketId } = req.body;

    const data = await sendTestNotificationService({
      tenantId,
      ticketId,
    });

    res.status(200).json({
      success: true,
      message: "Test notification sent",
      data,
    });
  } catch (error) {
    next(error);
  }
};