
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { CalculatorRedirect } from "@/components/auth/CalculatorRedirect";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Calculator from "./pages/Calculator";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CreateProposal from "./pages/CreateProposal";
import Proposals from "./pages/Proposals";
import ViewProposal from "./pages/ViewProposal";
import MyClients from "./pages/MyClients";
import Agents from "./pages/Agents";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ForceLogout from "./pages/ForceLogout";
import SystemSettings from "./pages/SystemSettings";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route 
                path="/calculator" 
                element={
                  <CalculatorRedirect>
                    <Calculator />
                  </CalculatorRedirect>
                } 
              />
              <Route path="/agents" element={<Agents />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/force-logout" element={<ForceLogout />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-proposal"
                element={
                  <PrivateRoute>
                    <CreateProposal />
                  </PrivateRoute>
                }
              />
              <Route
                path="/proposals"
                element={
                  <PrivateRoute>
                    <Proposals />
                  </PrivateRoute>
                }
              />
              <Route path="/proposals/:id" element={<ViewProposal />} />
              <Route
                path="/my-clients"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <MyClients />
                  </PrivateRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <PrivateRoute>
                    <Notifications />
                  </PrivateRoute>
                }
              />
              <Route
                path="/system-settings"
                element={
                  <PrivateRoute>
                    <SystemSettings />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
