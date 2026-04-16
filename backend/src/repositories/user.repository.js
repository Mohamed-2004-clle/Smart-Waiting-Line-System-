import { readJson, updateJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getUsersFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "users.json");

export const getUsersData = async (tenantId) => {
  const filePath = getUsersFilePath(tenantId);
  return await readJson(filePath);
};

export const getAllUsers = async (tenantId) => {
  const data = await getUsersData(tenantId);
  return Array.isArray(data.users) ? data.users : [];
};

export const getUserByUsername = async (tenantId, username) => {
  const users = await getAllUsers(tenantId);
  return users.find((user) => user.username === username) || null;
};

export const getActiveUserByUsername = async (tenantId, username) => {
  const users = await getAllUsers(tenantId);
  return (
    users.find((user) => user.username === username && user.isActive) || null
  );
};

export const getUserById = async (tenantId, userId) => {
  const users = await getAllUsers(tenantId);
  return users.find((user) => user.id === userId) || null;
};

export const saveUsersData = async (tenantId, usersData) => {
  const filePath = getUsersFilePath(tenantId);
  return await updateJson(filePath, () => usersData);
};