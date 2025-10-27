
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RegisterPersonalInfo } from "@/components/auth/RegisterPersonalInfo";
import { RegisterCredentials } from "@/components/auth/RegisterCredentials";
import { RegisterSubmitButton } from "@/components/auth/RegisterSubmitButton";
import { useRegistrationFormLogic } from './useRegistrationFormLogic';

interface RegistrationFormProps {
  proposalId: string;
  clientEmail: string;
  onComplete: () => void;
  onError?: (errorMessage: string) => void;
}

export function RegistrationForm({ proposalId, clientEmail, onComplete, onError }: RegistrationFormProps) {
  const {
    firstName,
    lastName,
    password,
    confirmPassword,
    loading,
    error,
    handleChange,
    handleSignUp
  } = useRegistrationFormLogic(proposalId, clientEmail, onComplete, onError);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Create your account to approve or reject this proposal. We'll use {clientEmail} for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <RegisterPersonalInfo
            firstName={firstName}
            lastName={lastName}
            companyName=""
            showCompanyField={false}
            onChange={handleChange}
            disabled={loading}
          />
          
          <div className="space-y-2">
            <RegisterCredentials
              email={clientEmail}
              password={password}
              confirmPassword={confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          
          <RegisterSubmitButton isLoading={loading} />
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Already have an account? Switch to "Returning User" above.
        </p>
      </CardFooter>
    </Card>
  );
}
