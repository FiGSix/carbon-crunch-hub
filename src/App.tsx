
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { AuthNavigationHandler } from "@/components/auth/AuthNavigationHandler";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AuthStatusMonitor } from "@/components/auth/AuthStatusMonitor";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Suspense, lazy } from "react";
import { createOptimizedLazyComponent, withOptimizedRouteLoading } from "@/lib/performance/OptimizedLoader";
import { DisplayDiagnostics } from "@/components/diagnostics/DisplayDiagnostics";
import { logger } from '@/lib/logger';

// Immediate load for critical public pages
import Index from "./pages/Index";
import SimplifiedIndex from "./pages/SimplifiedIndex";
import TestPage from "./pages/TestPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Optimized lazy loading with error handling and performance tracking
const About = createOptimizedLazyComponent(() => import("./pages/About"), "About");
const Contact = createOptimizedLazyComponent(() => import("./pages/Contact"), "Contact");
const Calculator = createOptimizedLazyComponent(() => import("./pages/Calculator"), "Calculator");
const Agents = createOptimizedLazyComponent(() => import("./pages/Agents"), "Agents");
const VerifyEmail = createOptimizedLazyComponent(() => import("./pages/VerifyEmail"), "VerifyEmail");
const ForceLogout = createOptimizedLazyComponent(() => import("./pages/ForceLogout"), "ForceLogout");
const TestingSuite = createOptimizedLazyComponent(() => import("./pages/TestingSuite"), "TestingSuite");
const SystemDiagnostics = createOptimizedLazyComponent(() => import("./pages/SystemDiagnostics"), "SystemDiagnostics");

// Optimized lazy load protected pages
const Dashboard = createOptimizedLazyComponent(() => import("./pages/Dashboard"), "Dashboard");
const CreateProposal = createOptimizedLazyComponent(() => import("./pages/CreateProposal"), "CreateProposal");
const ProposalsOptimized = createOptimizedLazyComponent(() => import("./pages/ProposalsOptimized"), "ProposalsOptimized");
const Profile = createOptimizedLazyComponent(() => import("./pages/Profile"), "Profile");
const MyClients = createOptimizedLazyComponent(() => import("./pages/MyClients"), "MyClients");
const SystemSettings = createOptimizedLazyComponent(() => import("./pages/SystemSettings"), "SystemSettings");
const Notifications = createOptimizedLazyComponent(() => import("./pages/Notifications"), "Notifications");
const AdminAgentManagement = createOptimizedLazyComponent(() => import("./pages/AdminAgentManagement"), "AdminAgentManagement");
const ViewProposalPage = createOptimizedLazyComponent(() => import("./pages/ViewProposal/ViewProposalPage"), "ViewProposalPage");

// Enhanced loading component with better UX
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

import { createQueryClient } from "@/lib/queryClient";

// Create optimized query client
const queryClient = createQueryClient();

function App() {
  // Diagnostic logging in development only
  logger.info("Application initializing");
  
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
                <Route 
                  path="/test" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <TestPage />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/testing" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <TestingSuite />
                      </Suspense>
                    </PrivateRoute>
                  } 
                />
                <Route path="/original" element={<Index />} />
                <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
                <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
                <Route path="/calculator" element={<Suspense fallback={<PageLoader />}><Calculator /></Suspense>} />
                <Route path="/agents" element={<Suspense fallback={<PageLoader />}><Agents /></Suspense>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
                  path="/system-diagnostics" 
                  element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <Suspense fallback={<PageLoader />}>
                        <SystemDiagnostics />
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
