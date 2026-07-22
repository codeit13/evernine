import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number // 0..100
  indicatorColor?: string // CSS color; defaults to primary
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorColor, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor: indicatorColor ?? "hsl(var(--primary))",
        }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
