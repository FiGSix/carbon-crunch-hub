
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DashboardPreviewBannerProps {
  isPreview: boolean;
}

export function DashboardPreviewBanner({ isPreview }: DashboardPreviewBannerProps) {
  const navigate = useNavigate();

  if (!isPreview) {
    return null;
  }

  return (
    <div className="bg-crunch-yellow/10 py-3 px-4 rounded-lg mb-6 flex items-center justify-between">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-crunch-yellow mr-2" />
        <p className="text-sm font-medium">This is a preview of the new dashboard design. <span className="font-bold">No functionality has changed.</span></p>
      </div>
      <Button 
        variant="outline"
        size="sm"
        onClick={() => navigate('/dashboard')}
      >
        Go back to current dashboard
      </Button>
    </div>
  );
}
