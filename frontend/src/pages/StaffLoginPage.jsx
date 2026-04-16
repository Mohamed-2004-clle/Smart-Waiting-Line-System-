import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

export default function StaffLoginPage() {
  const [tenantId, setTenantId] = useState("tenant-001");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    setLoading(true);

    const result = await login({
      tenantId,
      username,
      password
    });

    localStorage.setItem("user", JSON.stringify(result.data.user));
    localStorage.setItem("token", result.data.token);

    if (result.data.user.role === "admin" || result.data.user.role === "staff") {
      navigate("/staff/dashboard");
    } else {
      navigate("/");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert(error.response?.data?.message || "Login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ padding: "20px" }}>
      <h1>Staff Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label>Tenant ID</label>
          <br />
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <label>Username</label>
          <br />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: "15px" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}