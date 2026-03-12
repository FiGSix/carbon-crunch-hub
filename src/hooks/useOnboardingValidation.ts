import { useState, useCallback } from "react";
import { 
  validateField, 
  validateInverterDetail, 
  validatePanelArrayDetail 
} from "@/lib/validation/onboardingSchema";
import type { OnboardingFields } from "@/types/onboarding";
import type { InverterDetail } from "@/components/onboarding/InverterDetailsRow";
import type { PanelArrayDetail } from "@/components/onboarding/PanelArrayDetailsRow";

export interface ValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface UseOnboardingValidationResult {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  validateFieldOnBlur: (fieldName: string, value: any, formData?: Partial<OnboardingFields>) => void;
  validateInverters: (inverters: InverterDetail[]) => Record<string, string>;
  validatePanelArrays: (panels: PanelArrayDetail[]) => Record<string, string>;
  setFieldTouched: (fieldName: string) => void;
  clearFieldError: (fieldName: string) => void;
  getAllErrors: (
    formData: Partial<OnboardingFields>, 
    inverters: InverterDetail[], 
    panels: PanelArrayDetail[]
  ) => Record<string, string>;
  hasErrors: boolean;
  resetValidation: () => void;
}

export function useOnboardingValidation(): UseOnboardingValidationResult {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateFieldOnBlur = useCallback((fieldName: string, value: any, formData?: Partial<OnboardingFields>) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = validateField(fieldName, value, formData);
    setErrors(prev => {
      if (error) {
        return { ...prev, [fieldName]: error };
      } else {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  const validateInverters = useCallback((inverters: InverterDetail[]): Record<string, string> => {
    let allErrors: Record<string, string> = {};
    
    inverters.forEach((inverter, index) => {
      const inverterErrors = validateInverterDetail(inverter, index);
      allErrors = { ...allErrors, ...inverterErrors };
    });
    
    setErrors(prev => ({ ...prev, ...allErrors }));
    return allErrors;
  }, []);

  const validatePanelArrays = useCallback((panels: PanelArrayDetail[]): Record<string, string> => {
    let allErrors: Record<string, string> = {};
    
    panels.forEach((panel, index) => {
      const panelErrors = validatePanelArrayDetail(panel, index);
      allErrors = { ...allErrors, ...panelErrors };
    });
    
    setErrors(prev => ({ ...prev, ...allErrors }));
    return allErrors;
  }, []);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getAllErrors = useCallback((
    formData: Partial<OnboardingFields>,
    inverters: InverterDetail[],
    panels: PanelArrayDetail[]
  ): Record<string, string> => {
    const allErrors: Record<string, string> = {};
    
    // Detect multi-phase projects (dates live in phases_json, not commissioning_date)
    const isMultiPhase = Array.isArray(formData.phases_json) && formData.phases_json.length > 0;
    
    // System details validation
    const requiredFields = isMultiPhase
      ? ["system_address"]
      : ["system_address", "commissioning_date"];
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof OnboardingFields], formData);
      if (error) allErrors[field] = error;
    });
    
    // Multi-phase: validate each phase has a commission date
    if (isMultiPhase) {
      (formData.phases_json as Array<{ phaseNumber: number; phaseName?: string; commissionDate: string }>).forEach((phase, idx) => {
        if (!phase.commissionDate || phase.commissionDate.trim() === '') {
          allErrors[`phase_${idx}_date`] = `Phase ${phase.phaseName || idx + 1} requires a commission date`;
        }
      });
    }
    
    // Optional fields validation
    const optionalFields = ["system_name", "installer_email", "system_gps_lat", "system_gps_lng"];
    optionalFields.forEach(field => {
      const error = validateField(field, formData[field as keyof OnboardingFields], formData);
      if (error) allErrors[field] = error;
    });
    
    // Inverter validation
    const inverterQtyError = validateField("inverter_quantity", formData.inverter_quantity, formData);
    if (inverterQtyError) allErrors.inverter_quantity = inverterQtyError;
    
    inverters.forEach((inverter, index) => {
      const inverterErrors = validateInverterDetail(inverter, index);
      Object.assign(allErrors, inverterErrors);
    });
    
    // Panel array validation
    panels.forEach((panel, index) => {
      const panelErrors = validatePanelArrayDetail(panel, index);
      Object.assign(allErrors, panelErrors);
    });
    
    // Battery validation (conditional)
    if (formData.has_battery === true) {
      const batteryFields = ["battery_brand", "battery_capacity_kwh", "battery_cost"];
      batteryFields.forEach(field => {
        const error = validateField(field, formData[field as keyof OnboardingFields], formData);
        if (error) allErrors[field] = error;
      });
    }
    
    // Maintenance validation (conditional)
    if (formData.has_maintenance_agreement === true) {
      const maintenanceFields = ["maintenance_agreement_term_years", "maintenance_cost_annual"];
      maintenanceFields.forEach(field => {
        const error = validateField(field, formData[field as keyof OnboardingFields], formData);
        if (error) allErrors[field] = error;
      });
    }
    
    // Financial validation
    const capexError = validateField("total_capex", formData.total_capex, formData);
    if (capexError) allErrors.total_capex = capexError;
    
    return allErrors;
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateFieldOnBlur,
    validateInverters,
    validatePanelArrays,
    setFieldTouched,
    clearFieldError,
    getAllErrors,
    hasErrors: Object.keys(errors).length > 0,
    resetValidation,
  };
}
