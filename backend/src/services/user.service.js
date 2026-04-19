import bcrypt from "bcrypt";
import {
  getAllUsers,
  getUsersData,
  getActiveUserByUsername,
  saveUsersData
} from "../repositories/user.repository.js";
import {
  getCountersData,
  saveCountersData
} from "../repositories/counter.repository.js";
import { AppError } from "../errors/AppError.js";
import { logAuditEvent } from "./audit.service.js";
import { emitToTenant } from "../sockets/index.js";

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

const buildNextAgentCounter = (existingCounters, newUser) => {
  const agentCounters = existingCounters.filter(
    (counter) => counter.requiredRole === "agent"
  );

  const nextNumber = agentCounters.length + 1;

  return {
    id: `counter-agent-${Date.now()}`,
    name: `Agent Counter ${nextNumber}`,
    number: nextNumber,
    allowedTracks: ["B", "C"],
    requiredRole: "agent",
    status: "closed",
    currentStaffId: newUser.id,
    currentTicketId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
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

  let createdCounter = null;

  if (role === "agent") {
    const countersData = await getCountersData(tenantId);

    if (!Array.isArray(countersData.counters)) {
      countersData.counters = [];
    }

    createdCounter = buildNextAgentCounter(countersData.counters, newUser);
    countersData.counters.push(createdCounter);

    await saveCountersData(tenantId, countersData);

    await logAuditEvent({
      tenantId,
      userId: adminUserId,
      action: "CREATE_AGENT_COUNTER",
      entityType: "counter",
      entityId: createdCounter.id,
      details: {
        counterName: createdCounter.name,
        assignedAgentId: newUser.id,
        assignedAgentUsername: newUser.username
      }
    });

    emitToTenant(tenantId, "counter_updated", createdCounter);
  }

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
    updatedAt: newUser.updatedAt,
    autoCreatedCounter: createdCounter
      ? {
          id: createdCounter.id,
          name: createdCounter.name,
          requiredRole: createdCounter.requiredRole,
          allowedTracks: createdCounter.allowedTracks,
          status: createdCounter.status
        }
      : null
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

export const deleteUserService = async (
  tenantId,
  userId,
  adminUserId = null
) => {
  const usersData = await getUsersData(tenantId);
  const countersData = await getCountersData(tenantId);

  const userIndex = usersData.users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    throw new AppError("User not found", 404);
  }

  const targetUser = usersData.users[userIndex];

  if (targetUser.role !== "agent") {
    throw new AppError("Only agent users can be deleted", 400);
  }

  const relatedCounterIndex = countersData.counters.findIndex(
    (counter) =>
      counter.requiredRole === "agent" && counter.currentStaffId === targetUser.id
  );

  if (relatedCounterIndex !== -1) {
    const relatedCounter = countersData.counters[relatedCounterIndex];

    if (relatedCounter.currentTicketId) {
      throw new AppError(
        "Cannot delete agent while their counter has a current ticket",
        400
      );
    }

    if (relatedCounter.status === "open") {
      throw new AppError(
        "Cannot delete agent while their counter is still open",
        400
      );
    }

    countersData.counters.splice(relatedCounterIndex, 1);
    await saveCountersData(tenantId, countersData);

    await logAuditEvent({
      tenantId,
      userId: adminUserId,
      action: "DELETE_AGENT_COUNTER",
      entityType: "counter",
      entityId: relatedCounter.id,
      details: {
        counterName: relatedCounter.name,
        deletedAgentId: targetUser.id,
        deletedAgentUsername: targetUser.username
      }
    });

    emitToTenant(tenantId, "counter_updated", {
      id: relatedCounter.id,
      deleted: true
    });
  }

  usersData.users.splice(userIndex, 1);
  await saveUsersData(tenantId, usersData);

  await logAuditEvent({
    tenantId,
    userId: adminUserId,
    action: "DELETE_USER",
    entityType: "user",
    entityId: targetUser.id,
    details: {
      username: targetUser.username,
      role: targetUser.role
    }
  });

  return {
    id: targetUser.id,
    fullName: targetUser.fullName,
    username: targetUser.username,
    role: targetUser.role,
    deleted: true
  };
};