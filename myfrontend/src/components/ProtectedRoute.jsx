import { Navigate } from "react-router-dom";
import { useWebsiteStore } from "../context/WebsiteStore";
import MainLayout from "../layouts/MainLayout";

export default function ProtectedRoute({ children }) {
  const { user } = useWebsiteStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrappa le pagine protette col layout
  return <MainLayout>{children}</MainLayout>;
}