// Shell shim. Imports the active chrome stylesheet and re-exports the active
// shell so routes/tests keep importing `@/components/flow/FlowShell`. Swapping
// shells means editing this file only.
import '@/styles/flow.css'
export { FlowShell } from '@/shell/pilot-v1/FlowShell'
