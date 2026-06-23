import { useEffect, useState } from "react";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapboxAddressAutocomplete } from "@/components/common/MapboxAddressAutocomplete";
import { CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProjectDetailsValue {
  systemAddress: string;
  systemLat: number | null;
  systemLng: number | null;
  commissioningDate: string;     // yyyy-mm-dd
  installerCompanyName: string;
  installerEmail: string;
}

const schema = z.object({
  systemAddress: z.string().trim().min(5, "Please enter the system address"),
  systemLat: z.number().nullable(),
  systemLng: z.number().nullable(),
  commissioningDate: z
    .string()
    .min(1, "Commissioning date is required")
    .refine((d) => {
      const date = new Date(d);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, "Date must be today or earlier"),
  installerCompanyName: z.string().trim().min(2, "Installer name is required"),
  installerEmail: z.string().trim().email("Valid installer email is required"),
});

export function projectDetailsValid(v: ProjectDetailsValue): boolean {
  return schema.safeParse(v).success;
}

interface Props {
  value: ProjectDetailsValue;
  onChange: (v: ProjectDetailsValue) => void;
}

export function ProjectDetailsStep({ value, onChange }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [manualAddress, setManualAddress] = useState(false);

  useEffect(() => {
    const result = schema.safeParse(value);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
    } else {
      setErrors({});
    }
  }, [value]);

  const set = <K extends keyof ProjectDetailsValue>(k: K, v: ProjectDetailsValue[K]) =>
    onChange({ ...value, [k]: v });

  const showErr = (k: string) => touched[k] && errors[k];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Confirm your project details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We need a few details about your installed solar system before you sign.
            Your installer will help complete the technical onboarding (panels, inverter
            serials, etc.) once your agreement is in place.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="systemAddress">Solar system physical address *</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setManualAddress((m) => !m)}
            >
              {manualAddress ? "Use address search" : "Enter address manually"}
            </Button>
          </div>
          <div className="mt-1.5">
            {manualAddress ? (
              <Input
                id="systemAddress"
                value={value.systemAddress}
                onChange={(e) =>
                  onChange({
                    ...value,
                    systemAddress: e.target.value,
                    systemLat: null,
                    systemLng: null,
                  })
                }
                onBlur={() => setTouched((t) => ({ ...t, systemAddress: true }))}
                placeholder="Street, suburb, city, postal code"
              />
            ) : (
              <MapboxAddressAutocomplete
                value={value.systemAddress}
                onChange={(address, coords) => {
                  onChange({
                    ...value,
                    systemAddress: address,
                    systemLat: coords?.lat ?? null,
                    systemLng: coords?.lng ?? null,
                  });
                  setTouched((t) => ({ ...t, systemAddress: true }));
                }}
                placeholder="Start typing the site address…"
                required
              />
            )}
          </div>
          {showErr("systemAddress") && (
            <p className="text-sm text-destructive mt-1">{errors.systemAddress}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="commissioningDate">Commissioning date *</Label>
            <Input
              id="commissioningDate"
              type="date"
              max={today}
              value={value.commissioningDate}
              onChange={(e) => set("commissioningDate", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, commissioningDate: true }))}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The date your solar system was switched on.
            </p>
            {showErr("commissioningDate") && (
              <p className="text-sm text-destructive mt-1">{errors.commissioningDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="installerCompanyName">Installer / EPC company *</Label>
            <Input
              id="installerCompanyName"
              value={value.installerCompanyName}
              onChange={(e) => set("installerCompanyName", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, installerCompanyName: true }))}
              placeholder="e.g. Sunpower Installations"
              className="mt-1.5"
            />
            {showErr("installerCompanyName") && (
              <p className="text-sm text-destructive mt-1">{errors.installerCompanyName}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="installerEmail">Installer email *</Label>
          <Input
            id="installerEmail"
            type="email"
            value={value.installerEmail}
            onChange={(e) => set("installerEmail", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, installerEmail: true }))}
            placeholder="installer@example.com"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            We'll invite them to complete the technical project details on your behalf.
          </p>
          {showErr("installerEmail") && (
            <p className="text-sm text-destructive mt-1">{errors.installerEmail}</p>
          )}
        </div>

        {projectDetailsValid(value) && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            Project details look good — you can sign below.
          </div>
        )}
      </div>
    </section>
  );
}
