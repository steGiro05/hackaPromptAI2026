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
    // Trova l'evento originale dall'id
    const eventId = calendarEvent.id.toString().split("-")[0];
    const originalEvent = cachedEvents.find(
      (e) => e.id.toString() === eventId
    );
    if (originalEvent) {
      setEventToEdit(originalEvent);
      setShowModal(true);
    }
  };

  // Salva evento (crea o aggiorna)
  const handleSaveEvent = (event) => {
    if (eventToEdit) {
      updateEvent(event);
    } else {
      addEvent(event);
    }
    setShowModal(false);
    setEventToEdit(null);
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

  // Converti eventi per react-big-calendar
  const calendarEvents = cachedEvents.flatMap((event) =>
    event.slots.map((slot, idx) => ({
      id: `${event.id}-${idx}`,
      title: event.title,
      start: fromUTC(slot.start),
      end: fromUTC(slot.end),
      allDay: event.type === "entire_day",
      color: event.color,
    }))
  );

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
        onSelectEvent={handleSelectEvent} // 👈 Click su evento
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.color || "#1976d2",
            borderRadius: "4px",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          },
        })}
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