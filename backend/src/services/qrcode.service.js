import crypto from "crypto";
import QRCode from "qrcode";

export const generateTicketVerificationHash = (ticketId) => {
  return crypto
    .createHash("sha256")
    .update(`${ticketId}-${Date.now()}-${Math.random()}`)
    .digest("hex");
};

export const buildTrackingUrl = (ticketId) => {
  return `/track/${ticketId}`;
};

export const generateTicketQrPayload = (ticketId, verificationHash) => {
  return {
    ticketId,
    trackingUrl: buildTrackingUrl(ticketId),
    verificationHash
  };
};

export const generateTicketQrCodeDataUrl = async (ticketId, verificationHash) => {
  const payload = generateTicketQrPayload(ticketId, verificationHash);

  return await QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300
  });
};