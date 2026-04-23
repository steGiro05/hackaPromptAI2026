import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Crea istanza axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere token a ogni richiesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor per gestire token scaduto e refresh automatico
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se 401 e non è già un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Chiama endpoint refresh
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('token', access);

        // Riprova la richiesta originale
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fallito: logout
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH API ============
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    return response.data; // { access, refresh }
  },

  register: async (userData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },
};

// ============ EVENTS API ============
export const eventsAPI = {
  // Lista eventi dell'utente
  getAll: async () => {
    const response = await api.get('/events/');
    return response.data;
  },

  // Singolo evento
  getById: async (id) => {
    const response = await api.get(`/events/${id}/`);
    return response.data;
  },

  // Crea evento
  create: async (eventData) => {
    const response = await api.post('/events/', eventData);
    return response.data;
  },

  // Aggiorna evento
  update: async (id, eventData) => {
    const response = await api.put(`/events/${id}/`, eventData);
    return response.data;
  },

  // Elimina evento
  delete: async (id) => {
    await api.delete(`/events/${id}/`);
  },

  // Best match
  getBestMatch: async (eventId) => {
    const response = await api.get(`/events/${eventId}/best_match/`);
    return response.data;
  },

  // Invia preferenze (pubblico - no auth)
  submitPreferences: async (eventId, preferences) => {
    const response = await axios.post(
      `${API_BASE_URL}/events/${eventId}/preferences/`,
      preferences
    );
    return response.data;
  },
};

export default api;