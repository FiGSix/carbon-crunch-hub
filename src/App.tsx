
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { AuthNavigationHandler } from "@/components/auth/AuthNavigationHandler";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AuthStatusMonitor } from "@/components/auth/AuthStatusMonitor";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Suspense, lazy } from "react";
import { DisplayDiagnostics } from "@/components/diagnostics/DisplayDiagnostics";

// Immediate load for critical public pages
import Index from "./pages/Index";
import SimplifiedIndex from "./pages/SimplifiedIndex";
import TestPage from "./pages/TestPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Lazy load non-critical public pages
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Agents = lazy(() => import("./pages/Agents"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForceLogout = lazy(() => import("./pages/ForceLogout"));

// Lazy load protected pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateProposal = lazy(() => import("./pages/CreateProposal"));
const ProposalsOptimized = lazy(() => import("./pages/ProposalsOptimized"));
const Profile = lazy(() => import("./pages/Profile"));
const MyClients = lazy(() => import("./pages/MyClients"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminAgentManagement = lazy(() => import("./pages/AdminAgentManagement"));
const ViewProposalPage = lazy(() => import("./pages/ViewProposal/ViewProposalPage"));

// Loading component for suspense fallbacks
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
  // Diagnostic logging
  console.log("[App] Initializing application");
  
  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AuthNavigationHandler />
            <TooltipProvider>
              <DisplayDiagnostics />
              <AuthStatusMonitor />
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<SimplifiedIndex />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="/original" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
                <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
                <Route path="/calculator" element={<Suspense fallback={<PageLoader />}><Calculator /></Suspense>} />
                <Route path="/agents" element={<Suspense fallback={<PageLoader />}><Agents /></Suspense>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>} />
                <Route path="/force-logout" element={<Suspense fallback={<PageLoader />}><ForceLogout /></Suspense>} />
                
                {/* Proposal viewing - accessible with token */}
                <Route path="/proposals/:id" element={<Suspense fallback={<PageLoader />}><ViewProposalPage /></Suspense>} />
                
                {/* Protected routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/create-proposal" 
                  element={
                    <PrivateRoute allowedRoles={['agent', 'admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <CreateProposal />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/proposals" 
                  element={
                    <PrivateRoute>
                      <Suspense fallback={<PageLoader />}>
                        <ProposalsOptimized />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <PrivateRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Profile />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/my-clients" 
                  element={
                    <PrivateRoute allowedRoles={['agent', 'admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <MyClients />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/system-settings" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <SystemSettings />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin/agents" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <AdminAgentManagement />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/notifications" 
                  element={
                    <PrivateRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Notifications />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
