
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { AuthNavigationHandler } from "@/components/auth/AuthNavigationHandler";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AgentApprovalGuard } from "@/components/auth/AgentApprovalGuard";
import { AuthStatusMonitor } from "@/components/auth/AuthStatusMonitor";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PageErrorBoundary } from "@/components/error/PageErrorBoundary";
import { Suspense, lazy, useEffect } from "react";
import { createOptimizedLazyComponent, withOptimizedRouteLoading } from "@/lib/performance/OptimizedLoader";
// Only import diagnostics in development
const DisplayDiagnostics = import.meta.env.DEV 
  ? lazy(() => import("@/components/diagnostics/DisplayDiagnostics").then(m => ({ default: m.DisplayDiagnostics })))
  : null;
import { logger } from '@/lib/logger';

// Immediate load for critical public pages
import Index from "./pages/Index";
import SimplifiedIndex from "./pages/SimplifiedIndex";
import TestPage from "./pages/TestPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import EmbeddedGame from "./pages/EmbeddedGame";

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
const WhyChooseUs = createOptimizedLazyComponent(() => import("./pages/WhyChooseUs"), "WhyChooseUs");
const Profile = createOptimizedLazyComponent(() => import("./pages/Profile"), "Profile");
const MyClients = createOptimizedLazyComponent(() => import("./pages/MyClients"), "MyClients");
const SystemSettings = createOptimizedLazyComponent(() => import("./pages/SystemSettings"), "SystemSettings");
const Notifications = createOptimizedLazyComponent(() => import("./pages/Notifications"), "Notifications");
const AdminAgentManagement = createOptimizedLazyComponent(() => import("./pages/AdminAgentManagement"), "AdminAgentManagement");
const AdminUserManagement = createOptimizedLazyComponent(() => import("./pages/AdminUserManagement"), "AdminUserManagement");
const ViewProposalPage = createOptimizedLazyComponent(() => import("./pages/ViewProposal/ViewProposalPage"), "ViewProposalPage");
const ProposalAcceptance = createOptimizedLazyComponent(() => import("./pages/ProposalAcceptance/index"), "ProposalAcceptance");
const AdminSignatures = createOptimizedLazyComponent(() => import("./pages/AdminSignatures"), "AdminSignatures");
const ProjectOnboardingList = createOptimizedLazyComponent(() => import("./pages/ProjectOnboardingList"), "ProjectOnboardingList");
const ProjectOnboardingDetail = createOptimizedLazyComponent(() => import("./pages/ProjectOnboardingDetail"), "ProjectOnboardingDetail");

// Import the standardized loading component
import { PageLoading } from '@/components/ui/loading-states';

// Standardized page loader component
const PageLoader = () => <PageLoading minimal />;

import { createQueryClient } from "@/lib/queryClient";

// Create optimized query client
const queryClient = createQueryClient();

/**
 * Recovery Redirect Shim - Ensures password reset links always land on /reset-password
 * Supabase may redirect to Site URL (/) with recovery hash, this catches and fixes it
 */
function RecoveryRedirectShim() {
  const location = useLocation();
  
  useEffect(() => {
    const hash = window.location.hash;
    
    // Redirect to /reset-password if hash contains recovery-related params
    if (location.pathname !== '/reset-password' && hash && (
      hash.includes('access_token=') ||
      hash.includes('type=recovery') ||
      hash.includes('error=') ||
      hash.includes('error_code=')
    )) {
      window.location.replace(`/reset-password${hash}`);
    }
  }, [location.pathname]);
  
  return null;
}

function App() {
  // Diagnostic logging in development only
  logger.info("Application initializing");
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthErrorBoundary>
              <AuthProvider>
                <RecoveryRedirectShim />
                <AuthNavigationHandler />
                <TooltipProvider>
                {import.meta.env.DEV && DisplayDiagnostics && (
                  <Suspense fallback={null}>
                    <DisplayDiagnostics />
                  </Suspense>
                )}
                <AuthStatusMonitor />
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes - wrapped with page error boundaries */}
                  <Route path="/" element={
                    <PageErrorBoundary pageName="Home">
                      <SimplifiedIndex />
                    </PageErrorBoundary>
                  } />
                  {/* Development-only test route */}
                  {import.meta.env.DEV && (
                  <Route 
                    path="/test" 
                      element={
                        <PrivateRoute allowedRoles={['admin']}>
                          <PageErrorBoundary pageName="Test">
                            <TestPage />
                          </PageErrorBoundary>
                        </PrivateRoute>
                      } 
                  />
                )}
                {/* Development-only testing suite */}
                {import.meta.env.DEV && (
                  <Route 
                    path="/testing" 
                      element={
                        <PrivateRoute allowedRoles={['admin']}>
                          <PageErrorBoundary pageName="Testing Suite">
                            <Suspense fallback={<PageLoader />}>
                              <TestingSuite />
                            </Suspense>
                          </PageErrorBoundary>
                        </PrivateRoute>
                      } 
                  />
                )}
                  <Route path="/original" element={
                    <PageErrorBoundary pageName="Original Index">
                      <Index />
                    </PageErrorBoundary>
                  } />
                  <Route path="/about" element={
                    <PageErrorBoundary pageName="About">
                      <Suspense fallback={<PageLoader />}><About /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/contact" element={
                    <PageErrorBoundary pageName="Contact">
                      <Suspense fallback={<PageLoader />}><Contact /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/calculator" element={
                    <PageErrorBoundary pageName="Calculator">
                      <Suspense fallback={<PageLoader />}><Calculator /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/agents" element={
                    <PageErrorBoundary pageName="Agents">
                      <Suspense fallback={<PageLoader />}><Agents /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/why-choose-us" element={
                    <PageErrorBoundary pageName="Why Choose Us">
                      <Suspense fallback={<PageLoader />}><WhyChooseUs /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/login" element={
                    <PageErrorBoundary pageName="Login">
                      <Login />
                    </PageErrorBoundary>
                  } />
                  <Route path="/register" element={
                    <PageErrorBoundary pageName="Register">
                      <Register />
                    </PageErrorBoundary>
                  } />
                  <Route path="/forgot-password" element={
                    <PageErrorBoundary pageName="Forgot Password">
                      <ForgotPassword />
                    </PageErrorBoundary>
                  } />
                  <Route path="/reset-password" element={
                    <PageErrorBoundary pageName="Reset Password">
                      <ResetPassword />
                    </PageErrorBoundary>
                  } />
                  <Route path="/auth/callback" element={
                    <PageErrorBoundary pageName="Auth Callback">
                      <AuthCallback />
                    </PageErrorBoundary>
                  } />
                  <Route path="/verify-email" element={
                    <PageErrorBoundary pageName="Verify Email">
                      <Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>
                    </PageErrorBoundary>
                  } />
                  <Route path="/force-logout" element={
                    <PageErrorBoundary pageName="Force Logout">
                      <Suspense fallback={<PageLoader />}><ForceLogout /></Suspense>
                    </PageErrorBoundary>
                  } />
                  
                  {/* Embedded Game - No navigation or branding */}
                  <Route path="/game" element={<EmbeddedGame />} />
                  
                  {/* Proposal viewing - accessible with token */}
                  <Route path="/proposals/:id" element={
                    <PageErrorBoundary pageName="View Proposal">
                      <Suspense fallback={<PageLoader />}><ViewProposalPage /></Suspense>
                    </PageErrorBoundary>
                  } />
                  
                  {/* Proposal acceptance - digital signature flow */}
                  <Route path="/proposals/:id/accept" element={
                    <PageErrorBoundary pageName="Proposal Acceptance">
                      <Suspense fallback={<PageLoader />}>
                        <ProposalAcceptance />
                      </Suspense>
                    </PageErrorBoundary>
                  } />
                  
                  {/* Protected routes - wrapped with page error boundaries */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Dashboard">
                          <Suspense fallback={<PageLoader />}>
                            <Dashboard />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                />
                  <Route 
                    path="/create-proposal" 
                    element={
                      <PrivateRoute allowedRoles={['agent', 'admin']}>
                        <AgentApprovalGuard>
                          <PageErrorBoundary pageName="Create Proposal">
                            <Suspense fallback={<PageLoader />}>
                              <CreateProposal />
                            </Suspense>
                          </PageErrorBoundary>
                        </AgentApprovalGuard>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/proposals" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Proposals">
                          <Suspense fallback={<PageLoader />}>
                            <ProposalsOptimized />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Profile">
                          <Suspense fallback={<PageLoader />}>
                            <Profile />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/my-clients" 
                    element={
                      <PrivateRoute allowedRoles={['agent', 'admin']}>
                        <AgentApprovalGuard>
                          <PageErrorBoundary pageName="My Clients">
                            <Suspense fallback={<PageLoader />}>
                              <MyClients />
                            </Suspense>
                          </PageErrorBoundary>
                        </AgentApprovalGuard>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/system-settings" 
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <PageErrorBoundary pageName="System Settings">
                          <Suspense fallback={<PageLoader />}>
                            <SystemSettings />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  {/* Admin-only system diagnostics */}
                  <Route 
                    path="/system-diagnostics" 
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <PageErrorBoundary pageName="System Diagnostics">
                          <Suspense fallback={<PageLoader />}>
                            <SystemDiagnostics />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/admin/agents" 
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <PageErrorBoundary pageName="Agent Management">
                          <Suspense fallback={<PageLoader />}>
                            <AdminAgentManagement />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/admin/users" 
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <PageErrorBoundary pageName="User Management">
                          <Suspense fallback={<PageLoader />}>
                            <AdminUserManagement />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/admin/signatures" 
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <PageErrorBoundary pageName="Digital Signatures">
                          <Suspense fallback={<PageLoader />}>
                            <AdminSignatures />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route
                    path="/notifications" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Notifications">
                          <Suspense fallback={<PageLoader />}>
                            <Notifications />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/onboarding" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Project Onboarding">
                          <Suspense fallback={<PageLoader />}>
                            <ProjectOnboardingList />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/onboarding/:projectId" 
                    element={
                      <PrivateRoute>
                        <PageErrorBoundary pageName="Project Detail">
                          <Suspense fallback={<PageLoader />}>
                            <ProjectOnboardingDetail />
                          </Suspense>
                        </PageErrorBoundary>
                      </PrivateRoute>
                    } 
                  />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
            </AuthProvider>
          </AuthErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
