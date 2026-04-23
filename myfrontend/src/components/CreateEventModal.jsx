import React, { useState, useEffect } from "react";
import SlotInput from "./SlotInput";
import ParticipantSelector from "./ParticipantSelector";
import { toUTC, fromUTC, isInPast } from "../utils/dateUtils";
import usersData from "../data/users.json";

const MAX_OPTIONS = 20;

// ✅ Backend event types
const EVENT_TYPES = {
  DURATION: "DURATION",
  ENTIRE_DAY: "ENTIRE_DAY",
  MULTIPLE_DAYS: "MULTIPLE_DAYS",
};

const EVENT_TYPE_LABELS = {
  DURATION: "Fascia oraria",
  ENTIRE_DAY: "Giornata intera",
  MULTIPLE_DAYS: "Più giorni",
};

export default function CreateEventModal({
  onClose,
  onSave,
  onDelete,
  eventToEdit,
}) {
  const isEditMode = !!eventToEdit;

  // ✅ Stato form allineato al backend
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES.DURATION); // ✅ Rinominato
  const [deadline, setDeadline] = useState(""); // ✅ NUOVO
  const [options, setOptions] = useState([{ start: null, end: null }]); // ✅ Rinominato da slots
  const [participants, setParticipants] = useState([]); // Se il backend lo supporta
  const [errors, setErrors] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ✅ Popola i campi se siamo in edit mode
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || "");
      setDescription(eventToEdit.description || "");
      setEventType(eventToEdit.event_type || EVENT_TYPES.DURATION);
      
      // Deadline: converto da UTC a local datetime-local format
      if (eventToEdit.deadline) {
        const deadlineLocal = fromUTC(eventToEdit.deadline);
        // Format per input datetime-local: "YYYY-MM-DDTHH:mm"
        setDeadline(formatForDatetimeLocal(deadlineLocal));
      }

      // Options (ex slots)
      if (eventToEdit.options && eventToEdit.options.length > 0) {
        const localOptions = eventToEdit.options.map((option) => ({
          id: option.id, // ✅ Mantieni l'ID per update
          start: fromUTC(option.start),
          end: fromUTC(option.end),
        }));
        setOptions(localOptions);
      }

      // Participants se presenti
      if (eventToEdit.participants) {
        setParticipants(eventToEdit.participants);
      }
    }
  }, [eventToEdit]);

  // Helper per formattare data per input datetime-local
  const formatForDatetimeLocal = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper per default deadline (es. +7 giorni)
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatForDatetimeLocal(d);
  };

  // Set default deadline al mount se non in edit mode
  useEffect(() => {
    if (!isEditMode && !deadline) {
      setDeadline(getDefaultDeadline());
    }
  }, [isEditMode]);

  // ✅ Validazione singola option
  const validateOption = (option, index) => {
    const optionErrors = [];

    if (!option.start || !option.end) {
      optionErrors.push(`Opzione ${index + 1}: Compila inizio e fine`);
      return optionErrors;
    }

    const start = new Date(option.start);
    const end = new Date(option.end);

    if (end <= start) {
      optionErrors.push(`Opzione ${index + 1}: La fine deve essere dopo l'inizio`);
    }

    if (isInPast(start)) {
      optionErrors.push(`Opzione ${index + 1}: Non puoi creare opzioni nel passato`);
    }

    // Validazione specifica per tipo
    if (eventType === EVENT_TYPES.ENTIRE_DAY) {
      // Per ENTIRE_DAY, start e end dovrebbero essere date intere
      // Qui potresti aggiungere validazione specifica
    }

    return optionErrors;
  };

  // Trova overlaps
  const findOverlaps = () => {
    const validOptions = options.filter((o) => o.start && o.end);
    const overlaps = new Set();

    for (let i = 0; i < validOptions.length; i++) {
      for (let j = i + 1; j < validOptions.length; j++) {
        const a = validOptions[i];
        const b = validOptions[j];
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

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) {
      alert(`Puoi aggiungere massimo ${MAX_OPTIONS} opzioni`);
      return;
    }
    setOptions([...options, { start: null, end: null }]);
  };

  const removeOption = (index) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, field, value) => {
    const updated = [...options];
    updated[index][field] = value;
    setOptions(updated);
  };

  // ✅ Submit allineato al backend
  const handleSubmit = (e) => {
    e.preventDefault();
    const allErrors = [];

    // Validazione titolo
    if (!title.trim()) {
      allErrors.push("Inserisci un titolo valido");
    }

    // Validazione deadline
    if (!deadline) {
      allErrors.push("Inserisci una deadline");
    } else {
      const deadlineDate = new Date(deadline);
      if (isInPast(deadlineDate)) {
        allErrors.push("La deadline non può essere nel passato");
      }
    }

    // Validazione numero opzioni
    if (options.length > MAX_OPTIONS) {
      allErrors.push(`Massimo ${MAX_OPTIONS} opzioni consentite`);
    }

    if (options.length === 0) {
      allErrors.push("Aggiungi almeno un'opzione");
    }

    // Validazione ogni opzione
    options.forEach((option, index) => {
      const optionErrors = validateOption(option, index);
      allErrors.push(...optionErrors);
    });

    // Validazione overlaps
    if (overlaps.size > 0) {
      allErrors.push("Alcune opzioni si sovrappongono");
    }

    // Validazione partecipanti (se richiesto dal backend)
    // if (participants.length === 0) {
    //   allErrors.push("Seleziona almeno un partecipante");
    // }

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    // ✅ Costruisci oggetto evento per il backend
    const optionsUTC = options.map((option) => ({
      ...(option.id && { id: option.id }), // Includi ID solo se esiste (edit mode)
      start: toUTC(option.start),
      end: toUTC(option.end),
    }));

    const event = {
      // In edit mode, includi l'ID
      ...(isEditMode && { id: eventToEdit.id }),
      
      // ✅ Campi allineati al backend
      title: title.trim(),
      description: description.trim(),
      event_type: eventType,
      deadline: toUTC(new Date(deadline)),
      options: optionsUTC,
      
      // Se il backend supporta i partecipanti
      // participants: participants,
    };

    console.log("📤 Saving event:", event); // Debug
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

        {/* Info evento se in edit mode */}
        {isEditMode && eventToEdit && (
          <div
            style={{
              background: "#e3f2fd",
              padding: 10,
              borderRadius: 4,
              marginBottom: 15,
              fontSize: 14,
            }}
          >
            <div>
              <strong>Stato:</strong>{" "}
              <span style={{ color: eventToEdit.is_open ? "#388e3c" : "#d32f2f" }}>
                {eventToEdit.is_open ? "🟢 Aperto" : "🔴 Chiuso"}
              </span>
            </div>
            {eventToEdit.best_option && (
              <div style={{ marginTop: 5 }}>
                <strong>Opzione migliore:</strong>{" "}
                {new Date(eventToEdit.best_option.start).toLocaleString("it-IT")}
              </div>
            )}
          </div>
        )}

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

          {/* ✅ Tipo evento (con valori backend) */}
          <div style={{ marginBottom: 15 }}>
            <label>Tipo evento *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 5 }}>
              {Object.entries(EVENT_TYPES).map(([key, value]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    value={value}
                    checked={eventType === value}
                    onChange={() => setEventType(value)}
                  />
                  {EVENT_TYPE_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          {/* ✅ Deadline (NUOVO) */}
          <div style={{ marginBottom: 15 }}>
            <label>Deadline votazione *</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ width: "100%", padding: 8, boxSizing: "border-box", marginTop: 5 }}
              required
            />
            <small style={{ color: "#666" }}>
              I partecipanti devono votare entro questa data
            </small>
          </div>

          {/* Partecipanti (se supportato dal backend) */}
          {/* 
          <div style={{ marginBottom: 15 }}>
            <label>Partecipanti</label>
            <div style={{ marginTop: 5 }}>
              <ParticipantSelector
                users={usersData}
                selectedIds={participants}
                onChange={setParticipants}
              />
            </div>
          </div>
          */}

          {/* ✅ Options (ex Slots) */}
          <div style={{ marginBottom: 15 }}>
            <label>
              Opzioni disponibili * ({options.length}/{MAX_OPTIONS})
            </label>
            <small style={{ display: "block", color: "#666", marginBottom: 10 }}>
              Aggiungi le fasce orarie/date tra cui i partecipanti potranno scegliere
            </small>
            
            {options.map((option, index) => (
              <SlotInput
                key={index}
                index={index}
                slot={option}  // SlotInput usa ancora "slot" internamente
                type={eventType === EVENT_TYPES.ENTIRE_DAY ? "entire_day" : "time_based"}
                hasOverlap={overlaps.has(index)}
                canRemove={options.length > 1}
                onUpdate={updateOption}
                onRemove={removeOption}
              />
            ))}
            
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= MAX_OPTIONS}
              style={{
                marginTop: 10,
                padding: "8px 16px",
                cursor: options.length >= MAX_OPTIONS ? "not-allowed" : "pointer",
                opacity: options.length >= MAX_OPTIONS ? 0.5 : 1,
              }}
            >
              + Aggiungi Opzione
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