
import React from 'react';
import { Settings, RotateCcw, Zap, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClientsSettingsProps {
  autoRefreshEnabled: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
}

const intervalOptions = [
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 120000, label: '2 minutes' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
];

export function ClientsSettings({
  autoRefreshEnabled,
  onAutoRefreshChange,
  refreshInterval,
  onRefreshIntervalChange,
}: ClientsSettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Client Settings
          </DialogTitle>
          <DialogDescription>
            Configure how your client data is refreshed and updated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Auto-refresh
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh client data at regular intervals
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefreshEnabled}
                onCheckedChange={onAutoRefreshChange}
              />
            </div>

            {autoRefreshEnabled && (
              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval</Label>
                <Select
                  value={refreshInterval.toString()}
                  onValueChange={(value) => onRefreshIntervalChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shorter intervals may impact performance
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Performance Tips</span>
            </div>
            <p className="text-xs text-blue-600">
              • Auto-refresh is disabled by default for better performance<br/>
              • Use manual refresh for on-demand updates<br/>
              • Real-time updates work independently of auto-refresh
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
