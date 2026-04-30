import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { motion, AnimatePresence } from "framer-motion";

const clearInvalidAuthState = () => {
  try {
    const rawUser = localStorage.getItem("user");
    const rawToken = localStorage.getItem("token");
    if (rawUser) {
      JSON.parse(rawUser);
    }
    if (rawToken && typeof rawToken !== "string") {
      localStorage.removeItem("token");
    }
  } catch (error) {
    console.error("Invalid auth state in localStorage:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const floatingOrbs = [
  { size: 320, x: "-10%", y: "-15%", color: "rgba(59,130,246,0.15)", duration: 8 },
  { size: 240, x: "70%", y: "60%", color: "rgba(139,92,246,0.12)", duration: 11 },
  { size: 180, x: "80%", y: "5%", color: "rgba(34,211,238,0.10)", duration: 9 },
  { size: 200, x: "5%", y: "70%", color: "rgba(99,102,241,0.10)", duration: 13 },
];

export default function StaffLoginPage() {
  const [tenantId, setTenantId] = useState("tenant-001");
  const [username, setUsername] = useState("agent");
  const [password, setPassword] = useState("agent123");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    clearInvalidAuthState();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const result = await login({ tenantId, username, password });
      localStorage.setItem("user", JSON.stringify(result.data.user));
      localStorage.setItem("token", result.data.token);
      if (result.data.user.role === "admin") {
        navigate("/admin");
        return;
      }
      if (result.data.user.role === "agent") {
        navigate("/staff/dashboard");
        return;
      }
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0e1a 0%, #0d1224 40%, #0a0e1a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Sora', 'Inter', sans-serif",
      }}
    >
      {/* Floating background orbs */}
      {floatingOrbs.map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            pointerEvents: "none",
            filter: "blur(40px)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "40px 36px 36px",
          boxShadow:
            "0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 2,
            background: "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
            borderRadius: 2,
          }}
        />

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Logo / Icon */}
          <motion.div variants={itemVariants} style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", position: "relative", alignItems: "center", justifyContent: "center" }}>
              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "2px solid rgba(59,130,246,0.5)",
                }}
              />
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="white"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>

            <motion.h1
              style={{
                margin: "16px 0 4px",
                fontSize: 22,
                fontWeight: 700,
                color: "#f1f5f9",
                letterSpacing: "-0.3px",
              }}
            >
              Staff Portal
            </motion.h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(148,163,184,0.8)" }}>
              Sign in to your workspace
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Tenant ID */}
            <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(148,163,184,0.9)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Tenant ID
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: focusedField === "tenant" ? "#60a5fa" : "rgba(100,116,139,0.7)",
                    transition: "color 0.2s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                  </svg>
                </span>
                <input
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  onFocus={() => setFocusedField("tenant")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${focusedField === "tenant" ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 12,
                    padding: "12px 14px 12px 42px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: focusedField === "tenant" ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                  }}
                />
              </div>
            </motion.div>

            {/* Username */}
            <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(148,163,184,0.9)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: focusedField === "username" ? "#60a5fa" : "rgba(100,116,139,0.7)",
                    transition: "color 0.2s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${focusedField === "username" ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 12,
                    padding: "12px 14px 12px 42px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: focusedField === "username" ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                  }}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(148,163,184,0.9)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: focusedField === "password" ? "#60a5fa" : "rgba(100,116,139,0.7)",
                    transition: "color 0.2s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${focusedField === "password" ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 12,
                    padding: "12px 14px 12px 42px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: focusedField === "password" ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                  }}
                />
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{
                  width: "100%",
                  padding: "13px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: loading
                    ? "rgba(59,130,246,0.4)"
                    : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.01em",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(59,130,246,0.35)",
                  transition: "background 0.3s, box-shadow 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                        }}
                      />
                      Signing in...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                      </svg>
                      Sign In
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            style={{
              textAlign: "center",
              marginTop: 24,
              marginBottom: 0,
              fontSize: 12,
              color: "rgba(100,116,139,0.6)",
            }}
          >
            Smart Queue Management System
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}