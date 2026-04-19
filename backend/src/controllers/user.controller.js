import {
  getAllUsersService,
  createUserService,
  setUserActiveStatusService,
  deleteUserService
} from "../services/user.service.js";

export const getAllUsersController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;

    const users = await getAllUsersService(tenantId);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const createUserController = async (req, res, next) => {
  try {
    const { tenantId, fullName, username, password, role } = req.body;

    const user = await createUserService(
      tenantId,
      { fullName, username, password, role },
      req.user?.id || null
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const disableUserController = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.body;

    const user = await setUserActiveStatusService(
      tenantId,
      userId,
      false,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "User disabled successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const enableUserController = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.body;

    const user = await setUserActiveStatusService(
      tenantId,
      userId,
      true,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "User enabled successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserController = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.body;

    const user = await deleteUserService(
      tenantId,
      userId,
      req.user?.id || null
    );

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};