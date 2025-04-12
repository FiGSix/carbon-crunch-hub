
import React from "react";
import { ProjectInformation } from "../types";

interface ProjectInformationSectionProps {
  projectInfo: ProjectInformation;
}

export function ProjectInformationSection({ projectInfo }: ProjectInformationSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Project Name</p>
          <p className="font-medium">{projectInfo.name}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">System Size</p>
          <p className="font-medium">{projectInfo.size} MWp</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-carbon-gray-500">Address</p>
          <p className="font-medium">{projectInfo.address}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Commission Date</p>
          <p className="font-medium">{projectInfo.commissionDate && new Date(projectInfo.commissionDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
