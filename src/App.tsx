
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/Proposals";
import CreateProposal from "./pages/CreateProposal";
import ViewProposal from "./pages/ViewProposal";
import Profile from "./pages/Profile";
import Calculator from "./pages/Calculator";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Agents from "./pages/Agents";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import ForceLogout from "./pages/ForceLogout";
import MyClients from "./pages/MyClients";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/force-logout" element={<ForceLogout />} />
              
              {/* Protected Routes */}
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
              <Route path="/proposals/create" element={
                <PrivateRoute>
                  <CreateProposal />
                </PrivateRoute>
              } />
              <Route path="/proposals/:id" element={
                <PrivateRoute>
                  <ViewProposal />
                </PrivateRoute>
              } />
              {/* New route for proposal viewing with query token */}
              <Route path="/proposals/view" element={<ViewProposal />} />
              <Route path="/clients" element={
                <PrivateRoute>
                  <MyClients />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/notifications" element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              } />
              
              {/* Public proposal viewing */}
              <Route path="/view/:token" element={<ViewProposal />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
