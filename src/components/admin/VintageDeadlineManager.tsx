import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { systemSettingsService } from "@/services/systemSettingsService";
import { vintageConfigService, VintageDeadlines } from "@/services/vintageConfigService";
import { logger } from "@/lib/logger";
import { format, parseISO, isBefore } from "date-fns";

export function VintageDeadlineManager() {
  const [deadlines, setDeadlines] = useState<VintageDeadlines>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const vintageLogger = logger.withContext({
    component: 'VintageDeadlineManager',
    feature: 'admin-settings'
  });

  useEffect(() => {
    loadVintageDeadlines();
  }, []);

  const loadVintageDeadlines = async () => {
    try {
      setLoading(true);
      const data = await vintageConfigService.getVintageDeadlines();
      setDeadlines(data);
      vintageLogger.info("Loaded vintage deadlines", { deadlines: data });
    } catch (error) {
      vintageLogger.error("Error loading vintage deadlines", { error });
      toast.error("Failed to load vintage deadlines");
    } finally {
      setLoading(false);
    }
  };

  const handleDeadlineChange = (year: string, value: string) => {
    setDeadlines(prev => ({
      ...prev,
      [year]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await systemSettingsService.updateSetting(
        'vintage_deadlines',
        deadlines,
        'Submission deadlines for each vintage year (ISO 8601 datetime)'
      );
      vintageConfigService.clearCache();
      toast.success("Vintage deadlines updated successfully");
      vintageLogger.info("Vintage deadlines saved", { deadlines });
    } catch (error) {
      vintageLogger.error("Error saving vintage deadlines", { error });
      toast.error("Failed to update vintage deadlines");
    } finally {
      setSaving(false);
    }
  };

  const addYear = () => {
    const currentYear = new Date().getFullYear();
    const years = Object.keys(deadlines).map(y => parseInt(y));
    const nextYear = years.length > 0 ? Math.max(...years) + 1 : currentYear;
    
    // Default deadline: end of year
    const defaultDeadline = `${nextYear}-12-31T23:59:59+02:00`;
    
    setDeadlines(prev => ({
      ...prev,
      [nextYear.toString()]: defaultDeadline
    }));
  };

  const removeYear = (year: string) => {
    setDeadlines(prev => {
      const newDeadlines = { ...prev };
      delete newDeadlines[year];
      return newDeadlines;
    });
  };

  const isDeadlinePassed = (deadlineStr: string): boolean => {
    try {
      const deadline = parseISO(deadlineStr);
      return isBefore(deadline, new Date());
    } catch {
      return false;
    }
  };

  const formatDeadlineDisplay = (deadlineStr: string): string => {
    try {
      const deadline = parseISO(deadlineStr);
      return format(deadline, "dd MMM yyyy, HH:mm");
    } catch {
      return deadlineStr;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vintage Submission Deadlines</CardTitle>
          <CardDescription>Manage submission deadlines for each vintage year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedYears = Object.keys(deadlines).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vintage Submission Deadlines</CardTitle>
        <CardDescription>
          Set the submission deadline for each vintage year. Vintages with passed deadlines will be closed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedYears.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No vintage deadlines configured. Add a year to get started.
            </p>
          )}
          
          {sortedYears.map(year => {
            const deadlineStr = deadlines[year];
            const isPassed = isDeadlinePassed(deadlineStr);
            
            return (
              <div key={year} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={`deadline-${year}`}>Vintage {year}</Label>
                    <Badge variant={isPassed ? "secondary" : "default"}>
                      {isPassed ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      id={`deadline-${year}`}
                      type="datetime-local"
                      value={deadlineStr ? deadlineStr.slice(0, 16) : ""}
                      onChange={(e) => handleDeadlineChange(year, e.target.value ? `${e.target.value}:00+02:00` : "")}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-[140px]">
                      {formatDeadlineDisplay(deadlineStr)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeYear(year)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={addYear}
              disabled={saving}
            >
              Add Year
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
