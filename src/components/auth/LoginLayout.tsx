
import { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/footer';

interface LoginLayoutProps {
  children: ReactNode;
}

export function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main 
        className="flex-1 flex items-center justify-center py-12"
        role="main"
        aria-label="Login form"
      >
        <div className="w-full max-w-md px-4">
          <section 
            className="bg-white p-8 rounded-xl shadow-lg border border-crunch-black/10"
            aria-labelledby="login-title"
          >
            {children}
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
