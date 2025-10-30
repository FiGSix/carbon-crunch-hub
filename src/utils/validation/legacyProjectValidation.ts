/**
 * Validation utilities for legacy project creation
 */

export interface Step1Data {
  project_title: string;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone?: string;
  client_company_name?: string;
  agent_email: string;
}

export interface Step2Data {
  system_address: string;
  system_size_kwp: number;
  commissioning_date: string;
  signed_date: string;
  signed_pdf_url: string;
}

export interface Step3Data {
  inverter_brand?: string;
  inverter_model?: string;
  inverter_capacity_kw?: number;
  inverter_quantity?: number;
  inverter_serial?: string;
  panel_brand?: string;
  panel_size_wp?: number;
  panel_quantity?: number;
  battery_capacity_kwh?: number;
  battery_brand?: string;
  battery_model?: string;
  total_capex?: number;
  client_share_percentage?: number;
  agent_commission_percentage?: number;
}

export function validateStep1(data: Step1Data): string | null {
  if (!data.project_title?.trim()) return "Project title is required";
  if (!data.client_first_name?.trim()) return "Client first name is required";
  if (!data.client_last_name?.trim()) return "Client last name is required";
  if (!data.client_email?.trim()) return "Client email is required";
  if (!data.agent_email?.trim()) return "Agent email is required";
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.client_email)) {
    return "Invalid client email format";
  }
  if (!emailRegex.test(data.agent_email)) {
    return "Invalid agent email format";
  }
  
  return null;
}

export function validateStep2(data: Step2Data): string | null {
  if (!data.system_address?.trim()) return "System address is required";
  if (!data.system_size_kwp || data.system_size_kwp <= 0) {
    return "System size must be greater than 0";
  }
  if (!data.commissioning_date) return "Commissioning date is required";
  if (!data.signed_date) return "Signed date is required";
  if (!data.signed_pdf_url) return "Signed agreement PDF is required";
  
  const commissioningDate = new Date(data.commissioning_date);
  const signedDate = new Date(data.signed_date);
  
  if (isNaN(commissioningDate.getTime())) {
    return "Invalid commissioning date";
  }
  if (isNaN(signedDate.getTime())) {
    return "Invalid signed date";
  }
  
  return null;
}

export function validateStep3(data: Step3Data): string | null {
  if (data.inverter_capacity_kw && data.inverter_capacity_kw < 0) {
    return "Inverter capacity cannot be negative";
  }
  if (data.inverter_quantity && data.inverter_quantity < 0) {
    return "Inverter quantity cannot be negative";
  }
  if (data.panel_size_wp && data.panel_size_wp < 0) {
    return "Panel size cannot be negative";
  }
  if (data.panel_quantity && data.panel_quantity < 0) {
    return "Panel quantity cannot be negative";
  }
  if (data.battery_capacity_kwh && data.battery_capacity_kwh < 0) {
    return "Battery capacity cannot be negative";
  }
  if (data.total_capex && data.total_capex < 0) {
    return "Total CAPEX cannot be negative";
  }
  if (data.client_share_percentage && (data.client_share_percentage < 0 || data.client_share_percentage > 100)) {
    return "Client share percentage must be between 0 and 100";
  }
  if (data.agent_commission_percentage && (data.agent_commission_percentage < 0 || data.agent_commission_percentage > 100)) {
    return "Agent commission percentage must be between 0 and 100";
  }
  
  return null;
}
