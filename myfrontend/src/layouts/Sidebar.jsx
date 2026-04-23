import React from "react";
import { Link } from "react-router-dom";
import { useWebsiteStore } from "../context/WebsiteStore";

export default function Sidebar() {
  const { logout } = useWebsiteStore();

  return (
    <aside style={{
      width: 200,
      background: "#f5f5f5",
      minHeight: "calc(100vh - 60px)",
      padding: 20,
      boxSizing: "border-box"
    }}>
      <nav>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: 15 }}>
            <Link to="/" style={{ textDecoration: "none", color: "#333" }}>
              🏠 Homepage
            </Link>
          </li>
          <li>
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#d32f2f",
                padding: 0,
                fontSize: 16
              }}
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}