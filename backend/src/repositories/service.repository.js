import { readJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getServicesFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "services.json");

export const getAllServices = async (tenantId) => {
  const filePath = getServicesFilePath(tenantId);
  const data = await readJson(filePath);
  return Array.isArray(data.services) ? data.services : [];
};

export const getServiceById = async (tenantId, serviceId) => {
  const services = await getAllServices(tenantId);
  return services.find((service) => service.id === serviceId) || null;
};

export const getServiceByTrack = async (tenantId, track) => {
  const services = await getAllServices(tenantId);
  return services.find((service) => service.track === track) || null;
};

export const getServiceByTrackAndCustomerType = async (
  tenantId,
  track,
  customerType
) => {
  const services = await getAllServices(tenantId);

  return (
    services.find(
      (service) =>
        service.track === track &&
        Array.isArray(service.customerTypes) &&
        service.customerTypes.includes(customerType)
    ) || null
  );
};