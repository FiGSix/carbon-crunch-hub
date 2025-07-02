/**
 * Carbon calculation constants
 */
export const DEFAULT_ANNUAL_GENERATION_FACTOR = 1642.50; // kWh per kWp per year
export const DEFAULT_CARBON_FACTOR = 1.0334; // kg CO2 per MWh
export const DEFAULT_CLIENT_SHARE = 75; // 75%
export const AGENT_COMMISSION_LOW = 4; // 4% for agents with fewer signed projects
export const AGENT_COMMISSION_HIGH = 7; // 7% for agents with more signed projects
// Crunch commission is calculated dynamically: 100% - Client Share % - Agent Commission %