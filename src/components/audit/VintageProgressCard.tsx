import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type VintageYear = 'blend' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030';

const vintageYears: { value: VintageYear; label: string }[] = [
  { value: 'blend', label: 'Blend' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

export function VintageProgressCard() {
  const [selectedVintage, setSelectedVintage] = useState<VintageYear>('blend');

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Vintage Progress:
          <Select value={selectedVintage} onValueChange={(v) => setSelectedVintage(v as VintageYear)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vintageYears.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px] p-4 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            Progress notes will appear here...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
