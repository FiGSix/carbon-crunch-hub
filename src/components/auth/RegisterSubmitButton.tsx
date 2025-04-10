
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
          <span className="animate-pulse">Creating Account...</span>
        </>
      ) : (
        "Create Account"
      )}
    </Button>
  );
}
