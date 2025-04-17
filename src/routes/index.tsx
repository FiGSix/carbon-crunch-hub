
import React from 'react';
import { Route } from 'react-router-dom';
import { PrivateRoute } from '@/components/auth/PrivateRoute';

// Public pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForceLogout from '@/pages/ForceLogout';
import ViewProposal from '@/pages/ViewProposal';
import About from '@/pages/About';
import Agents from '@/pages/Agents';
import Contact from '@/pages/Contact';
import Calculator from '@/pages/Calculator';
import NotFound from '@/pages/NotFound';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import DashboardPreview from '@/pages/DashboardPreview';
import Proposals from '@/pages/Proposals';
import CreateProposal from '@/pages/CreateProposal';
import Profile from '@/pages/Profile';
import Notifications from '@/pages/Notifications';
import TestAgent from '@/pages/TestAgent';
import TestInvitations from '@/pages/TestInvitations';
import ButtonShowcase from '@/pages/ButtonShowcase';

export const publicRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/force-logout" element={<ForceLogout />} />
    <Route path="/proposals/:id" element={<ViewProposal />} />
    <Route path="/about" element={<About />} />
    <Route path="/agents" element={<Agents />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/calculator" element={<Calculator />} />
  </>
);

export const protectedRoutes = (
  <Route element={<PrivateRoute>{/* This ensures children are passed */}</PrivateRoute>}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/dashboard-preview" element={<DashboardPreview />} />
    <Route path="/proposals" element={<Proposals />} />
    <Route path="/create-proposal" element={<CreateProposal />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/test-agent" element={<TestAgent />} />
    <Route path="/test-invitations" element={<TestInvitations />} />
    <Route path="/button-showcase" element={<ButtonShowcase />} />
  </Route>
);

export const fallbackRoute = <Route path="*" element={<NotFound />} />;
