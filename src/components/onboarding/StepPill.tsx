import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StepPillProps {
  label: string;
  status: 'green' | 'orange' | 'grey';
  onClick?: () => void;
  tooltip?: string;
}

export function StepPill({ label, status, onClick, tooltip }: StepPillProps) {
  const statusColors = {
    green: 'bg-green-500 hover:bg-green-600 text-white',
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
    grey: 'bg-gray-400 hover:bg-gray-500 text-white'
  };

  const pill = (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        statusColors[status],
        onClick && "cursor-pointer"
      )}
      disabled={!onClick}
    >
      {label}
    </button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {pill}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return pill;
}
