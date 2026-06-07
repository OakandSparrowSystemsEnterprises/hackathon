// Copies the Next.js static export (frontend/out) into the repo-root ui/
// directory that FastAPI serves. Cross-platform, no dependencies.
import { rm, cp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'out')
const ui = join(here, '..', '..', 'ui')

await rm(ui, { recursive: true, force: true })
await cp(out, ui, { recursive: true })
console.log(`Exported ${out} -> ${ui}`)
