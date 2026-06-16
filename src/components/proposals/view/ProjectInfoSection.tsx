

import { ProjectInformation } from "@/types/proposals";

interface ProjectInfoSectionProps {
  projectInfo: Partial<ProjectInformation>;
}

export function ProjectInfoSection({ projectInfo }: ProjectInfoSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Project Name</p>
          <p className="font-medium">{projectInfo.name || "Not specified"}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">System Size</p>
          <p className="font-medium">{parseFloat(Number(projectInfo.size || 0).toFixed(3))} kWp</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-carbon-gray-500">Address</p>
          <p className="font-medium">{projectInfo.address || "Not specified"}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Commission Date{projectInfo.isMultiPhase && projectInfo.phases ? 's' : ''}</p>
          <div className="font-medium">
            {projectInfo.isMultiPhase && projectInfo.phases && projectInfo.phases.length > 0 ? (
              <div className="space-y-1">
                {projectInfo.phases.map((phase: any, idx: number) => (
                  <div key={idx}>
                    {phase.phaseName || `Phase ${phase.phaseNumber}`}: {new Date(phase.commissionDate).toLocaleDateString()}
                  </div>
                ))}
              </div>
            ) : projectInfo.commissionDate ? (
              new Date(projectInfo.commissionDate).toLocaleDateString()
            ) : (
              "Not specified"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
