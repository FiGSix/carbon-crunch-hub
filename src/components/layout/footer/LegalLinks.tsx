
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { lazy, Suspense } from 'react';

// Lazy load legal components to reduce initial bundle size
const PrivacyPolicy = lazy(() => import('./legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
const CookiePolicy = lazy(() => import('./legal/CookiePolicy').then(m => ({ default: m.CookiePolicy })));

const legalLinks = [
  { label: 'Privacy Policy', id: 'privacy', href: '/privacy' },
  { label: 'Terms of Service', id: 'terms', href: '/terms' },
  { label: 'Cookie Policy', id: 'cookies', href: '/cookies' },
];

export function LegalLinks() {
  return (
    <div className="flex gap-6">
      {legalLinks.map((link) => (
        <Dialog key={link.label}>
          <DialogTrigger asChild>
            <button 
              className="text-sm text-crunch-black/60 hover:text-crunch-black relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-crunch-yellow transition-all duration-300 group-hover:w-full"></span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{link.label}</DialogTitle>
              <DialogDescription>
                Last updated: April 9, 2025
              </DialogDescription>
            </DialogHeader>
            
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
              {link.id === "privacy" && <PrivacyPolicy />}
              {link.id === "terms" && <TermsOfService />}
              {link.id === "cookies" && <CookiePolicy />}
            </Suspense>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
