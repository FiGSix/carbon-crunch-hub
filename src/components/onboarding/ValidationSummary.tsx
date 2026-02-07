import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ValidationSummaryProps {
  errors: Record<string, string>;
  title?: string;
}

// Group errors by section for better UX
const getSectionFromFieldName = (fieldName: string): string => {
  if (fieldName.startsWith("inverter_") || fieldName.includes("inverter")) {
    return "Inverter Details";
  }
  if (fieldName.startsWith("panel_") || fieldName.includes("panel")) {
    return "Panel Details";
  }
  if (fieldName.startsWith("battery_") || fieldName.includes("battery")) {
    return "Battery Details";
  }
  if (fieldName.startsWith("maintenance_") || fieldName.includes("maintenance")) {
    return "Operations & Maintenance";
  }
  if (fieldName === "total_capex") {
    return "Financial Details";
  }
  if (["provider", "site_id", "portal_url", "delegated_email", "api_key_encrypted"].includes(fieldName)) {
    return "Data Access";
  }
  return "System Details";
};

// Format field name for display
const formatFieldName = (fieldName: string): string => {
  // Handle indexed fields like inverter_0_brand
  const match = fieldName.match(/^(inverter|panel)_(\d+)_(.+)$/);
  if (match) {
    const [, type, index, field] = match;
    const formattedType = type === "inverter" ? "Inverter" : "Array";
    const formattedField = field
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return `${formattedType} ${parseInt(index) + 1} - ${formattedField}`;
  }
  
  // Handle regular field names
  return fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
};

export function ValidationSummary({ errors, title = "Please fix the following issues" }: ValidationSummaryProps) {
  if (Object.keys(errors).length === 0) {
    return null;
  }

  // Group errors by section
  const groupedErrors: Record<string, Array<{ field: string; message: string }>> = {};
  
  Object.entries(errors).forEach(([field, message]) => {
    const section = getSectionFromFieldName(field);
    if (!groupedErrors[section]) {
      groupedErrors[section] = [];
    }
    groupedErrors[section].push({ field, message });
  });

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
            <div key={section}>
              <p className="font-medium text-sm">{section}:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                {sectionErrors.map(({ field, message }) => (
                  <li key={field}>
                    <span className="text-muted-foreground">{formatFieldName(field)}:</span>{" "}
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
