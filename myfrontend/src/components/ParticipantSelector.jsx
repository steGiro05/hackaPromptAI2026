import React, { useState } from "react";

export default function ParticipantSelector({
  users,
  selectedIds,
  onChange,
}) {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (userId) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const handleSelectAll = () => {
    onChange(users.map((u) => u.id));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  return (
    <div>
      {/* Ricerca */}
      <input
        type="text"
        placeholder="🔍 Cerca partecipanti..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 10,
          boxSizing: "border-box",
          border: "1px solid #ddd",
          borderRadius: 4,
        }}
      />

      {/* Azioni rapide */}
      <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={handleSelectAll}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            background: "#e3f2fd",
            border: "1px solid #1976d2",
            borderRadius: 4,
          }}
        >
          Seleziona tutti
        </button>
        <button
          type="button"
          onClick={handleDeselectAll}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            background: "#ffebee",
            border: "1px solid #d32f2f",
            borderRadius: 4,
          }}
        >
          Deseleziona tutti
        </button>
      </div>

      {/* Partecipanti selezionati */}
      {selectedUsers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
            padding: 10,
            background: "#e8f5e9",
            borderRadius: 4,
          }}
        >
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#fff",
                padding: "4px 8px",
                borderRadius: 20,
                fontSize: 12,
                border: "1px solid #4caf50",
              }}
            >
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 20, height: 20, borderRadius: "50%" }}
              />
              {user.name}
              <button
                type="button"
                onClick={() => handleToggle(user.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#d32f2f",
                  fontSize: 14,
                  padding: 0,
                  marginLeft: 2,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Lista utenti */}
      <div
        style={{
          maxHeight: 200,
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: 4,
        }}
      >
        {filteredUsers.length === 0 ? (
          <div style={{ padding: 15, textAlign: "center", color: "#999" }}>
            Nessun utente trovato
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedIds.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => handleToggle(user.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  cursor: "pointer",
                  background: isSelected ? "#e3f2fd" : "#fff",
                  borderBottom: "1px solid #eee",
                  transition: "background 0.2s",
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ cursor: "pointer" }}
                />

                {/* Avatar */}
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: isSelected ? "2px solid #1976d2" : "2px solid #ddd",
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{user.email}</div>
                </div>

                {/* Indicatore selezione */}
                {isSelected && (
                  <span style={{ color: "#1976d2", fontSize: 18 }}>✓</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contatore */}
      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        {selectedIds.length} partecipant{selectedIds.length === 1 ? "e" : "i"} selezionat{selectedIds.length === 1 ? "o" : "i"}
      </div>
    </div>
  );
}