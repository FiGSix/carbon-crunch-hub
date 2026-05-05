export interface PartnerScope {
  id: string;
  label: string;
  description: string;
}

export const AVAILABLE_SCOPES: PartnerScope[] = [
  { id: "proposals:create", label: "Create Proposals", description: "Create new proposals" },
  { id: "proposals:read", label: "Read Proposals", description: "View proposal details" },
  { id: "proposals:acceptance", label: "Send Acceptance Links", description: "Trigger client acceptance emails" },
  { id: "projects:onboarding:read", label: "Read Onboarding", description: "View project onboarding status" },
  { id: "projects:onboarding:write", label: "Write Onboarding", description: "Update project onboarding data" },
  { id: "projects:documents:write", label: "Upload Documents", description: "Upload project documents" },
  { id: "projects:data-access:write", label: "Configure Data Access", description: "Set up monitoring access" },
];
