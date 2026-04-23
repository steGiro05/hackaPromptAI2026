// components/EventDetailPanel.jsx

import React from 'react';
import AddToCalendarButton from './AddToCalendarButton';
import { fromUTC } from '../utils/dateUtils';

export default function EventDetailPanel({ 
  event, 
  selectedOption,
  onClose, 
  onEdit, 
  onDelete,
  position 
}) {
  if (!event) return null;

  const option = selectedOption || event.best_option || event.options?.[0];
  
  const formatDateTime = (dateStr) => {
    const date = fromUTC(dateStr);
    return date.toLocaleString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: position?.top || '50%',
        left: position?.left || '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 1000,
        width: 350,
        maxWidth: '90vw',
        overflow: 'hidden',
      }}
    >
      {/* Header colorato */}
      <div
        style={{
          background: event.eventType === 'DURATION' ? '#1976d2' 
                    : event.eventType === 'ENTIRE_DAY' ? '#388e3c' 
                    : '#f57c00',
          color: '#fff',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0, fontSize: 18, flex: 1 }}>{event.title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: 28,
              height: 28,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Badge stato */}
        <span
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            background: event.is_open ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
          }}
        >
          {event.is_open ? '🟢 Votazione aperta' : '🔴 Votazione chiusa'}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Data e ora opzione selezionata */}
        {option && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              {event.options?.length > 1 ? 'Opzione selezionata:' : 'Data e ora:'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              📅 {formatDateTime(option.start)}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              🏁 {formatDateTime(option.end)}
            </div>
          </div>
        )}

        {/* Descrizione */}
        {event.description && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Descrizione:</div>
            <div style={{ fontSize: 14, color: '#333' }}>{event.description}</div>
          </div>
        )}

        {/* Numero opzioni */}
        {event.options?.length > 1 && (
          <div style={{ 
            marginBottom: 16, 
            padding: 10, 
            background: '#f5f5f5', 
            borderRadius: 6,
            fontSize: 13,
          }}>
            📊 {event.options.length} opzioni disponibili
          </div>
        )}

        {/* Add to Calendar Button */}
        {option && (
          <div style={{ marginBottom: 16 }}>
            <AddToCalendarButton event={event} option={option} style={{ width: '100%' }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onEdit(event)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#fff',
              border: '1px solid #1976d2',
              color: '#1976d2',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ✏️ Modifica
          </button>
          <button
            onClick={() => onDelete(event.id)}
            style={{
              padding: '10px 16px',
              background: '#fff',
              border: '1px solid #d32f2f',
              color: '#d32f2f',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}