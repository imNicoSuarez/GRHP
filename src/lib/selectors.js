// Lógica derivada de los datos (cobertura, semáforos, métricas, sugerencias de suplentes).
import { HOY, addDays, dow, DIAS_KEY, range, startOfWeek } from './dates.js'
import { kmRuta, haversine } from './geo.js'

export const NO_TRABAJA = ['ausente', 'licencia', 'cancelado']

export function indexarTurnos(turnos) {
  const porTiendaFecha = new Map()
  const porEmpleado = new Map()
  const porSuplente = new Map()
  const porId = new Map()
  for (const t of turnos) {
    const k = t.tiendaId + '|' + t.fecha
    if (!porTiendaFecha.has(k)) porTiendaFecha.set(k, [])
    porTiendaFecha.get(k).push(t)
    porId.set(t.id, t)
    if (t.tipo === 'normal') {
      if (!porEmpleado.has(t.empleadoId)) porEmpleado.set(t.empleadoId, [])
      porEmpleado.get(t.empleadoId).push(t)
    } else if (t.suplenteId) {
      if (!porSuplente.has(t.suplenteId)) porSuplente.set(t.suplenteId, [])
      porSuplente.get(t.suplenteId).push(t)
    } else if (t.empleadoId) {
      if (!porEmpleado.has(t.empleadoId)) porEmpleado.set(t.empleadoId, [])
      porEmpleado.get(t.empleadoId).push(t)
    }
  }
  return { porTiendaFecha, porEmpleado, porSuplente, porId, filasDia: (tid, f) => porTiendaFecha.get(tid + '|' + f) || [] }
}

export const abierta = (tienda, fecha) => tienda.diasAbierto.includes(dow(fecha))
export const cuentaPresente = (t) => !NO_TRABAJA.includes(t.estado)

// Estado de un turno (tienda, fecha, franja): requeridos / presentes / huecos
export function slot(idx, tienda, fecha, franja) {
  if (!abierta(tienda, fecha)) return { requeridos: 0, presentes: 0, huecos: 0, ausentes: [], filas: [] }
  const filas = idx.filasDia(tienda.id, fecha).filter((t) => t.franja === franja)
  const presentes = filas.filter(cuentaPresente).length
  const ausentes = filas.filter((t) => t.tipo === 'normal' && NO_TRABAJA.includes(t.estado))
  return { requeridos: tienda.dotacionPorTurno, presentes, huecos: Math.max(0, tienda.dotacionPorTurno - presentes), ausentes, filas }
}
export const huecosDia = (idx, tienda, fecha) => ['M', 'T'].reduce((s, f) => s + slot(idx, tienda, fecha, f).huecos, 0)

export function semaforoTienda(idx, tienda, { reintegros = [], ahora = HOY } = {}) {
  const motivos = []
  const hoy = huecosDia(idx, tienda, ahora)
  if (hoy > 0) motivos.push(`${hoy} hueco${hoy > 1 ? 's' : ''} hoy sin cubrir`)
  let prox = 0
  for (let d = 1; d <= 7; d++) prox += huecosDia(idx, tienda, addDays(ahora, d))
  if (prox > 0) motivos.push(`${prox} hueco${prox > 1 ? 's' : ''} en los próximos 7 días`)
  const ausHoy = ['M', 'T'].reduce((s, f) => s + slot(idx, tienda, ahora, f).ausentes.length, 0)
  if (ausHoy > 0 && hoy === 0) motivos.push(`${ausHoy} ausencia${ausHoy > 1 ? 's' : ''} hoy, cubierta${ausHoy > 1 ? 's' : ''}`)
  const rein = reintegros.filter((r) => r.tiendaId === tienda.id && r.estado === 'certificado_por_vencer')
  if (rein.length) motivos.push('Certificado por vencer')
  const nivel = hoy > 0 ? 'rojo' : prox > 0 || rein.length ? 'amarillo' : 'verde'
  return { nivel, motivos, huecosHoy: hoy, huecosProx: prox, ausHoy }
}

const pesoNivel = { verde: 0, amarillo: 1, rojo: 2 }
export const peorNivel = (niveles) => niveles.reduce((a, b) => (pesoNivel[b] > pesoNivel[a] ? b : a), 'verde')

// ── Ausencias ──
export function coberturaAusencia(idx, aus) {
  const filas = aus.turnoIds.map((id) => idx.porId.get(id)).filter(Boolean)
  const futuras = filas.filter((f) => f.fecha >= HOY)
  const cubiertas = filas.filter((f) => f.cubiertoPor).length
  const sinCubrirFut = futuras.filter((f) => !f.cubiertoPor)
  return { filas, total: filas.length, cubiertas, sinCubrirFut, abierta: sinCubrirFut.length > 0 && aus.estado !== 'rechazada' && aus.tipo !== 'licencia_xx' }
}

// ── Sugerencias de cobertura ──
const ocupadoSup = (idx, sid, fecha, ignorar = []) => (idx.porSuplente.get(sid) || []).some((r) => r.fecha === fecha && r.estado !== 'cancelado' && !ignorar.includes(r.cubreTurnoId))
const ocupadoEmp = (idx, eid, fecha) => (idx.porEmpleado.get(eid) || []).some((r) => r.fecha === fecha && cuentaPresente(r))

export function sugerirCobertura({ idx, tienda, filas, suplentes, empleados, tiendas, coberturas, ausenciaId, config }) {
  const claves = filas.map((f) => DIAS_KEY[dow(f.fecha)] + f.franja)
  const ofertas = coberturas.filter((c) => c.ausenciaId === ausenciaId)
  const pagoSup = (s, km) => filas.length * 8 * config.tarifaSuplenteHora[s.tipo] + (km > config.umbralViaticoKm ? km * config.viaticoPorKm : 0)
  const evalSup = (s) => {
    const km = kmRuta(s.base.lat, s.base.lon, tienda.lat, tienda.lon)
    const noDisp = filas.filter((f) => !s.disponibilidad[DIAS_KEY[dow(f.fecha)]].includes(f.franja))
    const choque = filas.filter((f) => ocupadoSup(idx, s.id, f.fecha))
    const prev = ofertas.find((o) => o.suplenteId === s.id && o.estado !== 'cancelada')
    const razones = []
    if (noDisp.length) razones.push('No marcó disponibilidad ese horario')
    if (choque.length) razones.push('Ya tiene otra cobertura ese día')
    if (prev) razones.push(prev.estado === 'rechazada' ? 'Ya rechazó esta oferta' : prev.estado === 'pendiente' ? 'Oferta ya enviada' : prev.estado === 'sin_respuesta' ? 'No respondió' : 'Ya aceptó')
    return { suplente: s, km, pago: pagoSup(s, km), elegible: !noDisp.length && !choque.length && !prev, razones, oferta: prev || null, score: s.calificacion }
  }
  const orden = (a, b) => (b.elegible - a.elegible) || (a.km - b.km) || (b.score - a.score)
  const zona = suplentes.filter((s) => s.regionId === tienda.regionId && s.zonas.includes(tienda.departamento)).map(evalSup).sort(orden)
  const otrasRegiones = suplentes.filter((s) => s.regionId !== tienda.regionId && s.zonas.includes(tienda.departamento)).map(evalSup).sort(orden)
  // Préstamos entre tiendas: empleados que no trabajan esa fecha, de tiendas a ≤ 300 km (primero la misma región)
  const prestamos = []
  for (const t of tiendas) {
    if (t.id === tienda.id) continue
    const km = kmRuta(t.lat, t.lon, tienda.lat, tienda.lon)
    if (km > 300) continue
    for (const e of empleados.filter((x) => x.tiendaId === t.id && !x.cargo.startsWith('Encargad'))) {
      if (filas.some((f) => ocupadoEmp(idx, e.id, f.fecha))) continue
      const prev = ofertas.find((o) => o.empleadoId === e.id && o.estado !== 'cancelada')
      prestamos.push({ empleado: e, tienda: t, km, pago: filas.length * 8 * config.valorHoraExtra + (km > config.umbralViaticoKm ? km * config.viaticoPorKm : 0), oferta: prev || null, misma: t.regionId === tienda.regionId })
    }
  }
  prestamos.sort((a, b) => (b.misma - a.misma) || (a.km - b.km))
  void claves
  return { zona, otrasRegiones, prestamos: prestamos.slice(0, 8), hayEnZona: zona.some((z) => z.elegible) }
}

// ── Métricas ──
export function filasNormalesRango(turnos, desde, hasta, tiendaIds) {
  return turnos.filter((t) => t.tipo === 'normal' && t.fecha >= desde && t.fecha <= hasta && (!tiendaIds || tiendaIds.has(t.tiendaId)))
}
export function metricas({ turnos, coberturas, horasExtras, config, desde, hasta, tiendaIds, empleadosCount }) {
  const filas = filasNormalesRango(turnos, desde, hasta, tiendaIds)
  const progr = filas.filter((t) => t.estado !== 'licencia').length
  const aus = filas.filter((t) => t.estado === 'ausente')
  const cub = aus.filter((t) => t.cubiertoPor).length
  const he = horasExtras.filter((h) => h.fecha >= desde && h.fecha <= hasta && (!tiendaIds || tiendaIds.has(h.tiendaId)) && h.estado !== 'rechazada')
  const horasHE = he.reduce((s, h) => s + h.horas, 0)
  const cob = coberturas.filter((c) => c.estado === 'aceptada' && c.fechaDesde >= desde && c.fechaDesde <= hasta && (!tiendaIds || tiendaIds.has(c.tiendaId)))
  const tiempo = cob.length ? cob.reduce((s, c) => s + (c.tiempoRespuestaMin ?? 0), 0) / cob.length : 0
  const costoHE = horasHE * config.valorHoraExtra
  const costoSup = cob.reduce((s, c) => s + c.pagoEstimado, 0)
  return {
    programados: progr, ausentes: aus.length, ausentismo: progr ? (aus.length / progr) * 100 : 0,
    cobertura: aus.length ? (cub / aus.length) * 100 : 100, cubiertos: cub, sinCubrir: aus.length - cub,
    horasHE, hePorPersona: empleadosCount ? horasHE / empleadosCount : 0, tiempoCobertura: tiempo, costoHE, costoSup, costo: costoHE + costoSup,
  }
}

export function semanas(desde, n) { return Array.from({ length: n }, (_, i) => { const d = addDays(startOfWeek(desde), i * 7); return [d, addDays(d, 6)] }) }

// Alertas: ¿siguen activas? (las de cobertura se resuelven solas al cubrir)
export function alertaActiva(a, { idx, ausencias, reintegros, licencias }) {
  if (a.resuelta) return false
  if (a.tipo === 'sin_cobertura') {
    const aus = ausencias.find((x) => x.id === a.ausenciaId)
    if (!aus) return false
    return coberturaAusencia(idx, aus).sinCubrirFut.length > 0
  }
  if (a.tipo === 'certificado_por_vencer') return reintegros.find((r) => r.id === a.reintegroId)?.estado === 'certificado_por_vencer'
  if (a.tipo === 'alta_proxima') return reintegros.find((r) => r.id === a.reintegroId)?.estado === 'alta_proxima'
  if (a.tipo === 'licencias_pendientes') return licencias.some((l) => l.estado === 'pendiente' && l.regionId === a.regionId && l.solicitadaEn < addDays(HOY, -2))
  return true
}

// A dónde lleva cada alerta (acción directa)
export function accionAlerta(a, rol) {
  switch (a.tipo) {
    case 'sin_cobertura': return { label: 'Asignar suplente', to: `/cobertura/${a.ausenciaId}` }
    case 'patron_faltas': return { label: 'Ver legajo y registrar seguimiento', to: `/equipo/${a.empleadoId}` }
    case 'horas_extras_region': return rol === 'supervisor' ? { label: 'Ver comparativa de la región', to: `/comparativas?region=${a.regionId}` } : { label: 'Revisar planificador', to: '/planificador' }
    case 'certificado_por_vencer': case 'alta_proxima': return { label: 'Abrir caso de reintegro', to: `/reintegros/${a.reintegroId}` }
    case 'elevacion': return { label: 'Abrir caso', to: `/reintegros/${a.reintegroId}` }
    case 'licencias_pendientes': return rol === 'supervisor' ? { label: 'Ver comparativa', to: `/comparativas?region=${a.regionId}` } : { label: 'Ir a la bandeja', to: '/bandeja?tab=licencias' }
    default: return { label: 'Ver', to: '/' }
  }
}

export { range, haversine }
