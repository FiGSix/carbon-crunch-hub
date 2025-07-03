import React from 'react';
import { CalendarDays, Users, Building, Award } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface AgentsAdvancedFiltersProps {
  accessLevelFilter: string;
  onAccessLevelFilterChange: (value: string) => void;
  commissionFilter: string;
  onCommissionFilterChange: (value: string) => void;
  onboardingFilter: string;
  onOnboardingFilterChange: (value: string) => void;
  joinDateFilter: { from?: Date; to?: Date } | null;
  onJoinDateFilterChange: (dates: { from?: Date; to?: Date } | null) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function AgentsAdvancedFilters({
  accessLevelFilter,
  onAccessLevelFilterChange,
  commissionFilter,
  onCommissionFilterChange,
  onboardingFilter,
  onOnboardingFilterChange,
  joinDateFilter,
  onJoinDateFilterChange,
  onClearFilters,
  activeFilterCount
}: AgentsAdvancedFiltersProps) {
  const accessLevelOptions = [
    { value: 'all', label: 'All Access Levels' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  const commissionOptions = [
    { value: 'all', label: 'All Commission Types' },
    { value: 'default', label: 'Default Rate' },
    { value: 'override', label: 'Custom Override' }
  ];

  const onboardingOptions = [
    { value: 'all', label: 'All Agents' },
    { value: 'completed', label: 'Onboarded' },
    { value: 'pending', label: 'Pending Onboarding' }
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        Advanced Filters:
      </div>

      <Select value={accessLevelFilter} onValueChange={onAccessLevelFilterChange}>
        <SelectTrigger className="w-44 h-8">
          <Building className="h-3 w-3 mr-2" />
          <SelectValue placeholder="Access Level" />
        </SelectTrigger>
        <SelectContent>
          {accessLevelOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={commissionFilter} onValueChange={onCommissionFilterChange}>
        <SelectTrigger className="w-44 h-8">
          <Award className="h-3 w-3 mr-2" />
          <SelectValue placeholder="Commission" />
        </SelectTrigger>
        <SelectContent>
          {commissionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={onboardingFilter} onValueChange={onOnboardingFilterChange}>
        <SelectTrigger className="w-44 h-8">
          <Users className="h-3 w-3 mr-2" />
          <SelectValue placeholder="Onboarding" />
        </SelectTrigger>
        <SelectContent>
          {onboardingOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <CalendarDays className="h-3 w-3 mr-2" />
            Join Date
            {joinDateFilter && (
              <Badge variant="secondary" className="ml-2 h-4 px-1">
                {joinDateFilter.from && joinDateFilter.to ? '2' : '1'}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={joinDateFilter ? { from: joinDateFilter.from, to: joinDateFilter.to } : undefined}
            onSelect={(range) => onJoinDateFilterChange(range ? { from: range.from, to: range.to } : null)}
            numberOfMonths={2}
          />
          <div className="p-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onJoinDateFilterChange(null)}
              className="w-full"
            >
              Clear Date Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="h-6">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-6 px-2 text-xs">
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}