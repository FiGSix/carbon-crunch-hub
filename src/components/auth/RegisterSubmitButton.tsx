
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RegisterSubmitButtonProps {
  isLoading: boolean;
}

export function RegisterSubmitButton({ isLoading }: RegisterSubmitButtonProps) {
  return (
    <Button 
      type="submit" 
      className="w-full"
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
  );
}
