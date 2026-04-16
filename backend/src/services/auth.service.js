import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getActiveUserByUsername } from "../repositories/user.repository.js";
import { AppError } from "../errors/AppError.js";
import { logAuditEvent } from "./audit.service.js";

export const loginService = async (tenantId, username, password) => {
  const user = await getActiveUserByUsername(tenantId, username);

  if (!user) {
    throw new AppError("Invalid username or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid username or password", 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      allowedTracks: Array.isArray(user.allowedTracks) ? user.allowedTracks : []
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    action: "LOGIN_SUCCESS",
    entityType: "user",
    entityId: user.id,
    details: {
      username: user.username,
      role: user.role,
      allowedTracks: user.allowedTracks || []
    }
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      allowedTracks: Array.isArray(user.allowedTracks) ? user.allowedTracks : [],
      tenantId: user.tenantId
    },
    token
  };
};