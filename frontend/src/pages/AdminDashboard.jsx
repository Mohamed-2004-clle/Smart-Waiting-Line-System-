import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardAnalytics } from "../services/analyticsService";
import {
  callNextTicket,
  completeCurrentTicket,
  getAllTickets,
  markCurrentTicketAbsent
} from "../services/ticketService";
import {
  getAllCounters,
  openCounter,
  closeCounter
} from "../services/counterService";
import {
  getAllUsers,
  createUser,
  disableUser,
  enableUser,
  deleteUser
} from "../services/userService";
import socket, { joinTenantRoom } from "../socket/socket";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Invalid user in localStorage:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [counters, setCounters] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCall, setLoadingCall] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  const [loadingOpenCounter, setLoadingOpenCounter] = useState(false);
  const [loadingCloseCounter, setLoadingCloseCounter] = useState(false);
  const [loadingCreateAgent, setLoadingCreateAgent] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [newAgentFullName, setNewAgentFullName] = useState("");
  const [newAgentUsername, setNewAgentUsername] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");

  const navigate = useNavigate();

  const savedUser = getStoredUser();
  const tenantId = savedUser?.tenantId || "tenant-001";
  const adminId = savedUser?.id || null;
  const role = savedUser?.role || null;

  const adminCounters = useMemo(() => {
    return counters.filter((counter) => counter.requiredRole === "admin");
  }, [counters]);

  const autoCreatedAgentCounters = useMemo(() => {
    return counters.filter((counter) => counter.requiredRole === "agent");
  }, [counters]);

  const myOpenCounter = useMemo(() => {
    return (
      adminCounters.find(
        (counter) =>
          counter.status === "open" && counter.currentStaffId === adminId
      ) || null
    );
  }, [adminCounters, adminId]);

  const trackATickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.track === "A");
  }, [tickets]);

  const trackAWaitingTickets = useMemo(() => {
    return trackATickets.filter((ticket) => ticket.status === "waiting");
  }, [trackATickets]);

  const trackAAbsentTickets = useMemo(() => {
    return trackATickets.filter((ticket) => ticket.status === "absent");
  }, [trackATickets]);

  const agentUsers = useMemo(() => {
    return users.filter((user) => user.role === "agent");
  }, [users]);

  const getUserNameById = (userId) => {
    const user = users.find((item) => item.id === userId);
    return user ? user.fullName : "none";
  };

  const loadAnalytics = async () => {
    const result = await getDashboardAnalytics(tenantId);
    setAnalytics(result.data);
  };

  const loadTickets = async () => {
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
  };

  const loadCounters = async () => {
    const result = await getAllCounters(tenantId);
    const allCounters = result.data || [];
    setCounters(allCounters);

    const visibleCounters = allCounters.filter(
      (counter) => counter.requiredRole === "admin"
    );

    if (visibleCounters.length > 0 && !selectedCounterId) {
      setSelectedCounterId(visibleCounters[0].id);
    }
  };

  const loadUsers = async () => {
    const result = await getAllUsers(tenantId);
    setUsers(result.data || []);
  };

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadAnalytics(),
        loadCounters(),
        loadTickets(),
        loadUsers()
      ]);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      alert(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    try {
      setLoadingCall(true);
      const result = await callNextTicket(tenantId);
      setCurrentTicket(result.data);
      await loadAllData();
    } catch (error) {
      console.error("Error calling next ticket:", error);

      const message = error.response?.data?.message || "Call next failed";

      if (
        error.response?.status === 404 &&
        (
          message === "No waiting tickets available for your role" ||
          message === "No waiting tickets found"
        )
      ) {
        alert("No more waiting VIP tickets.");
      } else {
        alert(message);
      }
    } finally {
      setLoadingCall(false);
    }
  };

  const handleCompleteTicket = async () => {
    try {
      setLoadingComplete(true);
      await completeCurrentTicket(tenantId);
      setCurrentTicket(null);
      await loadAllData();
    } catch (error) {
      console.error("Error completing ticket:", error);
      alert(error.response?.data?.message || "Complete failed");
    } finally {
      setLoadingComplete(false);
    }
  };

  const handleMarkAbsent = async () => {
    try {
      setLoadingAbsent(true);
      await markCurrentTicketAbsent(tenantId);
      setCurrentTicket(null);
      await loadAllData();
    } catch (error) {
      console.error("Error marking ticket absent:", error);
      alert(error.response?.data?.message || "Mark absent failed");
    } finally {
      setLoadingAbsent(false);
    }
  };

  const handleOpenCounter = async () => {
    if (!selectedCounterId) return;

    try {
      setLoadingOpenCounter(true);
      await openCounter(tenantId, selectedCounterId);
      await loadAllData();
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
      setCurrentTicket(null);
      await loadAllData();
    } catch (error) {
      console.error("Error closing counter:", error);
      alert(error.response?.data?.message || "Close counter failed");
    } finally {
      setLoadingCloseCounter(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();

    if (!newAgentFullName.trim() || !newAgentUsername.trim() || !newAgentPassword.trim()) {
      alert("Please fill all agent fields.");
      return;
    }

    try {
      setLoadingCreateAgent(true);

      await createUser({
        tenantId,
        fullName: newAgentFullName.trim(),
        username: newAgentUsername.trim(),
        password: newAgentPassword.trim(),
        role: "agent"
      });

      setNewAgentFullName("");
      setNewAgentUsername("");
      setNewAgentPassword("");

      await loadUsers();
      await loadCounters();
      alert("Agent created successfully with an automatic counter.");
    } catch (error) {
      console.error("Error creating agent:", error);
      alert(error.response?.data?.message || "Create agent failed");
    } finally {
      setLoadingCreateAgent(false);
    }
  };

  const handleDisableAgent = async (userId) => {
    try {
      setUpdatingUserId(userId);
      await disableUser(tenantId, userId);
      await loadUsers();
      await loadCounters();
    } catch (error) {
      console.error("Error disabling agent:", error);
      alert(error.response?.data?.message || "Disable agent failed");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleEnableAgent = async (userId) => {
    try {
      setUpdatingUserId(userId);
      await enableUser(tenantId, userId);
      await loadUsers();
    } catch (error) {
      console.error("Error enabling agent:", error);
      alert(error.response?.data?.message || "Enable agent failed");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteAgent = async (userId, fullName) => {
    const confirmed = window.confirm(
      `Delete agent "${fullName}" and their automatic counter?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      await deleteUser(tenantId, userId);
      await loadUsers();
      await loadCounters();
      alert("Agent deleted successfully.");
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert(error.response?.data?.message || "Delete agent failed");
    } finally {
      setUpdatingUserId(null);
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

    if (role !== "admin") {
      navigate("/staff/dashboard");
      return;
    }

    loadAllData();
    joinTenantRoom(tenantId);

    socket.on("connect", () => {
      joinTenantRoom(tenantId);
    });

    socket.on("queue_updated", () => {
      loadAllData();
    });

    socket.on("ticket_called", () => {
      loadAllData();
    });

    socket.on("ticket_completed", () => {
      loadAllData();
    });

    socket.on("ticket_absent", () => {
      loadAllData();
    });

    socket.on("counter_updated", () => {
      loadAllData();
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

  useEffect(() => {
    if (!myOpenCounter) {
      setCurrentTicket(null);
      return;
    }

    const calledTicket =
      tickets.find(
        (ticket) =>
          ticket.status === "called" &&
          ticket.counterId === myOpenCounter.id
      ) || null;

    setCurrentTicket(calledTicket);
  }, [tickets, myOpenCounter]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading admin dashboard...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>

      <p>
        Logged in as: <strong>{savedUser?.fullName}</strong> ({savedUser?.role})
      </p>

      <button onClick={handleLogout} style={{ marginBottom: "15px" }}>
        Logout
      </button>

      {analytics && (
        <>
          <h2>Overview Analytics</h2>
          <ul>
            <li>Total Tickets: {analytics.overview.totalTickets}</li>
            <li>Waiting Tickets: {analytics.overview.waitingTickets}</li>
            <li>Called Tickets: {analytics.overview.calledTickets}</li>
            <li>Completed Tickets: {analytics.overview.completedTickets}</li>
            <li>Absent Tickets: {analytics.overview.absentTickets}</li>
            <li>Cancelled Tickets: {analytics.overview.cancelledTickets}</li>
            <li>Average Completion Minutes: {analytics.overview.averageCompletionMinutes}</li>
            <li>Total Counters: {analytics.overview.totalCounters}</li>
            <li>Open Counters: {analytics.overview.openCounters}</li>
            <li>Closed Counters: {analytics.overview.closedCounters}</li>
          </ul>
        </>
      )}

      <h2>Agent Management</h2>

      <form onSubmit={handleCreateAgent} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>Full Name</label>
          <br />
          <input
            value={newAgentFullName}
            onChange={(e) => setNewAgentFullName(e.target.value)}
            placeholder="Agent full name"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Username</label>
          <br />
          <input
            value={newAgentUsername}
            onChange={(e) => setNewAgentUsername(e.target.value)}
            placeholder="Agent username"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={newAgentPassword}
            onChange={(e) => setNewAgentPassword(e.target.value)}
            placeholder="Agent password"
          />
        </div>

        <button type="submit" disabled={loadingCreateAgent}>
          {loadingCreateAgent ? "Creating..." : "Add Agent"}
        </button>
      </form>

      <p>Total Agents: {agentUsers.length}</p>

      {agentUsers.length === 0 ? (
        <p>No agents yet</p>
      ) : (
        <ul>
          {agentUsers.map((user) => (
            <li key={user.id} style={{ marginBottom: "10px" }}>
              {user.fullName} - {user.username} - {user.isActive ? "active" : "disabled"}
              <span style={{ marginLeft: "10px" }}>
                {user.isActive ? (
                  <button
                    onClick={() => handleDisableAgent(user.id)}
                    disabled={updatingUserId === user.id}
                  >
                    {updatingUserId === user.id ? "Updating..." : "Disable"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnableAgent(user.id)}
                    disabled={updatingUserId === user.id}
                  >
                    {updatingUserId === user.id ? "Updating..." : "Enable"}
                  </button>
                )}

                <button
                  onClick={() => handleDeleteAgent(user.id, user.fullName)}
                  disabled={updatingUserId === user.id}
                  style={{ marginLeft: "10px" }}
                >
                  {updatingUserId === user.id ? "Updating..." : "Delete"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>Auto-Created Agent Counters</h2>
      <p>Each new agent automatically gets a dedicated counter.</p>

      {autoCreatedAgentCounters.length === 0 ? (
        <p>No agent counters yet</p>
      ) : (
        <ul>
          {autoCreatedAgentCounters.map((counter) => (
            <li key={counter.id}>
              {counter.name} - staff: {getUserNameById(counter.currentStaffId)} - status: {counter.status}
            </li>
          ))}
        </ul>
      )}

      <h2>Admin Counter Management</h2>
      <div style={{ marginBottom: "15px" }}>
        <select
          value={selectedCounterId}
          onChange={(e) => setSelectedCounterId(e.target.value)}
        >
          <option value="">Select admin counter</option>
          {adminCounters.map((counter) => (
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

      <h2>My Admin Counter</h2>
      {myOpenCounter ? (
        <p>
          {myOpenCounter.name} - {myOpenCounter.status}
        </p>
      ) : (
        <p>No open admin counter assigned to you</p>
      )}

      <h2>Current VIP Ticket</h2>
      {currentTicket ? (
        <p>
          {currentTicket.number} - {currentTicket.status}
        </p>
      ) : (
        <p>No current VIP ticket on your counter</p>
      )}

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleCallNext}
          disabled={loadingCall || currentTicket || !myOpenCounter}
        >
          {loadingCall ? "Calling..." : "Call Next VIP Ticket"}
        </button>

        <button
          onClick={handleCompleteTicket}
          disabled={loadingComplete || !currentTicket || !myOpenCounter}
          style={{ marginLeft: "10px" }}
        >
          {loadingComplete ? "Completing..." : "Complete Current VIP Ticket"}
        </button>

        <button
          onClick={handleMarkAbsent}
          disabled={loadingAbsent || !currentTicket || !myOpenCounter}
          style={{ marginLeft: "10px" }}
        >
          {loadingAbsent ? "Marking..." : "Mark VIP Ticket Absent"}
        </button>
      </div>

      <h2>Absent VIP Tickets</h2>
      <p>Total Absent VIP Tickets: {trackAAbsentTickets.length}</p>
      {trackAAbsentTickets.length === 0 ? (
        <p>No absent VIP tickets</p>
      ) : (
        <ul>
          {trackAAbsentTickets.map((ticket) => (
            <li key={ticket.id}>
              {ticket.number} - absent
            </li>
          ))}
        </ul>
      )}

      <h2>Track A Queue (VIP)</h2>
      <p>Total Waiting VIP Tickets: {trackAWaitingTickets.length}</p>

      {trackATickets.length === 0 ? (
        <p>No VIP tickets yet</p>
      ) : (
        <ul>
          {trackATickets.map((ticket) => (
            <li key={ticket.id}>
              {ticket.number} - {ticket.status} - pos: {ticket.position ?? "-"} - counter:{" "}
              {ticket.counterId || "none"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}