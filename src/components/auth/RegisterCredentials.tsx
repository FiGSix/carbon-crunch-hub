
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterCredentialsProps {
  email: string;
  password: string;
  confirmPassword: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export function RegisterCredentials({ 
  email, 
  password, 
  confirmPassword, 
  onChange, 
  disabled 
}: RegisterCredentialsProps) {
  return (
    <>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={onChange}
          className="retro-input mt-1"
          placeholder="you@example.com"
          required
          disabled={disabled}
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={onChange}
          className="retro-input mt-1"
          required
          disabled={disabled}
        />
      </div>
      
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={onChange}
          className="retro-input mt-1"
          required
          disabled={disabled}
        />
      </div>
    </>
  );
}
