import { useParams, useSearchParams } from "react-router-dom";
import { useCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { useCalculatorResultsAuth } from "@/hooks/calculator/useCalculatorResultsAuth";
import { CalculatorResultsContent } from "./calculator/CalculatorResultsContent";

export default function CalculatorResults() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { data: result, isLoading, error } = useCalculatorResults(id || "", token || "");
  const auth = useCalculatorResultsAuth(result, result?.email || null, token);

  return (
    <CalculatorResultsContent
      result={result}
      loading={isLoading}
      error={error}
      token={token}
      user={auth.user}
      showAuthForm={auth.showAuthForm}
      handleAuthComplete={auth.handleAuthComplete}
      showSignInPrompt={auth.showSignInPrompt}
      handleSignInClick={auth.handleSignInClick}
    />
  );
}
