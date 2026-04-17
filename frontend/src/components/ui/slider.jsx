import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, trackColor, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center h-8", className)}
    {...props}>
    <SliderPrimitive.Track
      className="relative h-[6px] w-full grow overflow-hidden rounded-full bg-white/8">
      <SliderPrimitive.Range 
        className="absolute h-full rounded-full transition-all" 
        style={{ 
          backgroundColor: trackColor || 'hsl(var(--primary))',
          boxShadow: trackColor ? `0 0 10px ${trackColor}40` : 'none'
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-pointer" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
