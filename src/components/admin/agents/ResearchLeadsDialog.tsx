import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, Loader2, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiscoveredLead {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  notes: string | null;
}

interface DiscoverResponse {
  success: boolean;
  leads?: DiscoveredLead[];
  inserted?: number;
  duplicates?: number;
  message?: string;
  error?: string;
  errors?: string[];
}

const limitOptions = [5, 10, 25, 50];

export function ResearchLeadsDialog({ open, onOpenChange }: ResearchLeadsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [query, setQuery] = useState('solar installation companies');
  const [location, setLocation] = useState('South Africa');
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<DiscoverResponse | null>(null);

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discover-leads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ query, location, limit }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover leads');
      }

      return data as DiscoverResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      
      if (data.inserted && data.inserted > 0) {
        toast({
          title: 'Leads Discovered',
          description: data.message || `Found ${data.inserted} new leads`,
        });
        queryClient.invalidateQueries({ queryKey: ['agents', 'leads'] });
        queryClient.invalidateQueries({ queryKey: ['agents', 'management', 'tab-counts'] });
      } else {
        toast({
          title: 'No New Leads',
          description: data.message || 'No new leads were found',
          variant: 'default',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Discovery Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    if (!discoverMutation.isPending) {
      setResult(null);
      onOpenChange(false);
    }
  };

  const handleStartResearch = () => {
    setResult(null);
    discoverMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Research Leads with AI
          </DialogTitle>
          <DialogDescription>
            Use AI to search the web and discover potential agent leads. The AI will find solar companies and extract their contact details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="query">Search Query</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., solar installation companies"
                className="pl-9"
                disabled={discoverMutation.isPending}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Cape Town, Gauteng, South Africa"
                className="pl-9"
                disabled={discoverMutation.isPending}
              />
            </div>
          </div>

          {/* Limit Selection */}
          <div className="space-y-2">
            <Label>Number of leads to discover</Label>
            <div className="flex gap-2">
              {limitOptions.map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  variant={limit === opt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLimit(opt)}
                  disabled={discoverMutation.isPending}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>

          {/* Progress / Status */}
          {discoverMutation.isPending && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Researching leads...</p>
                <p className="text-sm text-muted-foreground">
                  Searching the web and extracting contact details
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !discoverMutation.isPending && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-lg border",
                result.inserted && result.inserted > 0 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                  : "bg-muted/50"
              )}>
                {result.inserted && result.inserted > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{result.message}</p>
                  {result.duplicates && result.duplicates > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {result.duplicates} duplicate{result.duplicates > 1 ? 's' : ''} skipped
                    </p>
                  )}
                </div>
              </div>

              {/* Leads Table */}
              {result.leads && result.leads.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {lead.company_name}
                            {lead.website && (
                              <a 
                                href={lead.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-2 text-primary hover:underline text-xs"
                              >
                                ↗
                              </a>
                            )}
                          </TableCell>
                          <TableCell>{lead.contact_name || '-'}</TableCell>
                          <TableCell>{lead.email || '-'}</TableCell>
                          <TableCell>{lead.location || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Some issues occurred:
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {result.errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>...and {result.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={discoverMutation.isPending}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleStartResearch} 
            disabled={discoverMutation.isPending || !query.trim()}
          >
            {discoverMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : result ? (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Again
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Research
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
