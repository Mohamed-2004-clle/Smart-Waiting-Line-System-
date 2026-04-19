import crypto from "crypto";
import QRCode from "qrcode";

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

export const generateTicketVerificationHash = (ticketId) => {
  return crypto
    .createHash("sha256")
    .update(`${ticketId}-${Date.now()}-${Math.random()}`)
    .digest("hex");
};

export const buildTrackingUrl = (ticketId, tenantId = "tenant-001") => {
  return `${FRONTEND_BASE_URL}/track/${ticketId}?tenantId=${tenantId}`;
};

export const generateTicketQrPayload = (ticketId, tenantId, verificationHash) => {
  return {
    ticketId,
    trackingUrl: buildTrackingUrl(ticketId, tenantId),
    verificationHash
  };
};

export const generateTicketQrCodeDataUrl = async (
  ticketId,
  tenantId,
  verificationHash
) => {
  const payload = generateTicketQrPayload(ticketId, tenantId, verificationHash);

  return await QRCode.toDataURL(payload.trackingUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300
  });
};