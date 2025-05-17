
import { ChartConfig } from "../types"

/**
 * Helper to get item configuration from tooltip payload
 */
export function getItemConfigFromPayload(
  config: ChartConfig,
  item: any,
  key: string
) {
  const itemKey = `${key || item.dataKey || item.name || "value"}`
  return config[itemKey as keyof typeof config]
}

/**
 * Format a tooltip value for display
 */
export function formatTooltipValue(value: number): string {
  return value.toLocaleString()
}
