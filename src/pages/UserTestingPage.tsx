import { UserTestingDashboard } from '@/components/testing/UserTestingDashboard';
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
        <UserTestingDashboard />
      </main>
    </div>
  );
};

export default UserTestingPage;