

import { ProjectInformation } from "@/types/proposals";

interface ProjectInfoSectionProps {
  projectInfo: Partial<ProjectInformation>;
}

const fmtKwh = (v: number) => `${Math.round(v).toLocaleString("en-ZA")} kWh`;

export function ProjectInfoSection({ projectInfo }: ProjectInfoSectionProps) {
  const isKwh = projectInfo.generationInputMode === "kwh";
  const isMultiPhase = projectInfo.isMultiPhase && projectInfo.phases && projectInfo.phases.length > 0;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Project Name</p>
          <p className="font-medium">{projectInfo.name || "Not specified"}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">
            {isKwh ? "Estimated Annual Generation" : "System Size"}
          </p>
          {isKwh ? (
            isMultiPhase ? (
              <div className="space-y-2">
                {projectInfo.phases!.map((p: any, idx: number) => {
                  const grid = (p.annualKwhByYear || {}) as Record<string, number | undefined>;
                  const entries = Object.entries(grid).filter(([, v]) => (Number(v) || 0) > 0);
                  return (
                    <div key={idx} className="text-sm">
                      <div className="font-medium">{p.phaseName || `Phase ${p.phaseNumber || idx + 1}`}</div>
                      {entries.length > 0 ? (
                        <ul className="ml-2">
                          {entries.map(([y, v]) => (
                            <li key={y}>{y}: {fmtKwh(Number(v))}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-carbon-gray-500">No kWh entered</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="font-medium text-sm">
                {Object.entries(projectInfo.annualKwhByYear || {})
                  .filter(([, v]) => (Number(v) || 0) > 0)
                  .map(([y, v]) => (
                    <li key={y}>{y}: {fmtKwh(Number(v))}</li>
                  ))}
                {Object.values(projectInfo.annualKwhByYear || {}).every((v) => !(Number(v) > 0)) && (
                  <li className="text-carbon-gray-500 font-normal">Not specified</li>
                )}
              </ul>
            )
          ) : (
            <p className="font-medium">
              {parseFloat(Number(projectInfo.size || projectInfo.totalSystemSize || 0).toFixed(3))} kWp
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-carbon-gray-500">Address</p>
          <p className="font-medium">{projectInfo.address || "Not specified"}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Commission Date{isMultiPhase ? 's' : ''}</p>
          <div className="font-medium">
            {isMultiPhase ? (
              <div className="space-y-1">
                {projectInfo.phases!.map((phase: any, idx: number) => (
                  <div key={idx}>
                    {phase.phaseName || `Phase ${phase.phaseNumber}`}: {phase.commissionDate ? new Date(phase.commissionDate).toLocaleDateString() : "—"}
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
