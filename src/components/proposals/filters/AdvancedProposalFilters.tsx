import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AdvancedFilters {
  engagementLevel?: 'all' | 'high' | 'medium' | 'low' | 'none';
  automationStatus?: 'all' | 'active' | 'paused';
  emailStatus?: 'all' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';
}

interface AdvancedProposalFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
}

export function AdvancedProposalFilters({ filters, onFiltersChange }: AdvancedProposalFiltersProps) {
  const hasActiveFilters = 
    (filters.engagementLevel && filters.engagementLevel !== 'all') ||
    (filters.automationStatus && filters.automationStatus !== 'all') ||
    (filters.emailStatus && filters.emailStatus !== 'all');

  const clearFilters = () => {
    onFiltersChange({
      engagementLevel: 'all',
      automationStatus: 'all',
      emailStatus: 'all'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.engagementLevel && filters.engagementLevel !== 'all') count++;
    if (filters.automationStatus && filters.automationStatus !== 'all') count++;
    if (filters.emailStatus && filters.emailStatus !== 'all') count++;
    return count;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Advanced Filters</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Engagement Level */}
        <div className="space-y-2">
          <Label htmlFor="engagement-level" className="text-xs">Engagement Level</Label>
          <Select
            value={filters.engagementLevel || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, engagementLevel: value as AdvancedFilters['engagementLevel'] })
            }
          >
            <SelectTrigger id="engagement-level">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="high">🔥 High (5+ opens)</SelectItem>
              <SelectItem value="medium">📊 Medium (2-4 opens)</SelectItem>
              <SelectItem value="low">📉 Low (1 open)</SelectItem>
              <SelectItem value="none">❌ None (0 opens)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Automation Status */}
        <div className="space-y-2">
          <Label htmlFor="automation-status" className="text-xs">Automation Status</Label>
          <Select
            value={filters.automationStatus || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, automationStatus: value as AdvancedFilters['automationStatus'] })
            }
          >
            <SelectTrigger id="automation-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">✅ Active</SelectItem>
              <SelectItem value="paused">🔕 Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Status */}
        <div className="space-y-2">
          <Label htmlFor="email-status" className="text-xs">Email Status</Label>
          <Select
            value={filters.emailStatus || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, emailStatus: value as AdvancedFilters['emailStatus'] })
            }
          >
            <SelectTrigger id="email-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">📤 Sent</SelectItem>
              <SelectItem value="delivered">📬 Delivered</SelectItem>
              <SelectItem value="opened">📧 Opened</SelectItem>
              <SelectItem value="clicked">🖱️ Clicked</SelectItem>
              <SelectItem value="bounced">⚠️ Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Showing proposals matching the selected filters
          </p>
        </div>
      )}
    </div>
  );
}

export function applyAdvancedFilters<T extends {
  engagement_count?: number;
  automation_paused?: boolean;
  status?: string;
  last_email_event_type?: string;
}>(proposals: T[], filters: AdvancedFilters): T[] {
  return proposals.filter(proposal => {
    // Engagement level filter
    if (filters.engagementLevel && filters.engagementLevel !== 'all') {
      const count = proposal.engagement_count || 0;
      switch (filters.engagementLevel) {
        case 'high':
          if (count < 5) return false;
          break;
        case 'medium':
          if (count < 2 || count > 4) return false;
          break;
        case 'low':
          if (count !== 1) return false;
          break;
        case 'none':
          if (count > 0) return false;
          break;
      }
    }

    // Automation status filter
    if (filters.automationStatus && filters.automationStatus !== 'all') {
      const isPaused = proposal.automation_paused || false;
      if (filters.automationStatus === 'active' && isPaused) return false;
      if (filters.automationStatus === 'paused' && !isPaused) return false;
    }

    // Email status filter
    if (filters.emailStatus && filters.emailStatus !== 'all') {
      const status = proposal.status?.toLowerCase();
      if (filters.emailStatus !== status) return false;
    }

    return true;
  });
}
