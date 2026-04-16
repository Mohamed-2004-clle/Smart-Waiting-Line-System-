import {
  getAllCountersService,
  openCounterService,
  closeCounterService,
  assignStaffToCounterService
} from "../services/counter.service.js";

export const getAllCountersController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;

    const counters = await getAllCountersService(tenantId);

    res.status(200).json({
      success: true,
      data: counters
    });
  } catch (error) {
    next(error);
  }
};

export const openCounterController = async (req, res, next) => {
  try {
    const { tenantId, counterId } = req.body;

    const counter = await openCounterService(
      tenantId,
      counterId,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "Counter opened successfully",
      data: counter
    });
  } catch (error) {
    next(error);
  }
};

export const closeCounterController = async (req, res, next) => {
  try {
    const { tenantId, counterId } = req.body;

    const counter = await closeCounterService(
      tenantId,
      counterId,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "Counter closed successfully",
      data: counter
    });
  } catch (error) {
    next(error);
  }
};

export const assignStaffToCounterController = async (req, res, next) => {
  try {
    const { tenantId, counterId, staffId } = req.body;

    const counter = await assignStaffToCounterService(
      tenantId,
      counterId,
      staffId,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "Staff assigned to counter successfully",
      data: counter
    });
  } catch (error) {
    next(error);
  }
};