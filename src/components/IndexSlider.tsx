import { Slider } from '@/components/ui/slider'

interface IndexSliderProps {
  values: string[]
  index: number
  onChange: (index: number) => void
}

export function IndexSlider({ values, index, onChange }: IndexSliderProps) {
  const safeIndex = Math.max(0, Math.min(values.length - 1, index))

  return (
    <div className="flex items-center gap-1.5 flex-1">
      <Slider
        min={0}
        max={values.length - 1}
        step={1}
        value={[safeIndex]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="text-[10px] text-white/70 min-w-[40px] text-right truncate" title={values[safeIndex]}>
        {values[safeIndex]}
      </span>
    </div>
  )
}
