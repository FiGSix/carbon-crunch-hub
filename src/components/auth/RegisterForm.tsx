
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle } from "lucide-react";
import { signUp } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TermsDialog } from "./TermsDialog";
import { PrivacyPolicyDialog } from "./PrivacyPolicyDialog";

interface RegisterFormProps {
  initialRole: "client" | "agent";
}

export const RegisterForm = ({ initialRole }: RegisterFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    role: initialRole,
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as "client" | "agent" }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }
    
    // Check if terms need to be accepted for agents
    if (formData.role === "agent" && !termsAccepted) {
      toast({
        title: "Terms & Conditions Required",
        description: "You must accept the Agent Referral Agreement to continue",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Register the user with Supabase
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.role as 'client' | 'agent' | 'admin',
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company_name: formData.companyName || null,
          terms_accepted: formData.role === 'agent' ? termsAccepted : null,
          terms_accepted_at: formData.role === 'agent' && termsAccepted ? new Date().toISOString() : null,
        }
      );
      
      if (error) {
        throw error;
      }
      
      await refreshUser();
      
      toast({
        title: "Registration successful!",
        description: "Welcome to CrunchCarbon!",
      });
      
      // Redirect to dashboard
      navigate("/dashboard");
      
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setTermsDialogOpen(false);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="role">I am a</Label>
          <Select 
            value={formData.role} 
            onValueChange={handleRoleChange}
            disabled={isLoading}
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="retro-input mt-1"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="retro-input mt-1"
              required
              disabled={isLoading}
            />
          </div>
        </div>
        
        {formData.role === "agent" && (
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="retro-input mt-1"
              disabled={isLoading}
            />
          </div>
        )}
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="retro-input mt-1"
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="retro-input mt-1"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="retro-input mt-1"
            required
            disabled={isLoading}
          />
        </div>
        
        {formData.role === "agent" && (
          <div className="space-y-2 border-t pt-4 mt-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  setTermsAccepted(checked === true);
                }}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                >
                  I agree to the 
                  <TermsDialog
                    open={termsDialogOpen}
                    onOpenChange={setTermsDialogOpen}
                    onAccept={handleTermsAccept}
                    isLoading={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center text-sm text-carbon-gray-600">
          <CheckCircle className="h-4 w-4 text-carbon-green-500 mr-2" />
          <span>
            By signing up, you agree to our{" "}
            <PrivacyPolicyDialog
              open={privacyDialogOpen}
              onOpenChange={setPrivacyDialogOpen}
              isLoading={isLoading}
            />
          </span>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    </form>
  );
};
