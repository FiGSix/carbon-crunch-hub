import { UserTestingDashboard } from '@/components/testing/UserTestingDashboard';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserTestingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4" role="navigation" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Go to home page"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">User Testing</span>
            </div>
            <Link 
              to="/dashboard" 
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </nav>
      </header>
      <main className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UserTestingDashboard />
          </div>
          <div className="space-y-4">
            {/* Performance Monitor */}
            <PerformanceMonitor />
            
            {/* Loading Indicators Demo */}
            <div className="loading-demo-container sticky top-4">
              <div className="space-y-4">
                <div className="loading-state-demo p-4 border rounded-lg bg-card">
                  <h3 className="text-sm font-medium mb-3">Loading Indicators</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full spinner loading"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-4 w-4 bg-primary/20 rounded loading-pulse"></div>
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="animate-bounce h-2 w-2 bg-primary rounded-full [animation-delay:-0.3s] loading-dot"></div>
                        <div className="animate-bounce h-2 w-2 bg-primary rounded-full [animation-delay:-0.15s] loading-dot"></div>
                        <div className="animate-bounce h-2 w-2 bg-primary rounded-full loading-dot"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">Saving...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserTestingPage;