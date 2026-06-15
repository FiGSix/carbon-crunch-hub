import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface AccessNotEnabledProps {
  title?: string;
  description?: string;
}

export function AccessNotEnabled({
  title = "Access not enabled",
  description = "Direct proposal creation is not enabled on your account. Please contact your administrator to request access.",
}: AccessNotEnabledProps) {
  return (
    <div className="max-w-xl mx-auto py-12">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">{description}</CardContent>
      </Card>
    </div>
  );
}
