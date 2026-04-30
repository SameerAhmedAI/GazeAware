/**
 * GazeAware API service — uses relative URLs so Vite dev-server proxy handles routing.
 * All paths are proxied to http://localhost:8000 via vite.config.js.
 */

const get = (path) =>
  fetch(path).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

const post = (path) =>
  fetch(path, { method: 'POST' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

export const getSession             = () => get('/session')
export const getSnapshot            = () => get('/snapshot')
export const getSignalHistory       = () => get('/history/signals')
export const getPrescriptionHistory = () => get('/history/prescriptions')
export const getAcuityHistory       = () => get('/history/acuity')
export const getDegradationReport   = () => get('/report/degradation')
export const getWeeklyReport        = () => get('/report/weekly')

// Fix 3: Control endpoints
export const triggerPrescription  = () => post('/controls/prescription')
export const triggerBaseline      = () => post('/controls/baseline')
export const triggerTfsi          = () => post('/controls/tfsi')
export const triggerAcuity        = () => post('/controls/acuity')
// Fix 1B: Dismiss the active prescription banner
export const clearPrescription    = () => post('/controls/clear_prescription')
// Fix 6: Reset acuity test state machine to idle
export const resetAcuity          = () => post('/controls/acuity_reset')
