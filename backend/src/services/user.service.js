import bcrypt from "bcrypt";
import {
  getAllUsers,
  getUsersData,
  getActiveUserByUsername,
  saveUsersData
} from "../repositories/user.repository.js";
import { AppError } from "../errors/AppError.js";
import { logAuditEvent } from "./audit.service.js";

const ROLE_TRACKS = {
  admin: ["A"],
  agent: ["B", "C"],
  manager: []
};

export const getAllUsersService = async (tenantId) => {
  const users = await getAllUsers(tenantId);

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    allowedTracks: Array.isArray(user.allowedTracks) ? user.allowedTracks : [],
    isActive: user.isActive,
    tenantId: user.tenantId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));
};

export const createUserService = async (
  tenantId,
  { fullName, username, password, role },
  adminUserId = null
) => {
  const existingUser = await getActiveUserByUsername(tenantId, username);

  if (existingUser) {
    throw new AppError("Username already exists", 400);
  }

  const usersData = await getUsersData(tenantId);
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: `user-${Date.now()}`,
    fullName,
    username,
    passwordHash,
    role,
    allowedTracks: ROLE_TRACKS[role] || [],
    isActive: true,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!Array.isArray(usersData.users)) {
    usersData.users = [];
  }

  usersData.users.push(newUser);

  await saveUsersData(tenantId, usersData);

  await logAuditEvent({
    tenantId,
    userId: adminUserId,
    action: "CREATE_USER",
    entityType: "user",
    entityId: newUser.id,
    details: {
      username: newUser.username,
      role: newUser.role,
      allowedTracks: newUser.allowedTracks
    }
  });

  return {
    id: newUser.id,
    fullName: newUser.fullName,
    username: newUser.username,
    role: newUser.role,
    allowedTracks: newUser.allowedTracks,
    isActive: newUser.isActive,
    tenantId: newUser.tenantId,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt
  };
};

export const setUserActiveStatusService = async (
  tenantId,
  userId,
  isActive,
  adminUserId = null
) => {
  const usersData = await getUsersData(tenantId);

  const userIndex = usersData.users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    throw new AppError("User not found", 404);
  }

  usersData.users[userIndex].isActive = isActive;
  usersData.users[userIndex].updatedAt = new Date().toISOString();

  await saveUsersData(tenantId, usersData);

  const updatedUser = usersData.users[userIndex];

  await logAuditEvent({
    tenantId,
    userId: adminUserId,
    action: isActive ? "ENABLE_USER" : "DISABLE_USER",
    entityType: "user",
    entityId: updatedUser.id,
    details: {
      username: updatedUser.username,
      role: updatedUser.role,
      allowedTracks: updatedUser.allowedTracks || []
    }
  });

  return {
    id: updatedUser.id,
    fullName: updatedUser.fullName,
    username: updatedUser.username,
    role: updatedUser.role,
    allowedTracks: updatedUser.allowedTracks || [],
    isActive: updatedUser.isActive,
    tenantId: updatedUser.tenantId,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt
  };
};