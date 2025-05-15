
import React from "react";
import Dashboard from "./Dashboard";
import { DashboardPreviewBanner } from "@/components/dashboard/sections/DashboardPreviewBanner";

const DashboardPreview = () => {
  // Use composition to wrap the Dashboard with preview-specific components
  return (
    <>
      <DashboardPreviewBanner />
      <Dashboard />
    </>
  );
};

export default DashboardPreview;
