import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminRevenueYearlyTable, type RevenueScope, type YearlyRevenueRow } from "@/hooks/dashboard/useAdminRevenueYearlyTable";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(value);

const SCOPE_OPTIONS: { value: RevenueScope; label: string }[] = [
  { value: "audit_ready", label: "Audit Ready" },
  { value: "signed", label: "Signed" },
  { value: "pipeline", label: "Pipeline" },
  { value: "signed_audit_ready", label: "Signed + Audit Ready" },
  { value: "all", label: "Pipeline + Signed + Audit Ready" },
];

function DataRow({ row }: { row: YearlyRevenueRow }) {
  const isBlend = row.year === "blend";
  return (
    <TableRow className={cn(row.estimated && "text-muted-foreground")}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {isBlend ? (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: "#8ED973" }}
            >
              Blend
            </span>
          ) : (
            row.label
          )}
          {row.estimated && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
              Est
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">R{formatNumber(row.price)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(row.tonnes)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.total)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.client)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.partner)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.superPartner)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.crunch)}</TableCell>
    </TableRow>
  );
}

function TotalRow({ row, muted }: { row: YearlyRevenueRow; muted?: boolean }) {
  return (
    <TableRow className={cn("font-semibold bg-muted/50", muted && "text-muted-foreground")}>
      <TableCell>{row.label}</TableCell>
      <TableCell />
      <TableCell className="text-right tabular-nums">{formatNumber(row.tonnes)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.total)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.client)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.partner)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.superPartner)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(row.crunch)}</TableCell>
    </TableRow>
  );
}

export function RevenueYearlyBreakdown() {
  const [scope, setScope] = useState<RevenueScope>("audit_ready");
  const { data, isLoading } = useAdminRevenueYearlyTable(scope);

  const currentRows = data?.rows.filter((r) => !r.estimated) ?? [];
  const estimatedRows = data?.rows.filter((r) => r.estimated) ?? [];

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Revenue year-by-year breakdown</CardTitle>
          <CardDescription>
            Carbon credit price per tonne escalates each year. 2031-2037 rates are estimates at 5% p.a.
            escalation on the 2030 rate.
            {data ? ` ${data.projectCount} project${data.projectCount === 1 ? "" : "s"} in scope.` : ""}
          </CardDescription>
        </div>
        <Select value={scope} onValueChange={(v) => setScope(v as RevenueScope)}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            {SCOPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">SA price (R/t)</TableHead>
                  <TableHead className="text-right">CO₂ (tonnes)</TableHead>
                  <TableHead className="text-right">Total revenue</TableHead>
                  <TableHead className="text-right">Client</TableHead>
                  <TableHead className="text-right">Partner</TableHead>
                  <TableHead className="text-right">Super Partner</TableHead>
                  <TableHead className="text-right">Crunch Carbon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((row) => (
                  <DataRow key={row.year} row={row} />
                ))}
                <TotalRow row={data.subtotalCurrent} />
                {estimatedRows.map((row) => (
                  <DataRow key={row.year} row={row} />
                ))}
                <TotalRow row={data.subtotalEstimated} muted />
                <TotalRow row={data.grandTotal} />
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
