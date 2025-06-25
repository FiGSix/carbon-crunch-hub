
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Page imports
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Calculator from "./pages/Calculator";
import Agents from "./pages/Agents";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForceLogout from "./pages/ForceLogout";
import Dashboard from "./pages/Dashboard";
import CreateProposal from "./pages/CreateProposal";
import Proposals from "./pages/Proposals";
import Profile from "./pages/Profile";
import MyClients from "./pages/MyClients";
import SystemSettings from "./pages/SystemSettings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ViewProposalPage from "./pages/ViewProposal/ViewProposalPage";

// Optimized query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true
    },
    mutations: {
      retry: 1
    }
  }
});

function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/force-logout" element={<ForceLogout />} />
                
                {/* Proposal viewing - accessible with token */}
                <Route path="/proposals/:id" element={<ViewProposalPage />} />
                
                {/* Protected routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/create-proposal" 
                  element={
                    <PrivateRoute allowedRoles={['agent', 'admin']}>
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
                <Route 
                  path="/profile" 
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/my-clients" 
                  element={
                    <PrivateRoute allowedRoles={['agent', 'admin']}>
                      <MyClients />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/system-settings" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <SystemSettings />
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
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
