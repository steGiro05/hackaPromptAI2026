import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsiteStore } from "../context/WebsiteStore";

export default function LoginPage() {
  const { login } = useWebsiteStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ username, password });
      navigate("/");
    } catch (err) {
      setError("Credenziali non valide");
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#f0f0f0"
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff",
        padding: 30,
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        width: 300
      }}>
        <h2 style={{ textAlign: "center" }}>Fake Doodle</h2>
        <div style={{ marginBottom: 15 }}>
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 5, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 5, boxSizing: "border-box" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{
          width: "100%",
          padding: 10,
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer"
        }}>
          Login
        </button>
        <p style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Credenziali: <b>admin / admin</b>
        </p>
      </form>
    </div>
  );
}