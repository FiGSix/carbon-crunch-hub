-- Phase 2A: Allow public read access to carbon_prices setting
-- This enables unauthenticated users to fetch carbon prices for the calculator
-- while keeping all other system_settings operations admin-only

CREATE POLICY "system_settings_carbon_prices_public_read"
ON system_settings FOR SELECT 
USING (setting_key = 'carbon_prices');