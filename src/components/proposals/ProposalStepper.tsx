import { CheckCircle2, User, FileText, Clipboard } from "lucide-react";

type FormStep = "eligibility" | "client" | "project" | "summary";

interface ProposalStepperProps {
  currentStep: FormStep;
}

const STEPS: { key: FormStep; label: string; icon: typeof CheckCircle2 }[] = [
  { key: "eligibility", label: "Eligibility", icon: CheckCircle2 },
  { key: "client", label: "Client Info", icon: User },
  { key: "project", label: "Project Info", icon: FileText },
  { key: "summary", label: "Summary", icon: Clipboard },
];

export function ProposalStepper({ currentStep }: ProposalStepperProps) {
  const activeIndex = Math.max(0, STEPS.findIndex((s) => s.key === currentStep));
  const active = STEPS[activeIndex];
  const ActiveIcon = active.icon;
  const progress = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden bg-card p-3 rounded-lg border-2 border-carbon-gray-200 retro-shadow">
        <div className="flex items-center gap-2">
          <div className="rounded-full w-8 h-8 flex items-center justify-center bg-carbon-green-100 text-carbon-green-600 shrink-0">
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{active.label}</p>
            <p className="text-xs text-muted-foreground">
              Step {activeIndex + 1} of {STEPS.length}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {STEPS.map((step, i) => (
              <span
                key={step.key}
                className={`h-2 w-2 rounded-full ${
                  i <= activeIndex ? "bg-carbon-green-500" : "bg-carbon-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-carbon-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-carbon-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop / tablet: full stepper */}
      <div className="hidden sm:flex justify-between items-center bg-card p-4 rounded-lg border-2 border-carbon-gray-200 retro-shadow">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const reached = index <= activeIndex;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none min-w-0">
              <div
                className={`flex items-center min-w-0 ${
                  reached ? "text-carbon-green-600" : "text-carbon-gray-400"
                }`}
              >
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center shrink-0 ${
                    reached ? "bg-carbon-green-100" : "bg-carbon-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="ml-2 font-medium truncate hidden md:inline">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 min-w-[16px] ${
                    index < activeIndex ? "bg-carbon-green-500" : "bg-carbon-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
