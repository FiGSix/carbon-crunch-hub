

import { ProjectInformation } from "@/types/proposals";
import { formatSystemSizeForDisplay, normalizeToKWp } from "@/lib/calculations/carbon/core";

interface ProjectInformationSectionProps {
  projectInfo: ProjectInformation;
}

export function ProjectInformationSection({ projectInfo }: ProjectInformationSectionProps) {
  const isKwhMode = projectInfo.generationInputMode === "kwh";
  const systemSizeKWp = normalizeToKWp(projectInfo.size);
  const formattedSize = formatSystemSizeForDisplay(systemSizeKWp);

  // Derive a displayable size when in kWh mode.
  let kwhDerivedSize = 0;
  if (isKwhMode) {
    const aggregate: Record<string, number> = {};
    if (projectInfo.isMultiPhase && projectInfo.phases) {
      projectInfo.phases.forEach((p) =>
        Object.entries(p.annualKwhByYear || {}).forEach(([y, v]) => {
          aggregate[y] = (aggregate[y] || 0) + (Number(v) || 0);
        })
      );
    } else {
      Object.entries(projectInfo.annualKwhByYear || {}).forEach(([y, v]) => {
        aggregate[y] = Number(v) || 0;
      });
    }
    const peak = Math.max(0, ...Object.values(aggregate));
    kwhDerivedSize = peak > 0 ? peak / 1642.5 : 0;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold text-carbon-gray-900">Project Information</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            isKwhMode
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          Generation source: {isKwhMode ? "User-supplied kWh" : "Calculated from kWp"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Project Name</p>
          <p className="font-medium">{projectInfo.name}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">System Size {isKwhMode ? "(derived)" : ""}</p>
          <p className="font-medium">
            {isKwhMode ? formatSystemSizeForDisplay(kwhDerivedSize) : formattedSize}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-carbon-gray-500">Address</p>
          <p className="font-medium">{projectInfo.address}</p>
          {projectInfo.gpsLat && projectInfo.gpsLng && (
            <p className="text-xs text-carbon-gray-500 mt-1">
              GPS: {projectInfo.gpsLat.toFixed(6)}, {projectInfo.gpsLng.toFixed(6)}
            </p>
          )}
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
            ) : (
              projectInfo.commissionDate && new Date(projectInfo.commissionDate).toLocaleDateString()
            )}
          </div>
        </div>
        {isKwhMode && (
          <div className="md:col-span-2">
            <p className="text-sm text-carbon-gray-500 mb-1">Estimated Annual Generation (kWh)</p>
            {projectInfo.isMultiPhase && projectInfo.phases ? (
              <div className="space-y-2">
                {projectInfo.phases.map((p, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{p.phaseName || `Phase ${p.phaseNumber}`}:</span>{" "}
                    {Object.entries(p.annualKwhByYear || {})
                      .filter(([, v]) => (v || 0) > 0)
                      .map(([y, v]) => `${y}: ${(v as number).toLocaleString()}`)
                      .join(" · ") || "—"}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm">
                {Object.entries(projectInfo.annualKwhByYear || {})
                  .filter(([, v]) => (v || 0) > 0)
                  .map(([y, v]) => `${y}: ${(v as number).toLocaleString()}`)
                  .join(" · ") || "—"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
