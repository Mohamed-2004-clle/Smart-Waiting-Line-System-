import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import socket, { joinTenantRoom } from "../socket/socket";
import { getPublicTrackingTicket } from "../services/trackingService";

export default function TrackingPage() {
  const { ticketId } = useParams();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "tenant-001";

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTicket = async () => {
    try {
      const result = await getPublicTrackingTicket(tenantId, ticketId);
      setTicket(result.data);
    } catch (error) {
      console.error("Error loading tracking ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    joinTenantRoom(tenantId);

    socket.on("connect", () => {
      joinTenantRoom(tenantId);
    });

    socket.on(`ticket_updated:${ticketId}`, (updatedTicket) => {
      setTicket(updatedTicket);
    });

    socket.on("queue_updated", async () => {
      await loadTicket();
    });

    return () => {
      socket.off("connect");
      socket.off(`ticket_updated:${ticketId}`);
      socket.off("queue_updated");
    };
  }, [ticketId, tenantId]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading tracking page...</div>;
  }

  if (!ticket) {
    return <div style={{ padding: "20px" }}>Ticket not found</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Track Your Ticket</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "20px" }}>
        <p><strong>Ticket Number:</strong> {ticket.number}</p>
        <p><strong>Track:</strong> {ticket.track}</p>
        <p><strong>Status:</strong> {ticket.status}</p>
        <p><strong>Position:</strong> {ticket.position ?? "-"}</p>
        <p><strong>Estimated Wait:</strong> {ticket.estimatedWaitMinutes ?? 0} min</p>
        <p><strong>Counter:</strong> {ticket.counterId ?? "-"}</p>
      </div>
    </div>
  );
}