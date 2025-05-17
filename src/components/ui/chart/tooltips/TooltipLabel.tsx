
import * as React from "react"
import { cn } from "@/lib/utils"
import { ChartConfig } from "../types"
import { getPayloadConfigFromPayload } from "../utils"

interface TooltipLabelProps {
  hideLabel?: boolean
  payload?: any[]
  label?: any
  labelFormatter?: (label: any, payload?: any) => React.ReactNode
  labelClassName?: string
  config: ChartConfig
  labelKey?: string
}

export function TooltipLabel({
  hideLabel,
  payload,
  label,
  labelFormatter,
  labelClassName,
  config,
  labelKey,
}: TooltipLabelProps) {
  if (hideLabel || !payload?.length) {
    return null
  }

  const [item] = payload
  const key = `${labelKey || item.dataKey || item.name || "value"}`
  const itemConfig = getPayloadConfigFromPayload(config, item, key)
  const value =
    !labelKey && typeof label === "string"
      ? config[label as keyof typeof config]?.label || label
      : itemConfig?.label

  if (labelFormatter) {
    return (
      <div className={cn("font-medium", labelClassName)}>
        {labelFormatter(value, payload)}
      </div>
    )
  }

  if (!value) {
    return null
  }

  return <div className={cn("font-medium", labelClassName)}>{value}</div>
}
