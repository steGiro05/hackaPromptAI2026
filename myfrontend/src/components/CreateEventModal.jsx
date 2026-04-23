import React, { useState, useEffect } from "react";
import SlotInput from "./SlotInput";
import ParticipantSelector from "./ParticipantSelector";
import { getRandomColor } from "../utils/colors";
import { toUTC, fromUTC, diffInMinutes, diffInDays, isInPast } from "../utils/dateUtils";
import usersData from "../data/users.json";

const MAX_SLOTS = 20;

export default function CreateEventModal({
  onClose,
  onSave,
  onDelete,
  eventToEdit,
}) {
  const isEditMode = !!eventToEdit;

  // Stato form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("time_based");
  const [durationDays, setDurationDays] = useState(1);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [slots, setSlots] = useState([{ start: null, end: null }]);
  const [color, setColor] = useState(getRandomColor());
  const [participants, setParticipants] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Popola i campi se siamo in edit mode
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || "");
      setDescription(eventToEdit.description || "");
      setType(eventToEdit.type || "time_based");
      setColor(eventToEdit.color || getRandomColor());
      setParticipants(eventToEdit.participants || []);

      if (eventToEdit.type === "entire_day") {
        setDurationDays(eventToEdit.duration || 1);
      } else {
        const totalMinutes = eventToEdit.duration || 60;
        setDurationHours(Math.floor(totalMinutes / 60));
        setDurationMinutes(totalMinutes % 60);
      }

      const localSlots = eventToEdit.slots.map((slot) => ({
        start: fromUTC(slot.start),
        end: fromUTC(slot.end),
      }));
      setSlots(localSlots);
    }
  }, [eventToEdit]);

  // Calcola durata
  const getDurationValue = () => {
    if (type === "entire_day") {
      return durationDays;
    }
    return durationHours * 60 + durationMinutes;
  };

  // Validazione singolo slot
  const validateSlot = (slot, index) => {
    const slotErrors = [];

    if (!slot.start || !slot.end) {
      slotErrors.push(`Slot ${index + 1}: Compila inizio e fine`);
      return slotErrors;
    }

    const start = new Date(slot.start);
    const end = new Date(slot.end);

    if (end <= start) {
      slotErrors.push(`Slot ${index + 1}: La fine deve essere dopo l'inizio`);
    }

    if (isInPast(start)) {
      slotErrors.push(`Slot ${index + 1}: Non puoi creare slot nel passato`);
    }

    const duration = getDurationValue();
    if (type === "time_based") {
      const slotMinutes = diffInMinutes(start, end);
      if (slotMinutes < duration) {
        slotErrors.push(
          `Slot ${index + 1}: Durata slot (${Math.round(slotMinutes)} min) inferiore alla durata evento (${duration} min)`
        );
      }
    } else {
      const slotDaysValue = diffInDays(start, end);
      if (slotDaysValue < duration) {
        slotErrors.push(
          `Slot ${index + 1}: Durata slot (${Math.round(slotDaysValue)} giorni) inferiore alla durata evento (${duration} giorni)`
        );
      }
    }

    return slotErrors;
  };

  // Trova overlaps
  const findOverlaps = () => {
    const validSlots = slots.filter((s) => s.start && s.end);
    const overlaps = new Set();

    for (let i = 0; i < validSlots.length; i++) {
      for (let j = i + 1; j < validSlots.length; j++) {
        const a = validSlots[i];
        const b = validSlots[j];
        const aStart = new Date(a.start).getTime();
        const aEnd = new Date(a.end).getTime();
        const bStart = new Date(b.start).getTime();
        const bEnd = new Date(b.end).getTime();

        if (aStart < bEnd && bStart < aEnd) {
          overlaps.add(i);
          overlaps.add(j);
        }
      }
    }
    return overlaps;
  };

  const overlaps = findOverlaps();

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) {
      alert(`Puoi aggiungere massimo ${MAX_SLOTS} slot`);
      return;
    }
    setSlots([...slots, { start: null, end: null }]);
  };

  const removeSlot = (index) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, i) => i !== index));
    }
  };

  const updateSlot = (index, field, value) => {
    const updated = [...slots];
    updated[index][field] = value;
    setSlots(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allErrors = [];

    if (!title.trim()) {
      allErrors.push("Inserisci un titolo valido");
    }

    if (type === "entire_day" && durationDays < 1) {
      allErrors.push("La durata deve essere almeno 1 giorno");
    }
    if (type === "time_based" && getDurationValue() < 1) {
      allErrors.push("La durata deve essere almeno 1 minuto");
    }

    if (slots.length > MAX_SLOTS) {
      allErrors.push(`Massimo ${MAX_SLOTS} slot consentiti`);
    }

    slots.forEach((slot, index) => {
      const slotErrors = validateSlot(slot, index);
      allErrors.push(...slotErrors);
    });

    if (overlaps.size > 0) {
      allErrors.push("Alcuni slot si sovrappongono");
    }

    // Validazione partecipanti (opzionale: richiedi almeno 1)
    if (participants.length === 0) {
      allErrors.push("Seleziona almeno un partecipante");
    }

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    let durationValue;
    let durationUnit;

    if (type === "entire_day") {
      durationValue = durationDays;
      durationUnit = "days";
    } else {
      durationValue = getDurationValue();
      durationUnit = "minutes";
    }

    const slotsUTC = slots.map((slot) => ({
      start: toUTC(slot.start),
      end: toUTC(slot.end),
    }));

    const event = {
      id: isEditMode ? eventToEdit.id : Date.now(),
      title: title.trim(),
      description: description.trim(),
      type,
      duration: durationValue,
      durationUnit,
      slots: slotsUTC,
      color,
      participants, // 👈 Array di user IDs
    };

    onSave(event);
  };

  const handleDelete = () => {
    if (onDelete && eventToEdit) {
      onDelete(eventToEdit.id);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 8,
          width: 550,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2>{isEditMode ? "Modifica Evento" : "Crea Evento"}</h2>

        {/* Errori globali */}
        {errors.length > 0 && (
          <div
            style={{
              background: "#ffebee",
              border: "1px solid #f44336",
              borderRadius: 4,
              padding: 10,
              marginBottom: 15,
            }}
          >
            <strong style={{ color: "#d32f2f" }}>Errori:</strong>
            <ul style={{ margin: "5px 0 0 0", paddingLeft: 20 }}>
              {errors.map((err, i) => (
                <li key={i} style={{ color: "#d32f2f", fontSize: 14 }}>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conferma eliminazione */}
        {showDeleteConfirm && (
          <div
            style={{
              background: "#fff3e0",
              border: "1px solid #ff9800",
              borderRadius: 4,
              padding: 15,
              marginBottom: 15,
            }}
          >
            <p style={{ margin: 0 }}>
              Sei sicuro di voler eliminare questo evento?
            </p>
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: "8px 16px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Sì, elimina
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Titolo */}
          <div style={{ marginBottom: 15 }}>
            <label>Titolo *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
              required
            />
          </div>

          {/* Descrizione */}
          <div style={{ marginBottom: 15 }}>
            <label>Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
              rows={3}
            />
          </div>

          {/* Tipo evento */}
          <div style={{ marginBottom: 15 }}>
            <label>Tipo evento *</label>
            <div>
              <label style={{ marginRight: 20 }}>
                <input
                  type="radio"
                  value="time_based"
                  checked={type === "time_based"}
                  onChange={() => setType("time_based")}
                />
                Time Based (orario)
              </label>
              <label>
                <input
                  type="radio"
                  value="entire_day"
                  checked={type === "entire_day"}
                  onChange={() => setType("entire_day")}
                />
                Entire Day (giornata intera)
              </label>
            </div>
          </div>

          {/* Durata */}
          <div style={{ marginBottom: 15 }}>
            <label>Durata *</label>

            {type === "entire_day" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 5,
                }}
              >
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) =>
                    setDurationDays(Math.max(1, Number(e.target.value)))
                  }
                  style={{ width: 80, padding: 8 }}
                />
                <span>giorni</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 5,
                }}
              >
                <input
                  type="number"
                  min={0}
                  value={durationHours}
                  onChange={(e) =>
                    setDurationHours(Math.max(0, Number(e.target.value)))
                  }
                  style={{ width: 70, padding: 8 }}
                />
                <span>ore</span>

                <input
                  type="number"
                  min={0}
                  max={59}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(
                      Math.min(59, Math.max(0, Number(e.target.value)))
                    )
                  }
                  style={{ width: 70, padding: 8 }}
                />
                <span>minuti</span>
              </div>
            )}
          </div>

          {/* Colore */}
          <div style={{ marginBottom: 15 }}>
            <label>Colore evento</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 5,
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 50,
                  height: 35,
                  padding: 0,
                  border: "none",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: 14, color: "#666" }}>{color}</span>
            </div>
          </div>

          {/* Partecipanti */}
          <div style={{ marginBottom: 15 }}>
            <label>Partecipanti *</label>
            <div style={{ marginTop: 5 }}>
              <ParticipantSelector
                users={usersData}
                selectedIds={participants}
                onChange={setParticipants}
              />
            </div>
          </div>

          {/* Slots */}
          <div style={{ marginBottom: 15 }}>
            <label>
              Slot disponibili * ({slots.length}/{MAX_SLOTS})
            </label>
            {slots.map((slot, index) => (
              <SlotInput
                key={index}
                index={index}
                slot={slot}
                type={type}
                hasOverlap={overlaps.has(index)}
                canRemove={slots.length > 1}
                onUpdate={updateSlot}
                onRemove={removeSlot}
              />
            ))}
            <button
              type="button"
              onClick={addSlot}
              disabled={slots.length >= MAX_SLOTS}
              style={{
                marginTop: 10,
                padding: "8px 16px",
                cursor: slots.length >= MAX_SLOTS ? "not-allowed" : "pointer",
                opacity: slots.length >= MAX_SLOTS ? 0.5 : 1,
              }}
            >
              + Aggiungi Slot
            </button>
          </div>

          {/* Azioni */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {isEditMode ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: "10px 20px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                🗑️ Elimina
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: "10px 20px", cursor: "pointer" }}
              >
                Annulla
              </button>
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {isEditMode ? "Salva modifiche" : "Crea"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}