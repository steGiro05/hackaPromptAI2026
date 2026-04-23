import React, { createContext, useContext, useState, useEffect } from "react";

const WebsiteContext = createContext();

export function WebsiteProvider({ children }) {
  // Stato globale: prendi da localStorage se disponibile
  const [user, setUser] = useState(() => {
    const item = localStorage.getItem("user");
    return item ? JSON.parse(item) : null;
  });
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );

  const [cachedEvents, setCachedEvents] = useState(() => {
    const item = localStorage.getItem("events");
    return item ? JSON.parse(item) : [];
  });
  const [loading, setLoading] = useState(false);

  // Salva in localStorage quando cambiano
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(cachedEvents));
  }, [cachedEvents]);

  // Auth
  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const login = ({ username, password }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === "admin" && password === "admin") {
          const fakeToken = "faketoken123";
          setUser({ username });
          setToken(fakeToken);
          resolve({ token: fakeToken, user: { username } });
        } else {
          reject(new Error("Credenziali non valide"));
        }
      }, 800);
    });
  };

  // Eventi CRUD
  const saveEventsToCache = (events) => setCachedEvents(events);

  const addEvent = (event) => {
    setCachedEvents((prev) => [...prev, event]);
  };

  const updateEvent = (updatedEvent) => {
    setCachedEvents((prev) =>
      prev.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  const deleteEvent = (eventId) => {
    setCachedEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  return (
    <WebsiteContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        cachedEvents,
        setCachedEvents,
        saveEventsToCache,
        addEvent,
        updateEvent,
        deleteEvent,
        login,
        logout,
        loading,
        setLoading,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
}

export const useWebsiteStore = () => useContext(WebsiteContext);