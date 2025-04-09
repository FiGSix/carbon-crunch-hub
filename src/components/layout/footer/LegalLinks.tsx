
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PrivacyPolicy } from './legal/PrivacyPolicy';
import { TermsOfService } from './legal/TermsOfService';
import { CookiePolicy } from './legal/CookiePolicy';

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
            
            {link.id === "privacy" && <PrivacyPolicy />}
            {link.id === "terms" && <TermsOfService />}
            {link.id === "cookies" && <CookiePolicy />}
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
