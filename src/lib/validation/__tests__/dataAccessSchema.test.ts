import { describe, it, expect } from "vitest";
import { 
  validateDataAccessField, 
  validateDataAccessConfig 
} from "../dataAccessSchema";

describe("dataAccessSchema - validateDataAccessField", () => {
  describe("provider validation", () => {
    it("should return error for empty provider", () => {
      expect(validateDataAccessField("provider", "")).toBe("Provider is required");
      expect(validateDataAccessField("provider", null)).toBe("Provider is required");
    });

    it("should return null for valid provider", () => {
      expect(validateDataAccessField("provider", "Huawei")).toBeNull();
      expect(validateDataAccessField("provider", "SolarEdge")).toBeNull();
    });
  });

  describe("site_id validation", () => {
    it("should return null for empty value (optional)", () => {
      expect(validateDataAccessField("site_id", "")).toBeNull();
      expect(validateDataAccessField("site_id", null)).toBeNull();
    });

    it("should return error for value over 100 characters", () => {
      const longString = "a".repeat(101);
      expect(validateDataAccessField("site_id", longString)).toBe("Site ID must be less than 100 characters");
    });

    it("should return null for valid site_id", () => {
      expect(validateDataAccessField("site_id", "SITE123456")).toBeNull();
    });
  });

  describe("portal_url validation", () => {
    it("should return null for empty value (optional)", () => {
      expect(validateDataAccessField("portal_url", "")).toBeNull();
      expect(validateDataAccessField("portal_url", null)).toBeNull();
    });

    it("should return error for invalid URL", () => {
      expect(validateDataAccessField("portal_url", "not-a-url")).toBe("Please enter a valid URL (e.g., https://example.com)");
      expect(validateDataAccessField("portal_url", "ftp://invalid.com")).toBe("Please enter a valid URL (e.g., https://example.com)");
      expect(validateDataAccessField("portal_url", "javascript:alert(1)")).toBe("Please enter a valid URL (e.g., https://example.com)");
    });

    it("should return null for valid URL", () => {
      expect(validateDataAccessField("portal_url", "https://monitoring.example.com")).toBeNull();
      expect(validateDataAccessField("portal_url", "http://portal.test.com/dashboard")).toBeNull();
    });
  });

  describe("delegated_email validation", () => {
    it("should return null for default email", () => {
      expect(validateDataAccessField("delegated_email", "data@crunchcarbon.com")).toBeNull();
    });

    it("should return null for empty value", () => {
      expect(validateDataAccessField("delegated_email", "")).toBeNull();
    });

    it("should return error for invalid email", () => {
      expect(validateDataAccessField("delegated_email", "invalid-email")).toBe("Invalid email format");
    });

    it("should return null for valid custom email", () => {
      expect(validateDataAccessField("delegated_email", "custom@company.com")).toBeNull();
    });
  });

  describe("api_key_encrypted validation (conditional)", () => {
    it("should return null when credential_method is delegated_account", () => {
      expect(validateDataAccessField("api_key_encrypted", "", { credential_method: "delegated_account" })).toBeNull();
    });

    it("should return error when credential_method is api_key and value is empty", () => {
      expect(validateDataAccessField("api_key_encrypted", "", { credential_method: "api_key" })).toBe("API key is required");
      expect(validateDataAccessField("api_key_encrypted", null, { credential_method: "api_key" })).toBe("API key is required");
    });

    it("should return error when api_key is less than 10 characters", () => {
      expect(validateDataAccessField("api_key_encrypted", "short", { credential_method: "api_key" })).toBe("API key must be at least 10 characters");
    });

    it("should return null for valid api_key", () => {
      expect(validateDataAccessField("api_key_encrypted", "verylongapikey123", { credential_method: "api_key" })).toBeNull();
    });
  });
});

describe("dataAccessSchema - validateDataAccessConfig", () => {
  it("should return error for missing provider", () => {
    const errors = validateDataAccessConfig({ credential_method: "delegated_account" });
    expect(errors.provider).toBe("Provider is required");
  });

  it("should return api_key error when method is api_key and key is missing", () => {
    const errors = validateDataAccessConfig({
      provider: "Huawei",
      credential_method: "api_key",
      api_key_encrypted: ""
    });
    expect(errors.api_key_encrypted).toBe("API key is required");
  });

  it("should return empty object for valid delegated_account config", () => {
    const errors = validateDataAccessConfig({
      provider: "Huawei",
      credential_method: "delegated_account",
      delegated_email: "data@crunchcarbon.com"
    });
    expect(Object.keys(errors).length).toBe(0);
  });

  it("should return empty object for valid api_key config", () => {
    const errors = validateDataAccessConfig({
      provider: "SolarEdge",
      credential_method: "api_key",
      api_key_encrypted: "valid_api_key_12345"
    });
    expect(Object.keys(errors).length).toBe(0);
  });

  it("should validate portal_url when provided", () => {
    const errors = validateDataAccessConfig({
      provider: "Huawei",
      credential_method: "delegated_account",
      portal_url: "not-a-valid-url"
    });
    expect(errors.portal_url).toBe("Please enter a valid URL (e.g., https://example.com)");
  });
});
