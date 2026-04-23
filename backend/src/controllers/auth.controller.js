import { loginService, logoutService } from "../services/auth.service.js";

export const loginController = async (req, res, next) => {
  try {
    const { tenantId, username, password } = req.body;

    const data = await loginService(tenantId, username, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (req, res, next) => {
  try {
    const { tenantId } = req.body;

    const data = await logoutService(tenantId, req.user);

    res.status(200).json({
      success: true,
      message: "Logout successful",
      data
    });
  } catch (error) {
    next(error);
  }
};