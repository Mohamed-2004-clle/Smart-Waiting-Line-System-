import { useState } from "react";
import { createTicket } from "../services/ticketService";

export default function TicketCreation() {
  const [track, setTrack] = useState("C");
  const [customerType, setCustomerType] = useState("regular");
  const [companyName, setCompanyName] = useState("");
  const [createdTicket, setCreatedTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const tenantId = "tenant-001";

  const customerTypeOptions = {
    A: ["company", "professional", "vip"],
    B: ["medical", "elderly", "special-needs"],
    C: ["regular"]
  };

  const handleTrackChange = (value) => {
    setTrack(value);
    setCustomerType(customerTypeOptions[value][0]);
    setCompanyName("");
    setCreatedTicket(null);
  };

  const handleCreateTicket = async () => {
    try {
      setLoading(true);

      const payload = {
        tenantId,
        track,
        customerType
      };

      if (track === "A" && companyName.trim()) {
        payload.companyName = companyName.trim();
      }

      const result = await createTicket(payload);
      setCreatedTicket(result.data);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "20px" }}>
      <h2>Create Ticket</h2>

      <div style={{ marginBottom: "12px" }}>
        <label>Track</label>
        <br />
        <select value={track} onChange={(e) => handleTrackChange(e.target.value)}>
          <option value="A">A - VIP</option>
          <option value="B">B - Priority</option>
          <option value="C">C - Normal</option>
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>Customer Type</label>
        <br />
        <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
          {customerTypeOptions[track].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {track === "A" && (
        <div style={{ marginBottom: "12px" }}>
          <label>Company Name</label>
          <br />
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Optional company name"
          />
        </div>
      )}

      <button onClick={handleCreateTicket} disabled={loading}>
        {loading ? "Creating..." : "Create Ticket"}
      </button>

      {createdTicket && (
        <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
          <h3>Ticket Created</h3>
          <p><strong>Number:</strong> {createdTicket.number}</p>
          <p><strong>Track:</strong> {createdTicket.track}</p>
          <p><strong>Status:</strong> {createdTicket.status}</p>
          <p><strong>Position:</strong> {createdTicket.position}</p>
          <p><strong>Estimated Wait:</strong> {createdTicket.estimatedWaitMinutes} min</p>
          <p>
            <strong>Tracking URL:</strong>{" "}
            <a
              href={createdTicket.trackingUrl}
              target="_blank"
              rel="noreferrer"
            >
              {createdTicket.trackingUrl}
            </a>
          </p>

          {createdTicket.qrCode && (
            <div style={{ marginTop: "15px" }}>
              <img src={createdTicket.qrCode} alt="Ticket QR Code" style={{ width: "180px" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}