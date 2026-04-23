import React from "react";

export default function Header() {
  return (
    <header style={{
      height: 60,
      background: "#1976d2",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      paddingLeft: 20,
      fontFamily: "sans-serif"
    }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Fake Doodle</h1>
    </header>
  );
}