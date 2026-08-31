import { Card, CardContent } from "@/components/ui/card";
import { ProposalData } from "@/types/proposals";

interface AcceptingConfirmationStripProps {
  proposal: ProposalData;
  clientName?: string;
  companyName?: string | null;
}

const rand = (value: number) => `R ${Math.round(value).toLocaleString("en-ZA")}`;

/**
 * Compact "you are accepting the following proposal" confirmation shown above
 * the agreement. Values come from the proposal record only — nothing is
 * recalculated here.
 */
export function AcceptingConfirmationStrip({
  proposal,
  clientName,
  companyName,
}: AcceptingConfirmationStripProps) {
  const projectInfo = proposal.content?.projectInfo;
  const totalClientRevenue = proposal.content?.financials?.totalClientRevenue;
  const yearly = proposal.content?.clientSpecificRevenue;
  const yearCount = yearly
    ? Object.values(yearly).filter((v) => typeof v === "number" && v > 0).length
    : 0;
  const annualIncome =
    typeof totalClientRevenue === "number" && totalClientRevenue > 0 && yearCount > 0
      ? totalClientRevenue / yearCount
      : undefined;

  const capacity =
    typeof projectInfo?.size === "number" && projectInfo.size > 0
      ? `${Math.round(projectInfo.size).toLocaleString("en-ZA")} kWp`
      : undefined;

  const items: Array<[string, string]> = [];
  const party = companyName || clientName;
  if (party) items.push(["Contracting party", party]);
  if (projectInfo?.name) items.push(["Project", projectInfo.name]);
  if (projectInfo?.address) items.push(["Site", projectInfo.address]);
  if (capacity) items.push(["Installed capacity", capacity]);
  if (annualIncome) items.push(["Estimated income", `${rand(annualIncome)} / year`]);
  if (typeof totalClientRevenue === "number" && totalClientRevenue > 0) {
    items.push(["Estimated over term", rand(totalClientRevenue)]);
  }
  items.push(["Proposal reference", proposal.id.substring(0, 8).toUpperCase()]);

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-5 md:p-6">
        <h2 className="text-base md:text-lg font-semibold mb-4">
          You are accepting the following proposal
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {items.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-border/60 pb-2">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-semibold text-right break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
