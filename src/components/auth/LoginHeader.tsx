
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function LoginHeader() {
  return (
    <>
      <div className="mb-6">
        <Link to="/" className="flex items-center text-crunch-black/70 hover:text-crunch-yellow">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-crunch-black">Welcome back</h1>
        <p className="text-crunch-black/70 mt-2">Log in to your CrunchCarbon account</p>
      </div>
    </>
  );
}
