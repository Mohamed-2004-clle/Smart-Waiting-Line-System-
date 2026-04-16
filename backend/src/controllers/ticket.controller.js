import {
  createTicketService,
  getAllTicketsService,
  getTicketByIdService,
  getPublicTrackingTicketService,
  getQueueStatusByTrackService,
  callNextTicketService,
  completeCurrentTicketService
} from "../services/ticket.service.js";

export const createTicketController = async (req, res, next) => {
  try {
    const { tenantId, track, customerType, companyName } = req.body;

    const ticket = await createTicketService(tenantId, {
      track,
      customerType,
      companyName
    });

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTicketsController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;

    const tickets = await getAllTicketsService(tenantId);

    res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketByIdController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;
    const { ticketId } = req.params;

    const ticket = await getTicketByIdService(tenantId, ticketId);

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicTrackingTicketController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;
    const { ticketId } = req.params;

    const ticket = await getPublicTrackingTicketService(tenantId, ticketId);

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueStatusByTrackController = async (req, res, next) => {
  try {
    const { tenantId, track } = req.query;

    const data = await getQueueStatusByTrackService(tenantId, track);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const callNextTicketController = async (req, res, next) => {
  try {
    const { tenantId } = req.body;

    const ticket = await callNextTicketService(
      tenantId,
      req.user?.id || null,
      req.user?.role || null
    );

    res.status(200).json({
      success: true,
      message: "Next ticket called successfully",
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

export const completeCurrentTicketController = async (req, res, next) => {
  try {
    const { tenantId } = req.body;

    const ticket = await completeCurrentTicketService(
      tenantId,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "Ticket completed successfully",
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};