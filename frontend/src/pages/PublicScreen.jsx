import { useEffect, useMemo, useState } from "react";
import socket, { joinTenantRoom } from "../socket/socket";
import { getAllTickets } from "../services/ticketService";
import { getAllCounters } from "../services/counterService";

export default function PublicScreen() {
  const tenantId = "tenant-001";

  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);

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
    return waitingTickets.slice(0, 10);
  }, [waitingTickets]);

  useEffect(() => {
    loadData();
    joinTenantRoom(tenantId);

    const clockInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    const handleConnect = () => {
      joinTenantRoom(tenantId);
    };

    const handleRefresh = () => {
      loadData();
    };

    const handleTicketCalled = (ticket) => {
      setHighlightedTicketId(ticket.id);
      loadData();

      setTimeout(() => {
        setHighlightedTicketId(null);
      }, 5000);
    };

    socket.on("connect", handleConnect);
    socket.on("queue_updated", handleRefresh);
    socket.on("ticket_called", handleTicketCalled);
    socket.on("ticket_completed", handleRefresh);
    socket.on("ticket_absent", handleRefresh);
    socket.on("counter_updated", handleRefresh);

    return () => {
      clearInterval(clockInterval);
      socket.off("connect", handleConnect);
      socket.off("queue_updated", handleRefresh);
      socket.off("ticket_called", handleTicketCalled);
      socket.off("ticket_completed", handleRefresh);
      socket.off("ticket_absent", handleRefresh);
      socket.off("counter_updated", handleRefresh);
    };
  }, []);

  const currentTime = now.toLocaleTimeString();
  const currentDate = now.toLocaleDateString();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          fontFamily: "Arial, sans-serif",
          background: "#0f172a",
          color: "#ffffff"
        }}
      >
        Loading screen...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "30px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ fontSize: "48px", fontWeight: "bold" }}>{currentTime}</div>
          <div style={{ fontSize: "22px", color: "#cbd5e1" }}>{currentDate}</div>
        </div>

        <h1
          style={{
            textAlign: "center",
            fontSize: "48px",
            margin: 0,
            letterSpacing: "1px"
          }}
        >
          SMART WAITING LINE
        </h1>

        <div style={{ width: "180px" }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: "24px",
          alignItems: "start"
        }}
      >
        <div
          style={{
            background: "#111827",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
          }}
        >
          <h2 style={{ fontSize: "36px", marginTop: 0, marginBottom: "20px" }}>
            NOW SERVING
          </h2>

          {nowServing.length === 0 ? (
            <div
              style={{
                background: "#1f2937",
                borderRadius: "20px",
                padding: "30px",
                fontSize: "28px",
                textAlign: "center"
              }}
            >
              No ticket is being called right now.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {nowServing.map((item) => {
                const isHighlighted = highlightedTicketId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: isHighlighted ? "#2563eb" : "#1e293b",
                      borderRadius: "22px",
                      padding: "26px",
                      textAlign: "center",
                      transform: isHighlighted ? "scale(1.03)" : "scale(1)",
                      transition: "all 0.3s ease",
                      boxShadow: isHighlighted
                        ? "0 0 30px rgba(37, 99, 235, 0.8)"
                        : "none"
                    }}
                  >
                    <div style={{ fontSize: "64px", fontWeight: "bold", marginBottom: "10px" }}>
                      {item.number}
                    </div>
                    <div style={{ fontSize: "28px" }}>
                      Counter: <strong>{item.counterName}</strong>
                    </div>
                    {isHighlighted && (
                      <div
                        style={{
                          marginTop: "14px",
                          fontSize: "24px",
                          fontWeight: "bold"
                        }}
                      >
                        NEW CALL
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: "#111827",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
          }}
        >
          <h2 style={{ fontSize: "36px", marginTop: 0, marginBottom: "16px" }}>
            WAITING QUEUE
          </h2>

          <p style={{ fontSize: "22px", marginTop: 0, marginBottom: "20px", color: "#cbd5e1" }}>
            Total Waiting Tickets: {waitingTickets.length}
          </p>

          {waitingPreview.length === 0 ? (
            <div
              style={{
                background: "#1f2937",
                borderRadius: "20px",
                padding: "24px",
                fontSize: "24px",
                textAlign: "center"
              }}
            >
              No waiting tickets.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {waitingPreview.map((ticket, index) => (
                <div
                  key={ticket.id}
                  style={{
                    background: "#1e293b",
                    borderRadius: "18px",
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ fontSize: "28px", fontWeight: "bold" }}>
                    {ticket.number}
                  </span>
                  <span style={{ fontSize: "22px", color: "#cbd5e1" }}>
                    Position {ticket.position ?? index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}