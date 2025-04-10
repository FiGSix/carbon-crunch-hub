
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface RegisterRoleSelectProps {
  role: string;
  onRoleChange: (value: string) => void;
  disabled: boolean;
}

export function RegisterRoleSelect({ role, onRoleChange, disabled }: RegisterRoleSelectProps) {
  return (
    <div>
      <Label htmlFor="role">I am a</Label>
      <Select 
        value={role} 
        onValueChange={onRoleChange}
        disabled={disabled}
      >
        <SelectTrigger className="retro-input mt-1">
          <SelectValue placeholder="Select your role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="client">System Owner (Client)</SelectItem>
          <SelectItem value="agent">Agent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
