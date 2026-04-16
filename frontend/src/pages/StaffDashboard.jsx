import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  callNextTicket,
  completeCurrentTicket,
  getAllTickets
} from "../services/ticketService";
import {
  getAllCounters,
  openCounter,
  closeCounter
} from "../services/counterService";
import socket, { joinTenantRoom } from "../socket/socket";

export default function StaffDashboard() {
  const [tickets, setTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [counters, setCounters] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [loadingCall, setLoadingCall] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingOpenCounter, setLoadingOpenCounter] = useState(false);
  const [loadingCloseCounter, setLoadingCloseCounter] = useState(false);
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("user"));
  const tenantId = savedUser?.tenantId || "tenant-001";
  const staffId = savedUser?.id || null;
  const role = savedUser?.role || null;

  const allowedTracks = useMemo(() => {
    return Array.isArray(savedUser?.allowedTracks) ? savedUser.allowedTracks : [];
  }, [savedUser]);

  const myOpenCounter = useMemo(() => {
    return (
      counters.find(
        (counter) =>
          counter.status === "open" && counter.currentStaffId === staffId
      ) || null
    );
  }, [counters, staffId]);

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => allowedTracks.includes(ticket.track));
  }, [tickets, allowedTracks]);

  const groupedTickets = useMemo(() => {
    return {
      A: visibleTickets.filter((ticket) => ticket.track === "A"),
      B: visibleTickets.filter((ticket) => ticket.track === "B"),
      C: visibleTickets.filter((ticket) => ticket.track === "C")
    };
  }, [visibleTickets]);

  const loadTickets = async () => {
    try {
      const result = await getAllTickets(tenantId);
      const allTickets = result.data || [];
      setTickets(allTickets);

      const calledTicket =
        allTickets.find(
          (ticket) =>
            ticket.status === "called" &&
            myOpenCounter &&
            ticket.counterId === myOpenCounter.id
        ) || null;

      setCurrentTicket(calledTicket);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const loadCounters = async () => {
    try {
      const result = await getAllCounters(tenantId);
      const allCounters = result.data || [];
      const visibleCounters = allCounters.filter((counter) =>
        counter.requiredRole === role
      );

      setCounters(visibleCounters);

      if (visibleCounters.length > 0 && !selectedCounterId) {
        setSelectedCounterId(visibleCounters[0].id);
      }
    } catch (error) {
      console.error("Error loading counters:", error);
    }
  };

  const handleCallNext = async () => {
    try {
      setLoadingCall(true);
      const result = await callNextTicket(tenantId);
      setCurrentTicket(result.data);
    } catch (error) {
      console.error("Error calling next ticket:", error);
      alert(error.response?.data?.message || "Call next failed");
    } finally {
      setLoadingCall(false);
    }
  };

  const handleCompleteTicket = async () => {
    try {
      setLoadingComplete(true);
      await completeCurrentTicket(tenantId);
      setCurrentTicket(null);
    } catch (error) {
      console.error("Error completing ticket:", error);
      alert(error.response?.data?.message || "Complete failed");
    } finally {
      setLoadingComplete(false);
    }
  };

  const handleOpenCounter = async () => {
    if (!selectedCounterId) return;

    try {
      setLoadingOpenCounter(true);
      await openCounter(tenantId, selectedCounterId);
      await loadCounters();
      await loadTickets();
    } catch (error) {
      console.error("Error opening counter:", error);
      alert(error.response?.data?.message || "Open counter failed");
    } finally {
      setLoadingOpenCounter(false);
    }
  };

  const handleCloseCounter = async () => {
    if (!selectedCounterId) return;

    try {
      setLoadingCloseCounter(true);
      await closeCounter(tenantId, selectedCounterId);
      await loadCounters();
      setCurrentTicket(null);
    } catch (error) {
      console.error("Error closing counter:", error);
      alert(error.response?.data?.message || "Close counter failed");
    } finally {
      setLoadingCloseCounter(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/staff/login");
  };

  useEffect(() => {
    if (!savedUser) {
      navigate("/staff/login");
      return;
    }

    loadCounters();
    joinTenantRoom(tenantId);

    socket.on("connect", () => {
      joinTenantRoom(tenantId);
    });

    socket.on("ticket_called", (ticket) => {
      if (myOpenCounter && ticket.counterId === myOpenCounter.id) {
        setCurrentTicket(ticket);
      }
    });

    socket.on("ticket_completed", (ticket) => {
      if (myOpenCounter && ticket.counterId === myOpenCounter.id) {
        setCurrentTicket(null);
      }
    });

    socket.on("queue_updated", (updatedTickets) => {
      setTickets(updatedTickets);

      const calledTicket =
        updatedTickets.find(
          (ticket) =>
            ticket.status === "called" &&
            myOpenCounter &&
            ticket.counterId === myOpenCounter.id
        ) || null;

      setCurrentTicket(calledTicket);
    });

    socket.on("counter_updated", () => {
      loadCounters();
    });

    return () => {
      socket.off("connect");
      socket.off("ticket_called");
      socket.off("ticket_completed");
      socket.off("queue_updated");
      socket.off("counter_updated");
    };
  }, [myOpenCounter]);

  useEffect(() => {
    loadTickets();
  }, [myOpenCounter]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Staff Dashboard</h1>

      <p>
        Logged in as: <strong>{savedUser?.fullName}</strong> ({savedUser?.role})
      </p>

      <button onClick={handleLogout} style={{ marginBottom: "15px" }}>
        Logout
      </button>

      <h2>My Counter</h2>
      {myOpenCounter ? (
        <p>
          {myOpenCounter.name} - {myOpenCounter.status}
        </p>
      ) : (
        <p>No open counter assigned to you</p>
      )}

      <h2>Counter Management</h2>
      <div style={{ marginBottom: "15px" }}>
        <select
          value={selectedCounterId}
          onChange={(e) => setSelectedCounterId(e.target.value)}
        >
          <option value="">Select counter</option>
          {counters.map((counter) => (
            <option key={counter.id} value={counter.id}>
              {counter.name} - {counter.status}
            </option>
          ))}
        </select>

        <button
          onClick={handleOpenCounter}
          disabled={loadingOpenCounter || !selectedCounterId}
          style={{ marginLeft: "10px" }}
        >
          {loadingOpenCounter ? "Opening..." : "Open Counter"}
        </button>

        <button
          onClick={handleCloseCounter}
          disabled={loadingCloseCounter || !selectedCounterId}
          style={{ marginLeft: "10px" }}
        >
          {loadingCloseCounter ? "Closing..." : "Close Counter"}
        </button>
      </div>

      <h2>Current Ticket</h2>
      {currentTicket ? (
        <p>
          {currentTicket.number} - {currentTicket.status}
        </p>
      ) : (
        <p>No current ticket on your counter</p>
      )}

      <div>
        <button
          onClick={handleCallNext}
          disabled={loadingCall || currentTicket || !myOpenCounter}
        >
          {loadingCall ? "Calling..." : "Call Next Ticket"}
        </button>

        <button
          onClick={handleCompleteTicket}
          disabled={loadingComplete || !currentTicket || !myOpenCounter}
          style={{ marginLeft: "10px" }}
        >
          {loadingComplete ? "Completing..." : "Complete Current Ticket"}
        </button>
      </div>

      <h2>Queues By Track</h2>

      {allowedTracks.includes("A") && (
        <>
          <h3>Track A</h3>
          <ul>
            {groupedTickets.A.map((ticket) => (
              <li key={ticket.id}>
                {ticket.number} - {ticket.status} - pos: {ticket.position ?? "-"}
              </li>
            ))}
          </ul>
        </>
      )}

      {allowedTracks.includes("B") && (
        <>
          <h3>Track B</h3>
          <ul>
            {groupedTickets.B.map((ticket) => (
              <li key={ticket.id}>
                {ticket.number} - {ticket.status} - pos: {ticket.position ?? "-"}
              </li>
            ))}
          </ul>
        </>
      )}

      {allowedTracks.includes("C") && (
        <>
          <h3>Track C</h3>
          <ul>
            {groupedTickets.C.map((ticket) => (
              <li key={ticket.id}>
                {ticket.number} - {ticket.status} - pos: {ticket.position ?? "-"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}