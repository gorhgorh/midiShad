import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { useMidiStore } from '@/store/midiStore'
import { useClockStore, type ClockSource } from '@/store/clockStore'
import { useUiStore, type UiScale } from '@/store/uiStore'

interface AppSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SCALES: { value: UiScale; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'big', label: 'Big' },
]

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const devices = useMidiStore((s) => s.devices)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const setSelectedDevice = useMidiStore((s) => s.setSelectedDevice)
  const bpm = useClockStore((s) => s.bpm)
  const setBpm = useClockStore((s) => s.setBpm)
  const clockSource = useClockStore((s) => s.source)
  const setClockSource = useClockStore((s) => s.setSource)
  const scale = useUiStore((s) => s.scale)
  const setScale = useUiStore((s) => s.setScale)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ui-chrome sm:max-w-[400px] bg-black/95 border-border p-6">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Application settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-2">
          <div className="space-y-2">
            <Label>UI Scale</Label>
            <ButtonGroup>
              {SCALES.map((s) => (
                <Button
                  key={s.value}
                  size="xs"
                  variant="outline"
                  className={scale === s.value
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                  onClick={() => setScale(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="space-y-2">
            <Label>MIDI Device</Label>
            <Select
              value={selectedDeviceId ?? '__none__'}
              onValueChange={(v) => setSelectedDevice(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name || d.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Clock Source</Label>
            <ButtonGroup>
              {(['manual', 'midi'] as const).map((src) => (
                <Button
                  key={src}
                  size="xs"
                  variant="outline"
                  className={clockSource === src
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                  onClick={() => setClockSource(src as ClockSource)}
                >
                  {src === 'manual' ? 'Manual' : 'MIDI Clock'}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {clockSource === 'manual' && (
            <div className="space-y-2">
              <Label>BPM</Label>
              <Input
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 20 && v <= 300) setBpm(v)
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-24"
              />
            </div>
          )}

          {clockSource === 'midi' && (
            <div className="text-xs text-white">
              BPM: {bpm} (from MIDI clock)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
