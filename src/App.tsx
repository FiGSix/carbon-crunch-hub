import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Proposals from './pages/Proposals';
import CreateProposal from './pages/CreateProposal';
import MyClients from './pages/MyClients';
import Agents from './pages/Agents';
import Notifications from './pages/Notifications';
import SystemSettings from './pages/SystemSettings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ForceLogout from './pages/ForceLogout';
import { PrivateRoute } from './components/auth/PrivateRoute';
import ViewProposal from './pages/ViewProposal';
import { AuthProvider } from "@/contexts/auth";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-carbon-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
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
                path="/proposals"
                element={
                  <PrivateRoute>
                    <Proposals />
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
                path="/my-clients"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <MyClients />
                  </PrivateRoute>
                }
              />
              <Route
                path="/agents"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <Agents />
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
                  <PrivateRoute allowedRoles={['admin']}>
                    <SystemSettings />
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
                path="/view-proposal/:id"
                element={
                  <PrivateRoute>
                    <ViewProposal />
                  </PrivateRoute>
                }
              />
              {/* Public route for viewing proposal with token */}
              <Route path="/proposal/:token" element={<ViewProposal />} />
              <Route path="/" element={<Login />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
