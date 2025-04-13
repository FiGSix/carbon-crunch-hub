
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/auth/PrivateRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/Proposals";
import CreateProposal from "./pages/CreateProposal";
import ViewProposal from "./pages/ViewProposal";
import NotFound from "./pages/NotFound";
import Agents from "./pages/Agents";
import About from "./pages/About";
import Calculator from "./pages/Calculator";
import Contact from "./pages/Contact";
import ForceLogout from "./pages/ForceLogout";
import TestInvitations from "./pages/TestInvitations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/about" element={<About />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/force-logout" element={<ForceLogout />} />
            <Route path="/proposals/view" element={<ViewProposal />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/proposals" element={
              <PrivateRoute>
                <Proposals />
              </PrivateRoute>
            } />
            <Route path="/proposals/new" element={
              <PrivateRoute>
                <CreateProposal />
              </PrivateRoute>
            } />
            <Route path="/proposals/:id" element={
              <PrivateRoute>
                <ViewProposal />
              </PrivateRoute>
            } />
            <Route path="/test-invitations" element={
              <PrivateRoute>
                <TestInvitations />
              </PrivateRoute>
            } />
            
            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
