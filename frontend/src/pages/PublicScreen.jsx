import { useEffect, useMemo, useState } from "react";
import socket, { joinTenantRoom } from "../socket/socket";
import { getAllTickets } from "../services/ticketService";
import { getAllCounters } from "../services/counterService";

export default function PublicScreen() {
  const tenantId = "tenant-001";

  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [ticketsResult, countersResult] = await Promise.all([
        getAllTickets(tenantId),
        getAllCounters(tenantId)
      ]);

      setTickets(ticketsResult.data || []);
      setCounters(countersResult.data || []);
    } catch (error) {
      console.error("Error loading public screen data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calledTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === "called");
  }, [tickets]);

  const waitingTickets = useMemo(() => {
    return tickets
      .filter((ticket) => ticket.status === "waiting")
      .sort((a, b) => {
        const posA = a.position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.position ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });
  }, [tickets]);

  const nowServing = useMemo(() => {
    return calledTickets.map((ticket) => {
      const counter = counters.find((item) => item.id === ticket.counterId);

      return {
        id: ticket.id,
        number: ticket.number,
        counterName: counter?.name || ticket.counterId || "Unknown Counter"
      };
    });
  }, [calledTickets, counters]);

  const waitingPreview = useMemo(() => {
    return waitingTickets.slice(0, 12);
  }, [waitingTickets]);

  useEffect(() => {
    loadData();
    joinTenantRoom(tenantId);

    socket.on("connect", () => {
      joinTenantRoom(tenantId);
    });

    socket.on("queue_updated", () => {
      loadData();
    });

    socket.on("ticket_called", () => {
      loadData();
    });

    socket.on("ticket_completed", () => {
      loadData();
    });

    socket.on("ticket_absent", () => {
      loadData();
    });

    socket.on("counter_updated", () => {
      loadData();
    });

    return () => {
      socket.off("connect");
      socket.off("queue_updated");
      socket.off("ticket_called");
      socket.off("ticket_completed");
      socket.off("ticket_absent");
      socket.off("counter_updated");
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "30px", fontSize: "24px" }}>
        Loading public screen...
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        Smart Waiting Line Screen
      </h1>

      <div
        style={{
          border: "2px solid #ddd",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "30px"
        }}
      >
        <h2>Now Serving</h2>

        {nowServing.length === 0 ? (
          <p>No ticket is being called right now.</p>
        ) : (
          <div>
            {nowServing.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "12px",
                  padding: "15px",
                  marginBottom: "12px"
                }}
              >
                <p style={{ fontSize: "28px", margin: "0 0 8px 0" }}>
                  <strong>{item.number}</strong>
                </p>
                <p style={{ margin: 0 }}>Counter: {item.counterName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: "2px solid #ddd",
          borderRadius: "16px",
          padding: "20px"
        }}
      >
        <h2>Waiting Queue</h2>
        <p>Total Waiting Tickets: {waitingTickets.length}</p>

        {waitingPreview.length === 0 ? (
          <p>No waiting tickets.</p>
        ) : (
          <ul style={{ fontSize: "20px", lineHeight: "1.8" }}>
            {waitingPreview.map((ticket, index) => (
              <li key={ticket.id}>
                {ticket.number} - Position {ticket.position ?? index + 1}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}