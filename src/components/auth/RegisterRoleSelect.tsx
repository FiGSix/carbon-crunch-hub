
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RegisterRoleSelectProps {
  role: string;
  onRoleChange: (value: string) => void;
  disabled: boolean;
}

export function RegisterRoleSelect({ role, onRoleChange, disabled }: RegisterRoleSelectProps) {
  const id = useId();
  const helpTextId = `${id}-help`;
  
  return (
    <div className="space-y-2">
      <Label 
        htmlFor={id}
        className="block font-medium"
      >
        <span className="sr-only">Select your role, required field</span>
        <span aria-hidden="true">I am a</span>
        <span className="text-destructive ml-1" aria-hidden="true">*</span>
      </Label>
      
      <div id={helpTextId} className="sr-only">
        Role selection field. Required. Choose whether you are a system owner or an agent.
      </div>
      
      <Select 
        value={role} 
        onValueChange={onRoleChange}
        disabled={disabled}
        required
      >
        <SelectTrigger 
          id={id}
          className={cn(
            "retro-input mt-1",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
          aria-describedby={helpTextId}
          aria-label="Select your role (required)"
          aria-invalid={!role}
        >
          <SelectValue 
            placeholder="Select your role" 
            aria-label={role ? `Selected role: ${role === 'client' ? 'System Owner (Client)' : 'Agent'}` : "No role selected"}
          />
        </SelectTrigger>
        <SelectContent
          className="z-50 bg-popover"
          role="listbox"
          aria-label="Role options"
        >
          <SelectItem 
            value="client"
            className="focus:bg-accent focus:text-accent-foreground"
            aria-describedby="client-description"
          >
            <div>
              <div>System Owner (Client)</div>
              <div id="client-description" className="text-xs text-muted-foreground">
                You own or manage solar energy systems
              </div>
            </div>
          </SelectItem>
          <SelectItem 
            value="agent"
            className="focus:bg-accent focus:text-accent-foreground"
            aria-describedby="agent-description"
          >
            <div>
              <div>Agent</div>
              <div id="agent-description" className="text-xs text-muted-foreground">
                You help clients with solar energy solutions
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
