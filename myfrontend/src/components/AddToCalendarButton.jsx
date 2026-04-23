// components/AddToCalendarButton.jsx

import React, { useState } from 'react';
import {
  generateGoogleCalendarLink,
  generateOutlookCalendarLink,
  generateYahooCalendarLink,
} from '../utils/calendarExport';

export default function AddToCalendarButton({ event, option }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const calendars = [
    {
      name: 'Google Calendar',
      icon: '📅',
      getLink: () => generateGoogleCalendarLink(event, option),
    },
    {
      name: 'Outlook',
      icon: '📧',
      getLink: () => generateOutlookCalendarLink(event, option),
    },
    {
      name: 'Yahoo',
      icon: '🟣',
      getLink: () => generateYahooCalendarLink(event, option),
    },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          padding: '8px 16px',
          background: '#4285f4',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        📅 Aggiungi al Calendario
        <span style={{ fontSize: 12 }}>▼</span>
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 180,
          }}
        >
          {calendars.map((cal) => (
            <a
              key={cal.name}
              href={cal.getLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowDropdown(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 15px',
                textDecoration: 'none',
                color: '#333',
                borderBottom: '1px solid #eee',
              }}
            >
              <span>{cal.icon}</span>
              <span>{cal.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}