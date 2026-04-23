// src/context/WebsiteStore.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, eventsAPI } from "../services/api";

const WebsiteContext = createContext();

export function WebsiteProvider({ children }) {
  // ============ AUTH STATE ============
  const [user, setUser] = useState(() => {
    const item = localStorage.getItem("user");
    return item ? JSON.parse(item) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );

  const [refreshToken, setRefreshToken] = useState(
    () => localStorage.getItem("refreshToken") || null
  );

  // ============ EVENTS STATE ============
  const [cachedEvents, setCachedEvents] = useState(() => {
    const item = localStorage.getItem("events");
    return item ? JSON.parse(item) : [];
  });

  // ============ UI STATE ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============ PERSIST TO LOCALSTORAGE ============
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    else localStorage.removeItem("refreshToken");
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(cachedEvents));
  }, [cachedEvents]);

  // ============ EVENTS METHODS ============
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const events = await eventsAPI.getAll();
      setCachedEvents(events);
      return events;
    } catch (err) {
      console.error("Errore fetch eventi:", err);
      // NON lanciare errore qui, solo log
      setCachedEvents([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ============ AUTH METHODS - FIX ============
  const login = useCallback(async ({ username, password }) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Ottieni tokens dal backend
      const tokens = await authAPI.login(username, password);
      
      // 2. Salva tokens
      setToken(tokens.access);
      setRefreshToken(tokens.refresh);
      
      // 3. Salva user
      setUser({ username });

      // 4. Fetch eventi (non blocca il login se fallisce)
      try {
        await fetchEvents();
      } catch (fetchErr) {
        console.warn("Eventi non caricati:", fetchErr);
        // Non bloccare il login per questo
      }

      return { success: true };
      
    } catch (err) {
      // Estrai messaggio errore dal backend
      let message = "Credenziali non valide";
      
      if (err.response?.data) {
        // Django JWT restituisce { detail: "..." }
        message = err.response.data.detail || 
                  err.response.data.message ||
                  err.response.data.non_field_errors?.[0] ||
                  "Errore di autenticazione";
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
      
      // IMPORTANTE: lancia errore per il catch nel componente
      throw new Error(message);
      
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setCachedEvents([]);
    setError(null);
    localStorage.clear();
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!token && !!user;
  }, [token, user]);

  // ============ OTHER EVENTS METHODS ============
  const getEvent = useCallback(async (id) => {
    setLoading(true);
    try {
      const event = await eventsAPI.getById(id);
      return event;
    } catch (err) {
      setError("Evento non trovato");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError(null);
    try {
      const newEvent = await eventsAPI.create(eventData);
      setCachedEvents((prev) => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      const message = err.response?.data?.detail || "Errore creazione evento";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEvent = useCallback(async (id, eventData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedEvent = await eventsAPI.update(id, eventData);
      setCachedEvents((prev) =>
        prev.map((event) => (event.id === id ? updatedEvent : event))
      );
      return updatedEvent;
    } catch (err) {
      const message = err.response?.data?.detail || "Errore aggiornamento evento";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEvent = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await eventsAPI.delete(id);
      setCachedEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      const message = err.response?.data?.detail || "Errore eliminazione evento";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBestMatch = useCallback(async (eventId) => {
    try {
      return await eventsAPI.getBestMatch(eventId);
    } catch (err) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }, []);

  const submitPreferences = useCallback(async (eventId, preferences) => {
    setLoading(true);
    try {
      return await eventsAPI.submitPreferences(eventId, preferences);
    } catch (err) {
      setError("Errore invio preferenze");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ============ CONTEXT VALUE ============
  const value = {
    // Auth
    user,
    token,
    login,
    logout,
    isAuthenticated,

    // Events
    cachedEvents,
    fetchEvents,
    getEvent,
    addEvent,
    updateEvent,
    deleteEvent,
    getBestMatch,
    submitPreferences,

    // UI State
    loading,
    error,
    clearError,
    setLoading,
  };

  return (
    <WebsiteContext.Provider value={value}>
      {children}
    </WebsiteContext.Provider>
  );
}

export const useWebsiteStore = () => {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error("useWebsiteStore must be used within WebsiteProvider");
  }
  return context;
};
