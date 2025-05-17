
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"
import { useChart } from "./ChartContext"
import { TooltipItem } from "./tooltips/TooltipItem"
import { TooltipLabel } from "./tooltips/TooltipLabel"

export const ChartTooltip = RechartsPrimitive.Tooltip

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()
    const nestLabel = payload?.length === 1 && indicator !== "dot"

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? (
          <TooltipLabel 
            hideLabel={hideLabel}
            payload={payload}
            label={label}
            labelFormatter={labelFormatter}
            labelClassName={labelClassName}
            config={config}
            labelKey={labelKey}
          />
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => (
            <TooltipItem
              key={item.dataKey}
              item={item}
              index={index}
              indicator={indicator}
              hideIndicator={hideIndicator}
              formatter={formatter}
              color={color}
              nameKey={nameKey}
              nestLabel={nestLabel}
              config={config}
            />
          ))}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"
