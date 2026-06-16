import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackfillSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  onboardingSucceeded: number;
  onboardingFailed: number;
  onboardingSkipped: number;
}

export function GpsBackfillManager() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BackfillSummary | null>(null);

  const runBackfill = async (dryRun = false) => {
    setLoading(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-geocode', {
        body: { dryRun },
      });

      if (error) throw error;

      setSummary(data.summary);
      if (dryRun) {
        toast.info(`Dry run complete: ${data.summary.processed} proposals would be processed`);
      } else {
        toast.success(`Backfill complete: ${data.summary.succeeded} proposals geocoded`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Backfill failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          GPS Coordinate Backfill
        </CardTitle>
        <CardDescription>
          Geocode proposals and onboarding records that have an address but no GPS coordinates using Mapbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runBackfill(true)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Dry Run (Preview)
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Run Backfill
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm GPS Backfill</AlertDialogTitle>
                <AlertDialogDescription>
                  This will geocode all proposals and onboarding records that have an address but no GPS coordinates. 
                  This may take several minutes depending on the number of records. It's safe to run multiple times.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => runBackfill(false)}>
                  Start Backfill
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {summary && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              {summary.failed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Results
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Proposals</p>
                <ul className="mt-1 space-y-1">
                  <li>Processed: <span className="font-medium">{summary.processed}</span></li>
                  <li className="text-green-600">Geocoded: <span className="font-medium">{summary.succeeded}</span></li>
                  <li className="text-red-600">Failed: <span className="font-medium">{summary.failed}</span></li>
                  <li className="text-muted-foreground">Skipped: <span className="font-medium">{summary.skipped}</span></li>
                </ul>
              </div>
              <div>
                <p className="text-muted-foreground">Onboarding Fields</p>
                <ul className="mt-1 space-y-1">
                  <li className="text-green-600">Geocoded: <span className="font-medium">{summary.onboardingSucceeded}</span></li>
                  <li className="text-red-600">Failed: <span className="font-medium">{summary.onboardingFailed}</span></li>
                  <li className="text-muted-foreground">Skipped: <span className="font-medium">{summary.onboardingSkipped}</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
