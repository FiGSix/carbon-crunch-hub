
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { systemSettingsService, CarbonPrices } from "@/services/systemSettingsService";
import { logger } from "@/lib/logger";

export function CarbonPriceManager() {
  const [prices, setPrices] = useState<CarbonPrices>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const carbonLogger = logger.withContext({
    component: 'CarbonPriceManager',
    feature: 'admin-settings'
  });

  useEffect(() => {
    loadCarbonPrices();
  }, []);

  const loadCarbonPrices = async () => {
    try {
      setLoading(true);
      const carbonPrices = await systemSettingsService.getCarbonPrices();
      setPrices(carbonPrices);
      carbonLogger.info("Loaded carbon prices", { carbonPrices });
    } catch (error) {
      carbonLogger.error("Error loading carbon prices", { error });
      toast.error("Failed to load carbon prices");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (year: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrices(prev => ({
        ...prev,
        [year]: numericValue
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await systemSettingsService.updateCarbonPrices(prices);
      toast.success("Carbon prices updated successfully");
      carbonLogger.info("Carbon prices saved", { prices });
    } catch (error) {
      carbonLogger.error("Error saving carbon prices", { error });
      toast.error("Failed to update carbon prices");
    } finally {
      setSaving(false);
    }
  };

  const addYear = () => {
    const currentYear = new Date().getFullYear();
    const years = Object.keys(prices).map(y => parseInt(y));
    const nextYear = years.length > 0 ? Math.max(...years) + 1 : currentYear;
    
    setPrices(prev => ({
      ...prev,
      [nextYear.toString()]: 0
    }));
  };

  const removeYear = (year: string) => {
    setPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[year];
      return newPrices;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carbon Credit Prices</CardTitle>
          <CardDescription>Manage carbon credit prices by year</CardDescription>
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

  const sortedYears = Object.keys(prices).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carbon Credit Prices</CardTitle>
        <CardDescription>
          Manage carbon credit prices by year (in Rand per tCO₂)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedYears.map(year => (
            <div key={year} className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor={`price-${year}`}>Year {year}</Label>
                <div className="flex gap-2">
                  <Input
                    id={`price-${year}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices[year]}
                    onChange={(e) => handlePriceChange(year, e.target.value)}
                    placeholder="Price in Rand"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeYear(year)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
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
              disabled={saving || sortedYears.length === 0}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
