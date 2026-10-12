// Utilidades de fecha (sin dependencias). Las fechas se manejan como 'YYYY-MM-DD' y se muestran dd/mm/aaaa.
export const HOY = '2026-10-12' // "hoy" fijo de la demo (lunes)
export const AHORA = '2026-10-12T07:50:00' // hora simulada de la demo
export const DIAS_KEY = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']

const parse = (s) => new Date(s.slice(0, 10) + 'T12:00:00Z')
const toIso = (d) => d.toISOString().slice(0, 10)
export const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return toIso(d) }
export const dow = (s) => (parse(s).getUTCDay() + 6) % 7 // 0 = lunes
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000)
export const startOfWeek = (s) => addDays(s, -dow(s))
export const range = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out }
export const fmt = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '')
export const fmtCorto = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '')
export const fmtDia = (s) => `${DIAS_CORTO[dow(s)]} ${fmtCorto(s)}`
export const fmtDiaLargo = (s) => `${DIAS[dow(s)]} ${Number(s.slice(8, 10))} de ${MESES[Number(s.slice(5, 7)) - 1]}`
export const fmtFechaHora = (s) => (s ? `${fmt(s)} ${s.slice(11, 16)}` : '')
export const hora = (s) => s.slice(11, 16)
export const addMin = (dt, m) => {
  const d = new Date(dt.slice(0, 19) + 'Z'); d.setUTCMinutes(d.getUTCMinutes() + m)
  return d.toISOString().slice(0, 19)
}
export const minDiff = (a, b) => Math.round((new Date(b.slice(0, 19) + 'Z') - new Date(a.slice(0, 19) + 'Z')) / 60000)
export const hace = (dt) => {
  const m = minDiff(dt, AHORA)
  if (m < 0) return 'en breve'
  if (m < 60) return `hace ${m} min`
  if (m < 1440) return `hace ${Math.floor(m / 60)} h`
  return `hace ${Math.floor(m / 1440)} d`
}
