import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { QueryClient } from "react-query";
import { Header } from "./components/layout/Header";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/Proposals";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import CreateProposal from "./pages/CreateProposal";
import ViewProposal from "./pages/ViewProposal";
import PrivateRoute from "./components/auth/PrivateRoute";
import PublicRoute from "./components/auth/PublicRoute";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Invitation from "./pages/Invitation";
import BulkPDFGeneration from "./pages/admin/BulkPDFGeneration";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <AuthProvider>
          <QueryClient>
            <Header />
            <Toaster />
            <Routes>
              <Route path="/" element={<PublicRoute><SignIn /></PublicRoute>} />
              <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/proposals" element={<PrivateRoute><Proposals /></PrivateRoute>} />
              <Route path="/proposals/create" element={<PrivateRoute><CreateProposal /></PrivateRoute>} />
              <Route path="/proposals/:id" element={<PrivateRoute><ViewProposal /></PrivateRoute>} />
              <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/invitation/:token" element={<PublicRoute><Invitation /></PublicRoute>} />
              <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/bulk-pdf-generation" element={<PrivateRoute><BulkPDFGeneration /></PrivateRoute>} />
            </Routes>
          </QueryClient>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
