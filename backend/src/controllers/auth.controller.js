import { loginService } from "../services/auth.service.js";

export const loginController = async (req, res, next) => {
  try {
    const { tenantId, username, password } = req.body;

    const result = await loginService(tenantId, username, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    next(error);
  }
};