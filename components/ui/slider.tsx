import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const values = value ?? defaultValue ?? [min]
  const thumbs = Array.isArray(values) ? values : [values]

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full flex-col gap-4 py-4", className)}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 h-5">
        <SliderPrimitive.Track
          className="relative grow overflow-hidden rounded-full bg-white/10 select-none h-1.5 w-full"
        >
          <SliderPrimitive.Indicator
            className="bg-accent select-none h-full"
          />
        </SliderPrimitive.Track>
        {thumbs.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="relative block size-5 shrink-0 rounded-full border-2 border-accent bg-white shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-transform select-none hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing z-20"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
