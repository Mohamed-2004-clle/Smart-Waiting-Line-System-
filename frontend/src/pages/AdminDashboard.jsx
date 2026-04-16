import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardAnalytics } from "../services/analyticsService";
import { getQueueStatusByTrack } from "../services/trackingService";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [trackAStatus, setTrackAStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("user"));
  const tenantId = savedUser?.tenantId || "tenant-001";

  const loadData = async () => {
    try {
      const [analyticsResult, queueResult] = await Promise.all([
        getDashboardAnalytics(tenantId),
        getQueueStatusByTrack(tenantId, "A")
      ]);

      setAnalytics(analyticsResult.data);
      setTrackAStatus(queueResult.data);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      alert(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
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

    if (savedUser.role !== "admin" && savedUser.role !== "manager") {
      navigate("/staff/dashboard");
      return;
    }

    loadData();
  }, []);

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
          <h2>Overview</h2>
          <ul>
            <li>Total Tickets: {analytics.overview.totalTickets}</li>
            <li>Waiting Tickets: {analytics.overview.waitingTickets}</li>
            <li>Called Tickets: {analytics.overview.calledTickets}</li>
            <li>Completed Tickets: {analytics.overview.completedTickets}</li>
            <li>Average Completion Minutes: {analytics.overview.averageCompletionMinutes}</li>
          </ul>
        </>
      )}

      {trackAStatus && (
        <>
          <h2>Track A Queue</h2>
          <p>Total Waiting: {trackAStatus.waitingTickets}</p>
          <ul>
            {trackAStatus.queue.map((ticket) => (
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