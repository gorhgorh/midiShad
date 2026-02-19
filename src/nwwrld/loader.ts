import { BaseThreeJsModule } from './BaseThreeJsModule'
import type { ModuleDefinition, ParamDescriptor, OptionDescriptor, ActionDescriptor } from '../types'

// Lazy dynamic importers — Vite resolves the file list at build time,
// but each module is fetched only when we call the loader function.
// Globals (ModuleBase, THREE, etc.) are already on globalThis via register.ts.
const moduleImports = import.meta.glob('/nw_wrld/modules/*.js') as Record<
  string,
  () => Promise<{ default: new (c: HTMLElement) => unknown; [k: string]: unknown }>
>

// Also try to load raw source for docblock metadata (name, category).
// This may fail in some environments — we fall back gracefully.
const moduleRawLoaders = import.meta.glob('/nw_wrld/modules/*.js', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

interface DocblockInfo {
  name: string
  category: string
}

function parseDocblock(source: string): DocblockInfo | null {
  const match = source.match(/\/\*[\s\S]*?\*\//)
  if (!match) return null
  const block = match[0]

  const nameMatch = block.match(/@nwWrld\s+name:\s*(.+)/)
  const categoryMatch = block.match(/@nwWrld\s+category:\s*(.+)/)

  if (!nameMatch || !categoryMatch) return null

  return {
    name: nameMatch[1].trim(),
    category: categoryMatch[1].trim(),
  }
}

interface MethodDef {
  name: string
  executeOnLoad: boolean
  options: Array<{
    name: string
    defaultVal: unknown
    type: string
    min?: number
    max?: number
    values?: string[]
  }>
}

function extractParams(
  methods: MethodDef[],
): { params: ParamDescriptor[]; options: OptionDescriptor[]; actions: ActionDescriptor[]; executeOnLoadMethods: ModuleDefinition['executeOnLoadMethods'] } {
  const params: ParamDescriptor[] = []
  const options: OptionDescriptor[] = []
  const actions: ActionDescriptor[] = []
  const executeOnLoadMethods: ModuleDefinition['executeOnLoadMethods'] = []
  const seenParams = new Set<string>()
  const seenOptions = new Set<string>()

  for (const method of methods) {
    const methodOptions = Array.isArray(method.options) ? method.options : []

    if (method.executeOnLoad) {
      const defaults: Record<string, unknown> = {}
      for (const opt of methodOptions) {
        defaults[opt.name] = opt.defaultVal
      }
      executeOnLoadMethods.push({ name: method.name, defaults })
    }

    // Methods with no options and not executeOnLoad are actions (trigger buttons)
    if (methodOptions.length === 0 && !method.executeOnLoad) {
      actions.push({
        name: method.name,
        label: method.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s) => s.toUpperCase())
          .trim(),
        methodName: method.name,
      })
    }

    for (const opt of methodOptions) {
      if (opt.type === 'number') {
        if (seenParams.has(opt.name)) continue
        seenParams.add(opt.name)

        const individualMethod = methods.find(
          (m) =>
            m.name !== 'allParams' &&
            Array.isArray(m.options) &&
            m.options.length === 1 &&
            m.options[0].name === opt.name,
        )

        params.push({
          name: opt.name,
          label: opt.name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
          min: opt.min ?? 0,
          max: opt.max ?? (typeof opt.defaultVal === 'number' && opt.defaultVal > 1
            ? Math.ceil(opt.defaultVal * 2)
            : 1),
          default: typeof opt.defaultVal === 'number' ? opt.defaultVal : 0,
          methodName: individualMethod?.name ?? method.name,
        })
      } else {
        if (seenOptions.has(opt.name)) continue
        seenOptions.add(opt.name)

        options.push({
          name: opt.name,
          label: opt.name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
          type: opt.type,
          defaultVal: opt.defaultVal,
          values: opt.values,
          min: opt.min,
          max: opt.max,
          methodName: method.name,
        })
      }
    }
  }

  return { params, options, actions, executeOnLoadMethods }
}

export async function loadModules(): Promise<ModuleDefinition[]> {
  const defs: ModuleDefinition[] = []

  for (const [path, importModule] of Object.entries(moduleImports)) {
    const id = path.split('/').pop()!.replace('.js', '')

    // Try to get docblock metadata from raw source
    let docblock: DocblockInfo | null = null
    const rawLoader = moduleRawLoaders[path]
    if (rawLoader) {
      try {
        const rawText = await rawLoader()
        docblock = parseDocblock(rawText)
      } catch {
        // ?raw loading failed — fall back to filename-based metadata
      }
    }

    // Dynamically import the module as an ES module.
    // Globals (ModuleBase, THREE, etc.) are on globalThis via register.ts.
    let ModClass: (new (c: HTMLElement) => unknown) | null = null
    try {
      const mod = await importModule()
      ModClass = mod.default as new (c: HTMLElement) => unknown
    } catch (err) {
      console.error(`[loader] Failed to import ${path}:`, err)
      continue
    }

    if (!ModClass || typeof ModClass !== 'function') {
      console.warn(`[loader] ${path}: no default export class`)
      continue
    }

    const methods: MethodDef[] = (ModClass as unknown as { methods?: MethodDef[] }).methods ?? []
    const { params, options, actions, executeOnLoadMethods } = extractParams(methods)

    // Derive name + category: prefer docblock, fall back to filename / class inspection
    const name = docblock?.name ?? id
    const category =
      docblock?.category ??
      (ModClass.prototype instanceof BaseThreeJsModule ? '3D' : '2D')

    defs.push({
      id,
      name,
      category,
      moduleClass: ModClass as ModuleDefinition['moduleClass'],
      params,
      options,
      actions,
      executeOnLoadMethods,
    })
  }

  defs.sort((a, b) => a.name.localeCompare(b.name))
  return defs
}
