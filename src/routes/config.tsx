import { createFileRoute } from '@tanstack/react-router'
import { ConfigOverlay } from '../components/ConfigOverlay'

export const Route = createFileRoute('/config')({
  component: ConfigPage,
})

function ConfigPage() {
  return <ConfigOverlay />
}
