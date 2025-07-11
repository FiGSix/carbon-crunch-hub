
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function LoginHeader() {
  return (
    <>
      <nav className="mb-6" role="navigation" aria-label="Breadcrumb">
        <Link 
          to="/" 
          className="flex items-center text-crunch-black/70 hover:text-crunch-yellow focus:outline-none focus:ring-2 focus:ring-crunch-yellow focus:ring-offset-2 rounded-sm px-1 py-1 min-h-[44px]"
          aria-label="Go back to home page"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to home
        </Link>
      </nav>
      
      <header className="text-center mb-8" role="banner">
        <h1 
          id="login-title"
          className="text-2xl font-bold text-crunch-black"
        >
          Welcome back
        </h1>
        <p className="text-crunch-black/70 mt-2">
          Log in to your CrunchCarbon account
        </p>
      </header>
    </>
  );
}
