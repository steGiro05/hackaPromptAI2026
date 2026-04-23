import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function SlotInput({
  index,
  slot,
  type,
  hasOverlap,
  canRemove,
  onUpdate,
  onRemove,
}) {
  const isTimeBased = type === "time_based";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 10,
        padding: 10,
        border: hasOverlap ? "2px solid red" : "1px solid #ddd",
        borderRadius: 4,
        background: hasOverlap ? "#ffebee" : "#fafafa",
      }}
    >
      {/* Overlap warning */}
      {hasOverlap && (
        <span title="Questo slot si sovrappone con un altro!" style={{ color: "red" }}>
          ⚠️
        </span>
      )}

      {/* Start */}
      <div>
        <label style={{ fontSize: 12 }}>Inizio</label>
        <br />
        <DatePicker
          selected={slot.start ? new Date(slot.start) : null}
          onChange={(date) => onUpdate(index, "start", date)}
          showTimeSelect={isTimeBased}
          dateFormat={isTimeBased ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy"}
          timeFormat="HH:mm"
          timeIntervals={15}
          placeholderText={isTimeBased ? "Data e ora" : "Data"}
        />
      </div>

      {/* End */}
      <div>
        <label style={{ fontSize: 12 }}>Fine</label>
        <br />
        <DatePicker
          selected={slot.end ? new Date(slot.end) : null}
          onChange={(date) => onUpdate(index, "end", date)}
          showTimeSelect={isTimeBased}
          dateFormat={isTimeBased ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy"}
          timeFormat="HH:mm"
          timeIntervals={15}
          placeholderText={isTimeBased ? "Data e ora" : "Data"}
          minDate={slot.start ? new Date(slot.start) : null}
        />
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          style={{
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 28,
            height: 28,
            cursor: "pointer",
            fontSize: 16,
          }}
          title="Rimuovi slot"
        >
          ×
        </button>
      )}
    </div>
  );
}