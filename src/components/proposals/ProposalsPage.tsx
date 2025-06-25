
import { ProposalActions } from "./ProposalActions";
import { ProposalsSection } from "./ProposalsSection";

export function ProposalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <ProposalActions />
      </div>
      <ProposalsSection />
    </div>
  );
}
