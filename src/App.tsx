
import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from "@/components/theme/theme-provider"
import { useTheme } from 'next-themes'
import { Index } from '@/pages/Index'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForceLogout from '@/pages/ForceLogout'
import Dashboard from '@/pages/Dashboard'
import DashboardPreview from '@/pages/DashboardPreview'
import Proposals from '@/pages/Proposals'
import CreateProposal from '@/pages/CreateProposal'
import ViewProposal from '@/pages/ViewProposal'
import About from '@/pages/About'
import Agents from '@/pages/Agents'
import Contact from '@/pages/Contact'
import Calculator from '@/pages/Calculator'
import NotFound from '@/pages/NotFound'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import Notifications from '@/pages/Notifications'
import TestAgent from '@/pages/TestAgent'
import TestInvitations from '@/pages/TestInvitations'
import ButtonShowcase from '@/pages/ButtonShowcase'
import Profile from '@/pages/Profile'

export function App() {
  const { setTheme } = useTheme()

  useEffect(() => {
    // Set the theme to dark mode by default
    setTheme('dark')
  }, [setTheme])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/force-logout" element={<ForceLogout />} />
          <Route path="/proposals/:id" element={<ViewProposal />} />
          <Route path="/about" element={<About />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/calculator" element={<Calculator />} />
          
          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
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
          
          <Route path="*" element={<NotFound />} />
        </Routes>
    </ThemeProvider>
  );
}

export default App;
