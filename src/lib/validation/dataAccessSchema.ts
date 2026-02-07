import { z } from "zod";

// List of valid providers
export const DATA_ACCESS_PROVIDERS = [
  "ABB", "Afore", "Alpha ESS", "Ario", "Atess", "BlueLog", "Deye", "Dyness",
  "Enphase", "FoxESS", "Fronius", "GivEnergy", "GoodWe", "Growatt", "Huawei",
  "Lux", "Megarevo", "Meteo Control", "SigEnergy", "Sineng", "Sivula", "SMA",
  "Solis", "SolarEdge", "Sungrow", "SunSynk", "Vcomms", "Victron", "Other"
] as const;

// Data access configuration schema
export const dataAccessConfigSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  site_id: z.string().max(100, "Site ID must be less than 100 characters").optional().nullable(),
  portal_url: z.string().url("Please enter a valid URL").optional().nullable().or(z.literal("")),
  credential_method: z.enum(["delegated_account", "api_key"]),
  delegated_email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  api_key_encrypted: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.credential_method === "api_key") {
      return !!data.api_key_encrypted && data.api_key_encrypted.length >= 10;
    }
    return true;
  },
  { message: "API key must be at least 10 characters", path: ["api_key_encrypted"] }
);

export type DataAccessConfigValidation = z.infer<typeof dataAccessConfigSchema>;

// Field-level validation for data access config
export const validateDataAccessField = (fieldName: string, value: any, formData?: any): string | null => {
  try {
    switch (fieldName) {
      case "provider":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return "Provider is required";
        }
        break;
      
      case "site_id":
        if (value && typeof value === "string" && value.length > 100) {
          return "Site ID must be less than 100 characters";
        }
        break;
      
      case "portal_url":
        if (value && typeof value === "string" && value.trim() !== "") {
          try {
            const url = new URL(value);
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(url.protocol)) {
              return "Please enter a valid URL (e.g., https://example.com)";
            }
          } catch {
            return "Please enter a valid URL (e.g., https://example.com)";
          }
        }
        break;
      
      case "delegated_email":
        if (value && typeof value === "string" && value.trim() !== "" && value !== "data@crunchcarbon.com") {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) return "Invalid email format";
        }
        break;
      
      case "api_key_encrypted":
        if (formData?.credential_method === "api_key") {
          if (!value || (typeof value === "string" && value.trim() === "")) {
            return "API key is required";
          }
          if (typeof value === "string" && value.length < 10) {
            return "API key must be at least 10 characters";
          }
        }
        break;
    }
    return null;
  } catch {
    return null;
  }
};

// Validate entire data access config
export const validateDataAccessConfig = (config: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const providerError = validateDataAccessField("provider", config.provider);
  if (providerError) errors.provider = providerError;
  
  const siteIdError = validateDataAccessField("site_id", config.site_id);
  if (siteIdError) errors.site_id = siteIdError;
  
  const portalUrlError = validateDataAccessField("portal_url", config.portal_url);
  if (portalUrlError) errors.portal_url = portalUrlError;
  
  const method = config.credential_method ?? "delegated_account";
  
  if (method === "delegated_account") {
    const emailError = validateDataAccessField("delegated_email", config.delegated_email);
    if (emailError) errors.delegated_email = emailError;
  }
  
  if (method === "api_key") {
    const apiKeyError = validateDataAccessField("api_key_encrypted", config.api_key_encrypted, config);
    if (apiKeyError) errors.api_key_encrypted = apiKeyError;
  }
  
  return errors;
};
