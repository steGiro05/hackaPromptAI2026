import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProtectedRoute from "./components/ProtectedRoute";
import { WebsiteProvider } from "./context/WebsiteStore";

function App() {
  return (
    <WebsiteProvider>
      <Router>
        <Routes>  
          <Route path="/login" element={<LoginPage />} />
          {/* Rotta protetta: Homepage */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </WebsiteProvider>
  );
}

export default App;