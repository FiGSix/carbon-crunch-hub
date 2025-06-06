
export interface CorrectionResult {
  client_reference_fixes: number;
  system_size_corrections: number;
  carbon_value_corrections: number;
  percentage_corrections: number;
  completed_at: string;
}

export type CorrectionFunction = 'update_system_size_kwp' | 'recalculate_carbon_values' | 'recalculate_proposal_percentages' | 'populate_missing_client_references';
