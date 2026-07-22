// Shared themed tooltip for Recharts.
interface Item {
  name?: string
  value?: number | string
  color?: string
  payload?: any
  dataKey?: string | number
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean
  payload?: Item[]
  label?: string
  formatter?: (value: any, name: any, item: Item) => React.ReactNode
  labelFormatter?: (label: any) => React.ReactNode
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <div className="mb-1 font-medium text-popover-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {item.color && (
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">
              {formatter ? formatter(item.value, item.name, item) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
