
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
import ViewProposalPage from "@/pages/ViewProposal/ViewProposalPage";
import CreateProposal from "@/pages/CreateProposal";
import MyClients from "@/pages/MyClients";
import VerifyEmail from "@/pages/VerifyEmail";
import ForceLogout from "@/pages/ForceLogout";
import { PrivateRoute } from "@/components/auth/PrivateRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Simple placeholder components for missing routes
const TermsOfService = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <p>Terms of Service content will go here.</p>
  </div>
);

const PrivacyPolicy = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <p>Privacy Policy content will go here.</p>
  </div>
);

// Simple route guards
const AgentRoute = ({ children }: { children: React.ReactNode }) => (
  <PrivateRoute>{children}</PrivateRoute>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <PrivateRoute>{children}</PrivateRoute>
);

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
                      <ViewProposalPage />
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
