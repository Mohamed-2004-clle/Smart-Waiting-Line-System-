export const getTodayDateKey = () => {
  return new Date().toISOString().split("T")[0];
};

export const formatSequence = (sequence) => {
  return String(sequence).padStart(3, "0");
};

export const buildTicketNumber = (prefix, sequence) => {
  return `${prefix}-${formatSequence(sequence)}`;
};