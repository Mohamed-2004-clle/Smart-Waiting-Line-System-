import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getActiveUserByUsername } from "../repositories/user.repository.js";
import {
  getCountersData,
  saveCountersData
} from "../repositories/counter.repository.js";
import { AppError } from "../errors/AppError.js";
import { logAuditEvent } from "./audit.service.js";
import { emitToTenant } from "../sockets/index.js";

const openDedicatedCounterOnLogin = async (tenantId, user) => {
  if (!["agent", "admin"].includes(user.role)) {
    return null;
  }

  const countersData = await getCountersData(tenantId);

  const counterIndex = countersData.counters.findIndex(
    (counter) =>
      counter.requiredRole === user.role &&
      counter.currentStaffId === user.id
  );

  if (counterIndex === -1) {
    throw new AppError(`No dedicated counter found for this ${user.role}`, 404);
  }

  countersData.counters[counterIndex].status = "open";
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  await saveCountersData(tenantId, countersData);

  const updatedCounter = countersData.counters[counterIndex];
  emitToTenant(tenantId, "counter_updated", updatedCounter);

  return updatedCounter;
};

const closeDedicatedCounterOnLogout = async (tenantId, user) => {
  if (!["agent", "admin"].includes(user.role)) {
    return null;
  }

  const countersData = await getCountersData(tenantId);

  const counterIndex = countersData.counters.findIndex(
    (counter) =>
      counter.requiredRole === user.role &&
      counter.currentStaffId === user.id
  );

  if (counterIndex === -1) {
    return null;
  }

  if (countersData.counters[counterIndex].currentTicketId) {
    throw new AppError(
      "Cannot logout while your counter still has a current ticket",
      400
    );
  }

  countersData.counters[counterIndex].status = "closed";
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  await saveCountersData(tenantId, countersData);

  const updatedCounter = countersData.counters[counterIndex];
  emitToTenant(tenantId, "counter_updated", updatedCounter);

  return updatedCounter;
};

export const loginService = async (tenantId, username, password) => {
  const user = await getActiveUserByUsername(tenantId, username);

  if (!user) {
    throw new AppError("Invalid username or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid username or password", 401);
  }

  const openedCounter = await openDedicatedCounterOnLogin(tenantId, user);

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
      allowedTracks: user.allowedTracks || [],
      autoOpenedCounterId: openedCounter?.id || null
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
    token,
    autoOpenedCounter: openedCounter
      ? {
          id: openedCounter.id,
          name: openedCounter.name,
          status: openedCounter.status
        }
      : null
  };
};

export const logoutService = async (tenantId, user) => {
  if (!user?.id) {
    throw new AppError("User is required", 401);
  }

  const closedCounter = await closeDedicatedCounterOnLogout(tenantId, user);

  await logAuditEvent({
    tenantId,
    userId: user.id,
    action: "LOGOUT_SUCCESS",
    entityType: "user",
    entityId: user.id,
    details: {
      role: user.role,
      autoClosedCounterId: closedCounter?.id || null
    }
  });

  return {
    success: true,
    closedCounter: closedCounter
      ? {
          id: closedCounter.id,
          name: closedCounter.name,
          status: closedCounter.status
        }
      : null
  };
};