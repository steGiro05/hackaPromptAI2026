import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import it from "date-fns/locale/it";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CreateEventModal from "../components/CreateEventModal";
import { useWebsiteStore } from "../context/WebsiteStore";
import { fromUTC } from "../utils/dateUtils";

const locales = { it };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// 🎨 Colori per gli eventi (dato che il backend non li fornisce)
const EVENT_COLORS = {
  DURATION: "#1976d2",      // Blu
  ENTIRE_DAY: "#388e3c",    // Verde
  MULTIPLE_DAYS: "#f57c00", // Arancione
  DEFAULT: "#9c27b0",       // Viola
};

// Helper per ottenere il colore basato sul tipo
const getEventColor = (eventType) => {
  return EVENT_COLORS[eventType] || EVENT_COLORS.DEFAULT;
};

export default function HomePage() {
  const { cachedEvents, addEvent, updateEvent, deleteEvent } = useWebsiteStore();

  const [showModal, setShowModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Apri modal per creazione
  const handleOpenCreate = () => {
    setEventToEdit(null);
    setShowModal(true);
  };

  // Apri modal per edit (click su evento)
  const handleSelectEvent = (calendarEvent) => {
    // L'id del calendario è "eventId-optionIndex", estraiamo l'eventId
    const eventId = calendarEvent.eventId; // ✅ Usa eventId salvato
    const originalEvent = cachedEvents.find((e) => e.id === eventId);
    if (originalEvent) {
      setEventToEdit(originalEvent);
      setShowModal(true);
    }
  };

  // Salva evento (crea o aggiorna)
  const handleSaveEvent = async (event) => {
    try {
      if (eventToEdit) {
        // ✅ Edit mode: extract ID and pass separately
        const { id, ...eventData } = event;
        await updateEvent(id, eventData);
      } else {
        // ✅ Create mode: pass whole event
        await addEvent(event);
      }
      setShowModal(false);
      setEventToEdit(null);
    } catch (err) {
      console.error("Errore salvataggio:", err);
      // L'errore viene gestito dallo store, ma puoi mostrare un toast qui
    }
  };

  // Elimina evento
  const handleDeleteEvent = (eventId) => {
    deleteEvent(eventId);
    setShowModal(false);
    setEventToEdit(null);
  };

  // Chiudi modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEventToEdit(null);
  };

  // ✅ Converti eventi per react-big-calendar (FIXED)
  const calendarEvents = cachedEvents.flatMap((event) => {
    // Gestisci caso in cui options potrebbe essere undefined o vuoto
    const options = event.options || [];
    
    return options.map((option, idx) => ({
      id: `${event.id}-${idx}`,           // ID unico per il calendario
      eventId: event.id,                   // ✅ ID originale dell'evento
      optionId: option.id,                 // ✅ ID dell'opzione
      title: event.title,
      start: fromUTC(option.start),
      end: fromUTC(option.end),
      allDay: event.event_type === "ENTIRE_DAY",  // ✅ Corretto da type a event_type
      eventType: event.event_type,         // ✅ Per il colore
      description: event.description,      // ✅ Info aggiuntiva
      isOpen: event.is_open,               // ✅ Stato dell'evento
    }));
  });

  return (
    <div style={{ height: "calc(100vh - 100px)", position: "relative" }}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={["month", "week", "day"]}
        min={new Date(1970, 1, 1, 6, 0, 0)}
        max={new Date(1970, 1, 1, 22, 0, 0)}
        step={15}
        timeslots={4}
        style={{ height: "100%" }}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: getEventColor(event.eventType),  // ✅ Colore basato su tipo
            borderRadius: "4px",
            border: event.isOpen ? "none" : "2px solid #666",  // ✅ Bordo se chiuso
            color: "#fff",
            cursor: "pointer",
            opacity: event.isOpen ? 1 : 0.7,  // ✅ Trasparenza se chiuso
          },
        })}
        // ✅ Tooltip opzionale
        tooltipAccessor={(event) => 
          `${event.title}${event.description ? `\n${event.description}` : ""}`
        }
      />

      {/* FAB + button */}
      <button
        onClick={handleOpenCreate}
        style={{
          position: "fixed",
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#1976d2",
          color: "#fff",
          fontSize: 32,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 100,
        }}
      >
        +
      </button>

      {showModal && (
        <CreateEventModal
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          eventToEdit={eventToEdit}
        />
      )}
    </div>
  );
}
