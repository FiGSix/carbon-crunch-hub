
import React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
};

export function CompanyLogo({ 
  logoUrl, 
  companyName, 
  size = 'md',
  className 
}: CompanyLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${companyName || 'Company'} logo`}
        className={cn(
          sizeClasses[size],
          'rounded-lg object-cover border border-gray-200',
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center',
        className
      )}
    >
      <Building2 className={cn(
        'text-gray-400',
        size === 'sm' && 'h-4 w-4',
        size === 'md' && 'h-6 w-6',
        size === 'lg' && 'h-8 w-8',
        size === 'xl' && 'h-10 w-10'
      )} />
    </div>
  );
}
