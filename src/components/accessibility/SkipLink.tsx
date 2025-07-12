import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "bg-primary text-primary-foreground px-4 py-2 rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-all duration-200",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href) as HTMLElement;
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }}
    >
      {children}
    </a>
  );
}

interface SkipLinksProps {
  links?: Array<{ href: string; label: string }>;
  className?: string;
}

export function SkipLinks({ 
  links = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' }
  ],
  className 
}: SkipLinksProps) {
  return (
    <nav 
      aria-label="Skip links"
      className={cn("sr-only focus-within:not-sr-only", className)}
    >
      {links.map((link, index) => (
        <SkipLink key={index} href={link.href}>
          {link.label}
        </SkipLink>
      ))}
    </nav>
  );
}