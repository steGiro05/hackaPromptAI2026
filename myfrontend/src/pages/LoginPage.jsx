// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsiteStore } from "../context/WebsiteStore";

export default function LoginPage() {
  const { login, loading } = useWebsiteStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();  // Previene il refresh
    e.stopPropagation(); // Extra sicurezza
    
    setError("");

    // Validazione
    if (!username.trim() || !password.trim()) {
      setError("Inserisci username e password");
      return;
    }

    try {
      await login({ username, password });
      navigate("/");
    } catch (err) {
      // Mostra errore specifico dal backend o generico
      setError(err.message || "Credenziali non valide");
      console.error("Login error:", err);
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
        <h2 style={{ textAlign: "center" }}>🗓️ Fake Doodle</h2>
        
        <div style={{ marginBottom: 15 }}>
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            style={{ width: "100%", padding: 8, marginTop: 5, boxSizing: "border-box" }}
          />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ width: "100%", padding: 8, marginTop: 5, boxSizing: "border-box" }}
          />
        </div>
        
        {error && (
          <div style={{ 
            color: "#d32f2f", 
            background: "#ffebee",
            padding: 10,
            borderRadius: 4,
            marginBottom: 15,
            fontSize: 14,
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: loading ? "#90caf9" : "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Accesso..." : "Login"}
        </button>
        
        <p style={{ fontSize: 12, textAlign: "center", marginTop: 10, color: "#666" }}>
          Usa le credenziali del superuser Django
        </p>
      </form>
    </div>
  );
}