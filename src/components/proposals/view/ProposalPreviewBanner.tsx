
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, AlertTriangle } from "lucide-react";
import { ProposalData } from "@/types/proposals";

interface ProposalPreviewBannerProps {
  proposal: ProposalData;
}

export function ProposalPreviewBanner({ proposal }: ProposalPreviewBannerProps) {
  // Since preview functionality was removed, this component should not render anything
  // or could be used for other types of banners in the future
  return null;
}
