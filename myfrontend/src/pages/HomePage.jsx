// pages/HomePage.jsx

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import it from "date-fns/locale/it";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CreateEventModal from "../components/CreateEventModal";
import EventDetailPanel from "../components/EventDetailPanel";
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

const EVENT_COLORS = {
  DURATION: "#1976d2",
  ENTIRE_DAY: "#388e3c",
  MULTIPLE_DAYS: "#f57c00",
  DEFAULT: "#9c27b0",
};

const getEventColor = (eventType) => {
  return EVENT_COLORS[eventType] || EVENT_COLORS.DEFAULT;
};

export default function HomePage() {
  const { cachedEvents, addEvent, updateEvent, deleteEvent } = useWebsiteStore();

  const [showModal, setShowModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  
  // ✅ NUOVO: stato per il pannello dettaglio
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [panelPosition, setPanelPosition] = useState(null);

  // Apri modal per creazione
  const handleOpenCreate = () => {
    setSelectedEvent(null); // Chiudi detail panel
    setEventToEdit(null);
    setShowModal(true);
  };

  // ✅ Click su evento → mostra pannello dettaglio
  const handleSelectEvent = (calendarEvent, e) => {
    const eventId = calendarEvent.eventId;
    const originalEvent = cachedEvents.find((ev) => ev.id === eventId);
    
    if (originalEvent) {
      // Trova l'opzione selezionata
      const optionIndex = parseInt(calendarEvent.id.split('-').pop());
      const option = originalEvent.options?.[optionIndex];
      
      // Posizione del pannello vicino al click
      const rect = e?.target?.getBoundingClientRect?.();
      if (rect) {
        setPanelPosition({
          top: Math.min(rect.top, window.innerHeight - 400),
          left: Math.min(rect.right + 10, window.innerWidth - 370),
        });
      } else {
        setPanelPosition(null);
      }
      
      setSelectedEvent(originalEvent);
      setSelectedOption(option);
    }
  };

  // Chiudi pannello dettaglio
  const handleCloseDetail = () => {
    setSelectedEvent(null);
    setSelectedOption(null);
    setPanelPosition(null);
  };

  // Apri modal edit dal pannello dettaglio
  const handleEditFromDetail = (event) => {
    setSelectedEvent(null);
    setEventToEdit(event);
    setShowModal(true);
  };

  // Salva evento
  const handleSaveEvent = async (event) => {
    try {
      if (eventToEdit) {
        const { id, ...eventData } = event;
        await updateEvent(id, eventData);
      } else {
        await addEvent(event);
      }
      setShowModal(false);
      setEventToEdit(null);
    } catch (err) {
      console.error("Errore salvataggio:", err);
    }
  };

  // Elimina evento
  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setShowModal(false);
      setEventToEdit(null);
      setSelectedEvent(null);
    } catch (err) {
      console.error("Errore eliminazione:", err);
    }
  };

  // Chiudi modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEventToEdit(null);
  };

  // Converti eventi per react-big-calendar
  const calendarEvents = cachedEvents.flatMap((event) => {
    const options = event.options || [];
    
    return options.map((option, idx) => ({
      id: `${event.id}-${idx}`,
      eventId: event.id,
      optionId: option.id,
      title: event.title,
      start: fromUTC(option.start),
      end: fromUTC(option.end),
      allDay: event.event_type === "ENTIRE_DAY",
      eventType: event.event_type,
      description: event.description,
      isOpen: event.is_open,
    }));
  });

  return (
    <div style={{ height: "calc(100vh - 100px)", position: "relative" }}>
      {/* Overlay per chiudere il pannello quando si clicca fuori */}
      {selectedEvent && (
        <div
          onClick={handleCloseDetail}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
        />
      )}

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
            backgroundColor: getEventColor(event.eventType),
            borderRadius: "4px",
            border: event.isOpen ? "none" : "2px solid #666",
            color: "#fff",
            cursor: "pointer",
            opacity: event.isOpen ? 1 : 0.7,
          },
        })}
        tooltipAccessor={(event) =>
          `${event.title}${event.description ? `\n${event.description}` : ""}`
        }
      />

      {/* ✅ Pannello dettaglio evento */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          selectedOption={selectedOption}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteEvent}
          position={panelPosition}
        />
      )}

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