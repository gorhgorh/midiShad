import {
  Dialog,
  DialogContent,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMidiStore } from '@/store/midiStore'
import { useClockStore, type ClockSource } from '@/store/clockStore'

interface AppSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const devices = useMidiStore((s) => s.devices)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const setSelectedDevice = useMidiStore((s) => s.setSelectedDevice)
  const bpm = useClockStore((s) => s.bpm)
  const setBpm = useClockStore((s) => s.setBpm)
  const clockSource = useClockStore((s) => s.source)
  const setClockSource = useClockStore((s) => s.setSource)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-black/95 border-border">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 px-2">
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
            <ToggleGroup
              type="single"
              value={clockSource}
              onValueChange={(v) => v && setClockSource(v as ClockSource)}
              className="justify-start"
            >
              <ToggleGroupItem value="manual" className="h-7 px-3 text-xs">Manual</ToggleGroupItem>
              <ToggleGroupItem value="midi" className="h-7 px-3 text-xs">MIDI Clock</ToggleGroupItem>
            </ToggleGroup>
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
