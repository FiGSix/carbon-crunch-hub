
import React, { useEffect } from 'react'
import { Routes } from 'react-router-dom'
import { ThemeProvider } from "./components/theme-provider"
import { useTheme } from 'next-themes'
import { publicRoutes, protectedRoutes, fallbackRoute } from './routes';

export function App() {
  const { setTheme } = useTheme()

  useEffect(() => {
    // Set the theme to dark mode by default
    setTheme('dark')
  }, [setTheme])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Routes>
        {publicRoutes}
        {protectedRoutes}
        {fallbackRoute}
      </Routes>
    </ThemeProvider>
  );
}

export default App;
