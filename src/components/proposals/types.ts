
export type FormStep = "eligibility" | "client" | "project" | "summary";

export interface EligibilityCriteria {
  inSouthAfrica: boolean;
  notRegistered: boolean;
  under15MWp: boolean;
  commissionedAfter2022: boolean;
  legalOwnership: boolean;
}

export interface ClientInformation {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  existingClient: boolean;
}

export interface ProjectInformation {
  name: string;
  address: string;
  size: string;
  commissionDate: string;
  additionalNotes: string;
}
