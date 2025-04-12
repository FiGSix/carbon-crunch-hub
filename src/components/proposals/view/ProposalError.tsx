
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProposalErrorProps {
  errorMessage: string;
}

export function ProposalError({ errorMessage }: ProposalErrorProps) {
  const navigate = useNavigate();
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <Card className="retro-card">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>There was a problem loading this proposal</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-carbon-gray-700">{errorMessage}</p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="retro-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
