import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth";
import { SimpleErrorBoundary } from "@/components/common/SimpleErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Proposals from "@/pages/Proposals";
import ProposalView from "@/pages/ProposalView";
import CreateProposal from "@/pages/CreateProposal";
import MyClients from "@/pages/MyClients";
import VerifyEmail from "@/pages/VerifyEmail";
import ForceLogout from "@/pages/ForceLogout";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AgentRoute } from "@/components/auth/AgentRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <SimpleErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/force-logout" element={<ForceLogout />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

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
                  path="/proposals"
                  element={
                    <PrivateRoute>
                      <Proposals />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/proposals/:id"
                  element={
                    <PrivateRoute>
                      <ProposalView />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/create-proposal"
                  element={
                    <AgentRoute>
                      <CreateProposal />
                    </AgentRoute>
                  }
                />
                <Route
                  path="/my-clients"
                  element={
                    <PrivateRoute>
                      <MyClients />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </SimpleErrorBoundary>
            <Toaster />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
}

export default App;
