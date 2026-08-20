import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudienceDefinition, useAudienceOptions } from "@/hooks/admin/useBroadcasts";

const STAGES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_review", label: "Awaiting Review" },
  { value: "under_review", label: "Under Review" },
  { value: "audit_ready", label: "Audit Ready" },
];

const ROLES = [
  { value: "client", label: "Clients" },
  { value: "agent", label: "Partners (agents)" },
  { value: "super_partner", label: "Super Partners" },
  { value: "admin", label: "Admins" },
];

interface Props {
  audience: AudienceDefinition;
  onChange: (audience: AudienceDefinition) => void;
}

export function AudienceBuilder({ audience, onChange }: Props) {
  const { data: options } = useAudienceOptions();

  const toggle = (key: "stages" | "roles" | "client_company_ids", value: string) => {
    const current = (audience[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...audience, [key]: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Audience type</Label>
        <Select
          value={audience.type}
          onValueChange={(type) => onChange({ type: type as AudienceDefinition["type"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose an audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="onboarding_stage">Clients by project stage</SelectItem>
            <SelectItem value="role">Everyone with a role</SelectItem>
            <SelectItem value="partner_clients">Clients of one partner</SelectItem>
            <SelectItem value="super_partner_partners">Partners under a Super Partner</SelectItem>
            <SelectItem value="company">Client company</SelectItem>
            <SelectItem value="manual">Manual list of addresses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {audience.type === "onboarding_stage" && (
        <div className="space-y-2">
          <Label>Project stages</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {STAGES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(audience.stages ?? []).includes(s.value)}
                  onCheckedChange={() => toggle("stages", s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            One email per client — all matching projects are merged into {"{{projects_list}}"}.
          </p>
        </div>
      )}

      {audience.type === "role" && (
        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(audience.roles ?? []).includes(r.value)}
                  onCheckedChange={() => toggle("roles", r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {audience.type === "partner_clients" && (
        <div className="space-y-2">
          <Label>Partner</Label>
          <Select
            value={audience.agent_id ?? ""}
            onValueChange={(agent_id) => onChange({ ...audience, agent_id })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a partner" />
            </SelectTrigger>
            <SelectContent>
              {(options?.agents ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {audience.type === "super_partner_partners" && (
        <div className="space-y-2">
          <Label>Super Partner</Label>
          <Select
            value={audience.super_partner_id ?? ""}
            onValueChange={(super_partner_id) => onChange({ ...audience, super_partner_id })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a Super Partner" />
            </SelectTrigger>
            <SelectContent>
              {(options?.superPartners ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {audience.type === "company" && (
        <div className="space-y-2">
          <Label>Client companies</Label>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {(options?.companies ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(audience.client_company_ids ?? []).includes(c.id)}
                  onCheckedChange={() => toggle("client_company_ids", c.id)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {audience.type === "manual" && (
        <div className="space-y-2">
          <Label htmlFor="manual-emails">Email addresses</Label>
          <Textarea
            id="manual-emails"
            rows={5}
            placeholder="one@example.com, two@example.com"
            value={(audience.emails ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                ...audience,
                emails: e.target.value
                  .split(/[,\s;]+/)
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

export const AUDIENCE_LABEL: Record<string, string> = {
  onboarding_stage: "Project stage",
  role: "Role",
  partner_clients: "Partner's clients",
  super_partner_partners: "Super Partner network",
  company: "Client company",
  manual: "Manual list",
};

export { STAGES as BROADCAST_STAGES };
export { Input };
