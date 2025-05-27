
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/layout/Header";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/Proposals";
import MyClients from "./pages/MyClients";
import Profile from "./pages/Profile";
import CreateProposal from "./pages/CreateProposal";
import ViewProposal from "./pages/ViewProposal";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BulkPDFGeneration from "./pages/admin/BulkPDFGeneration";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Analytics from "./pages/admin/Analytics";

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Header />
            <Toaster />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/proposals" element={<PrivateRoute><Proposals /></PrivateRoute>} />
              <Route path="/proposals/create" element={<PrivateRoute><CreateProposal /></PrivateRoute>} />
              <Route path="/proposals/:id" element={<PrivateRoute><ViewProposal /></PrivateRoute>} />
              <Route path="/clients" element={<PrivateRoute><MyClients /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/bulk-pdf-generation" element={<PrivateRoute allowedRoles={['admin']}><BulkPDFGeneration /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute allowedRoles={['admin']}><UserManagement /></PrivateRoute>} />
              <Route path="/admin/analytics" element={<PrivateRoute allowedRoles={['admin']}><Analytics /></PrivateRoute>} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </Router>
  );
}

export default App;
