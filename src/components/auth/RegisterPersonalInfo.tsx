
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterPersonalInfoProps {
  firstName: string;
  lastName: string;
  companyName: string;
  showCompanyField: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export function RegisterPersonalInfo({ 
  firstName, 
  lastName, 
  companyName, 
  showCompanyField, 
  onChange, 
  disabled 
}: RegisterPersonalInfoProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={onChange}
            className="retro-input mt-1"
            required
            disabled={disabled}
          />
        </div>
        
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={onChange}
            className="retro-input mt-1"
            required
            disabled={disabled}
          />
        </div>
      </div>
      
      {showCompanyField && (
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={onChange}
            className="retro-input mt-1"
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}
