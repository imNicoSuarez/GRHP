// Estado de la demo: datos estáticos + datos mutables en memoria (persisten durante la sesión del navegador).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AHORA, HOY, addDays, addMin, dow, minDiff, range } from './dates.js'
import { indexarTurnos, coberturaAusencia, NO_TRABAJA } from './selectors.js'

const ARCHIVOS = ['empresa', 'regiones', 'tiendas', 'empleados', 'suplentes', 'turnos', 'ausencias', 'licencias', 'coberturas', 'reintegros', 'horas_extras', 'alertas', 'usuarios', 'notificaciones', 'cambios_turno']
const MUTABLES = ['empleados', 'suplentes', 'turnos', 'ausencias', 'licencias', 'coberturas', 'reintegros', 'horasExtras', 'alertas', 'notificaciones', 'cambios', 'config', 'notasLegajo']
const SS_KEY = 'pagnifique-demo-v1'
const T0 = Date.now()
// Reloj simulado: arranca a las 07:50 del "hoy" de la demo y avanza con el tiempo real.
export const ahoraSim = () => addMin(AHORA, Math.floor((Date.now() - T0) / 60000))

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export async function cargarDatos() {
  const res = await Promise.all(ARCHIVOS.map((a) => fetch(`${import.meta.env.BASE_URL}data/${a}.json`).then((r) => { if (!r.ok) throw new Error('No se pudo cargar ' + a); return r.json() })))
  const d = Object.fromEntries(ARCHIVOS.map((a, i) => [a, res[i]]))
  return {
    empresa: d.empresa, regiones: d.regiones, tiendas: d.tiendas, usuarios: d.usuarios,
    empleados: d.empleados, suplentes: d.suplentes, turnos: d.turnos, ausencias: d.ausencias, licencias: d.licencias, coberturas: d.coberturas,
    reintegros: d.reintegros, horasExtras: d.horas_extras, alertas: d.alertas, notificaciones: d.notificaciones, cambios: d.cambios_turno,
    config: d.empresa.config, notasLegajo: [],
  }
}

const pad = (n, l = 3) => String(n).padStart(l, '0')
const nextId = (arr, pref, l = 3) => pref + pad(arr.reduce((m, x) => Math.max(m, parseInt(x.id.slice(pref.length)) || 0), 0) + 1, l)

export function AppProvider({ inicial, children }) {
  const original = useRef(inicial)
  const [data, setData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) { const s = JSON.parse(raw); return { ...inicial, ...s } }
    } catch { /* sin storage */ }
    return inicial
  })
  const [usuarioId, setUsuarioId] = useState(() => { try { return sessionStorage.getItem(SS_KEY + '-user') || 'U-EMP-1' } catch { return 'U-EMP-1' } })
  const [toast, setToast] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(Object.fromEntries(MUTABLES.map((k) => [k, data[k]])))) } catch { /* cuota */ }
  }, [data])
  useEffect(() => { try { sessionStorage.setItem(SS_KEY + '-user', usuarioId) } catch { /* noop */ } }, [usuarioId])

  const avisar = useCallback((msg, tono = 'ok') => { setToast({ msg, tono, k: Date.now() }); setTimeout(() => setToast((t) => (t && Date.now() - t.k >= 3500 ? null : t)), 3600) }, [])

  const mutar = useCallback((fn) => {
    setData((prev) => {
      const draft = {}
      for (const k of MUTABLES) draft[k] = structuredClone(prev[k])
      const r = fn(draft)
      return { ...prev, ...draft, __ret: r }
    })
  }, [])

  const reiniciar = useCallback(() => {
    try { sessionStorage.removeItem(SS_KEY) } catch { /* noop */ }
    setData(structuredClone(original.current))
    avisar('Datos de la demo reiniciados')
  }, [avisar])

  const idx = useMemo(() => indexarTurnos(data.turnos), [data.turnos])
  const maps = useMemo(() => ({
    emp: Object.fromEntries(data.empleados.map((e) => [e.id, e])),
    tienda: Object.fromEntries(data.tiendas.map((t) => [t.id, t])),
    region: Object.fromEntries(data.regiones.map((r) => [r.id, r])),
    sup: Object.fromEntries(data.suplentes.map((s) => [s.id, s])),
    aus: Object.fromEntries(data.ausencias.map((a) => [a.id, a])),
  }), [data.empleados, data.tiendas, data.regiones, data.suplentes, data.ausencias])

  const usuario = data.usuarios.find((u) => u.id === usuarioId) || data.usuarios[0]

  // ── Helpers de dominio sobre el draft ──
  const notificar = (d, usuarioDestino, titulo, texto, ruta) => {
    if (!usuarioDestino) return
    d.notificaciones.unshift({ id: nextId(d.notificaciones, 'N'), usuarioId: usuarioDestino, fecha: ahoraSim(), titulo, texto, ruta: ruta || null, leida: false })
  }
  const usuarioDeEmpleado = (empId) => data.usuarios.find((u) => u.empleadoId === empId)?.id
  const usuarioDeCoord = (regionId) => data.usuarios.find((u) => u.rol === 'coordinadora' && u.regionId === regionId)?.id

  const acciones = useMemo(() => {
    const A = {}

    A.avisarAusencia = ({ empleadoId, tipo, desde, hasta, motivo, comprobante }) => {
      const nuevoId = nextId(dataRef.current.ausencias, 'A')
      mutar((d) => {
        const emp = d.empleados.find((e) => e.id === empleadoId)
        const filas = d.turnos.filter((t) => t.tipo === 'normal' && t.empleadoId === empleadoId && t.fecha >= desde && t.fecha <= hasta && !NO_TRABAJA.includes(t.estado))
        const id = nuevoId
        const requiere = ['enfermedad', 'duelo', 'estudio', 'familiar_enfermo'].includes(tipo)
        const estado = comprobante || !requiere ? 'avisada' : 'pendiente_comprobante'
        d.ausencias.push({
          id, empleadoId, tiendaId: emp.tiendaId, regionId: emp.regionId, tipo, desde, hasta, turnoIds: filas.map((f) => f.id), estado, avisadoEn: ahoraSim(), motivo,
          prolongada: false, comprobante: comprobante ? { archivo: comprobante.archivo, etiqueta: comprobante.etiqueta || 'Comprobante', imagen: comprobante.imagen || 'img/comprobante-placeholder.svg', subidoEn: ahoraSim() } : null,
          comentarioCoordinadora: null, resueltaPor: null, resueltaEn: null, licenciaId: null,
        })
        filas.forEach((f) => { f.estado = 'ausente'; f.ausenciaId = id })
        const url = `/bandeja`
        notificar(d, usuarioDeCoord(emp.regionId), `${emp.nombre} avisó que falta`, `${comprobante ? 'Adjuntó comprobante' : 'Sin comprobante todavía'}. ${filas.length} turno(s) sin cubrir.`, url)
        if (filas.some((f) => f.fecha <= addDays(HOY, 2))) {
          d.alertas.unshift({ id: nextId(d.alertas, 'AL', 2), creadaEn: ahoraSim(), resuelta: false, tipo: 'sin_cobertura', severidad: 'alta', regionId: emp.regionId, tiendaId: emp.tiendaId, ausenciaId: id, titulo: `${maps.tienda[emp.tiendaId].nombre} sin cobertura`, detalle: `${emp.nombre} avisó que falta. El turno quedó sin cubrir.` })
        }
      })
      avisar('Ausencia avisada. Tu coordinadora ya fue notificada')
      return nuevoId
    }

    A.subirComprobante = (ausId, archivo, imagen = 'img/comprobante-medico.svg') => {
      mutar((d) => {
        const a = d.ausencias.find((x) => x.id === ausId)
        a.comprobante = { archivo, etiqueta: 'Comprobante', imagen, subidoEn: ahoraSim() }
        if (a.estado === 'pendiente_comprobante') a.estado = 'avisada'
        notificar(d, usuarioDeCoord(a.regionId), 'Comprobante recibido', `${d.empleados.find((e) => e.id === a.empleadoId).nombre} subió ${archivo}.`, '/bandeja')
      })
      avisar('Comprobante enviado')
    }

    A.validarAusencia = (ausId, comentario) => {
      mutar((d) => {
        const a = d.ausencias.find((x) => x.id === ausId)
        const filas = a.turnoIds.map((id) => d.turnos.find((t) => t.id === id))
        a.estado = filas.length && filas.every((f) => f.cubiertoPor || f.fecha < HOY) && filas.some((f) => f.cubiertoPor) ? 'cubierta' : filas.some((f) => !f.cubiertoPor && f.fecha >= HOY) ? 'sin_cubrir' : 'validada'
        a.validadaOk = true
        a.comentarioCoordinadora = comentario || 'Comprobante validado.'
        a.resueltaPor = usuario.empleadoId; a.resueltaEn = ahoraSim()
        notificar(d, usuarioDeEmpleado(a.empleadoId), 'Tu ausencia fue validada', a.comentarioCoordinadora, '/legajo')
      })
      avisar('Ausencia validada')
    }

    A.rechazarAusencia = (ausId, motivo) => {
      mutar((d) => {
        const a = d.ausencias.find((x) => x.id === ausId)
        a.estado = 'rechazada'; a.comentarioCoordinadora = motivo; a.resueltaPor = usuario.empleadoId; a.resueltaEn = ahoraSim()
        notificar(d, usuarioDeEmpleado(a.empleadoId), 'Ausencia rechazada', motivo, '/legajo')
      })
      avisar('Ausencia rechazada', 'warn')
    }

    // Ofertas de cobertura
    A.enviarOferta = ({ ausenciaId, suplenteId = null, empleadoId = null, pagoEstimado, distanciaKm }) => {
      mutar((d) => {
        const a = d.ausencias.find((x) => x.id === ausenciaId)
        const filas = a.turnoIds.map((id) => d.turnos.find((t) => t.id === id)).filter((f) => f && f.fecha >= HOY && !f.cubiertoPor)
        const tienda = maps.tienda[a.tiendaId]
        const id = nextId(d.coberturas, 'CB')
        d.coberturas.push({
          id, ausenciaId, tiendaId: a.tiendaId, regionId: a.regionId, tipoOferta: suplenteId ? (maps.sup[suplenteId].tipo === 'externo' ? 'externo' : 'suplente') : 'prestamo', suplenteId, empleadoId,
          turnoIds: filas.map((f) => f.id), fechaDesde: filas[0].fecha, fechaHasta: filas.at(-1).fecha, franja: filas.every((f) => f.franja === filas[0].franja) ? filas[0].franja : 'MT',
          estado: 'pendiente', enviadaEn: ahoraSim(), respondidaEn: null, tiempoRespuestaMin: null, distanciaKm, pagoEstimado, motivoRechazo: null,
        })
        if (suplenteId) notificar(d, data.usuarios.find((u) => u.suplenteId === suplenteId)?.id, 'Nueva oferta de cobertura', `${tienda.nombre} · ${filas.length} turno(s). Respondé lo antes posible.`, '/ofertas')
      })
      avisar('Oferta enviada')
    }

    A.responderOferta = (cobId, resp, motivo) => {
      mutar((d) => {
        const c = d.coberturas.find((x) => x.id === cobId)
        const ahora = ahoraSim()
        c.estado = resp; c.respondidaEn = ahora; c.tiempoRespuestaMin = Math.max(1, minDiff(c.enviadaEn, ahora)); c.motivoRechazo = resp === 'rechazada' ? motivo || null : null
        const a = d.ausencias.find((x) => x.id === c.ausenciaId)
        if (resp === 'aceptada') {
          c.turnoIds.forEach((tid) => {
            const f = d.turnos.find((t) => t.id === tid)
            if (f.cubiertoPor) return
            const rid = nextId(d.turnos.filter((t) => t.id.startsWith('CT')), 'CT', 4)
            d.turnos.push({ id: rid, tipo: 'cobertura', suplenteId: c.suplenteId, empleadoId: c.empleadoId, tiendaId: f.tiendaId, fecha: f.fecha, franja: f.franja, cubreTurnoId: f.id, coberturaId: c.id, estado: 'programado' })
            f.cubiertoPor = rid
          })
          d.coberturas.forEach((o) => { if (o.ausenciaId === c.ausenciaId && o.id !== c.id && o.estado === 'pendiente' && o.turnoIds.some((t) => c.turnoIds.includes(t))) { o.estado = 'cancelada'; o.respondidaEn = ahora } })
          const filas = a.turnoIds.map((id) => d.turnos.find((t) => t.id === id))
          if (filas.every((f) => f.cubiertoPor || f.fecha < HOY) && ['sin_cubrir', 'validada'].includes(a.estado)) a.estado = 'cubierta'
          const quien = c.suplenteId ? maps.sup[c.suplenteId].nombre : maps.emp[c.empleadoId].nombre
          notificar(d, usuarioDeCoord(c.regionId), 'Cobertura confirmada', `${quien} cubre ${maps.tienda[c.tiendaId].nombre}.`, `/cobertura/${c.ausenciaId}`)
          notificar(d, usuarioDeEmpleado(maps.aus[c.ausenciaId]?.empleadoId), 'Tu turno quedó cubierto', 'Ya hay una persona cubriendo tu turno.', '/')
        } else {
          const quien = c.suplenteId ? maps.sup[c.suplenteId].nombre : maps.emp[c.empleadoId].nombre
          notificar(d, usuarioDeCoord(c.regionId), resp === 'rechazada' ? 'Oferta rechazada' : 'Oferta sin respuesta', `${quien} ${resp === 'rechazada' ? 'rechazó' : 'no respondió'} la cobertura de ${maps.tienda[c.tiendaId].nombre}.`, `/cobertura/${c.ausenciaId}`)
        }
      })
      avisar(resp === 'aceptada' ? '¡Cobertura aceptada!' : resp === 'rechazada' ? 'Oferta rechazada' : 'Marcada sin respuesta', resp === 'aceptada' ? 'ok' : 'warn')
    }

    // Licencias
    A.solicitarLicencia = ({ empleadoId, tipo, desde, hasta, comentario }) => {
      mutar((d) => {
        const emp = d.empleados.find((e) => e.id === empleadoId)
        const dias = range(desde, hasta).length
        d.licencias.unshift({ id: nextId(d.licencias, 'L'), empleadoId, tiendaId: emp.tiendaId, regionId: emp.regionId, tipo, desde, hasta, dias, estado: 'pendiente', solicitadaEn: ahoraSim(), comentario: comentario || null, motivoRechazo: null, resueltaPor: null, resueltaEn: null, adjunto: null })
        notificar(d, usuarioDeCoord(emp.regionId), 'Nueva solicitud de licencia', `${emp.nombre} solicita ${dias} día(s) de licencia.`, '/bandeja?tab=licencias')
      })
      avisar('Solicitud enviada')
    }

    A.resolverLicencia = (licId, decision, motivo) => {
      mutar((d) => {
        const l = d.licencias.find((x) => x.id === licId)
        l.estado = decision; l.resueltaPor = usuario.empleadoId; l.resueltaEn = ahoraSim(); l.motivoRechazo = decision === 'rechazada' ? motivo : null
        const emp = d.empleados.find((e) => e.id === l.empleadoId)
        if (decision === 'aprobada') {
          if (l.tipo === 'anual') emp.saldoLicenciaDias = Math.max(0, emp.saldoLicenciaDias - l.dias)
          const filas = d.turnos.filter((t) => t.tipo === 'normal' && t.empleadoId === l.empleadoId && t.fecha >= l.desde && t.fecha <= l.hasta && !NO_TRABAJA.includes(t.estado))
          if (filas.length) {
            const id = nextId(d.ausencias, 'A')
            d.ausencias.push({ id, empleadoId: l.empleadoId, tiendaId: emp.tiendaId, regionId: emp.regionId, tipo: 'licencia', desde: l.desde, hasta: l.hasta, turnoIds: filas.map((f) => f.id), estado: 'sin_cubrir', avisadoEn: l.solicitadaEn, motivo: 'Licencia aprobada', prolongada: false, comprobante: null, comentarioCoordinadora: null, resueltaPor: usuario.empleadoId, resueltaEn: ahoraSim(), licenciaId: l.id })
            filas.forEach((f) => { f.estado = 'licencia'; f.ausenciaId = id })
          }
        }
        notificar(d, usuarioDeEmpleado(l.empleadoId), decision === 'aprobada' ? 'Licencia aprobada' : 'Licencia rechazada', decision === 'aprobada' ? 'Tu solicitud fue aprobada. ¡Que la disfrutes!' : motivo, '/licencias')
      })
      avisar(decision === 'aprobada' ? 'Licencia aprobada. Se generó el hueco a cubrir' : 'Licencia rechazada', decision === 'aprobada' ? 'ok' : 'warn')
    }

    // Cambios de turno
    A.crearCambio = ({ solicitanteId, companeroId, turnoId, turnoDestinoId, motivo }) => {
      mutar((d) => {
        const emp = d.empleados.find((e) => e.id === solicitanteId)
        d.cambios.unshift({ id: nextId(d.cambios, 'CM', 2), solicitanteId, companeroId, tiendaId: emp.tiendaId, turnoId, turnoDestinoId, tipo: 'con_companero', motivo, estado: 'pendiente_coordinadora', creadaEn: ahoraSim() })
        notificar(d, usuarioDeCoord(emp.regionId), 'Pedido de cambio de turno', `${emp.nombre} pidió un cambio de turno.`, '/bandeja?tab=cambios')
      })
      avisar('Pedido enviado a tu coordinadora')
    }
    A.resolverCambio = (id, ok, motivo) => {
      mutar((d) => {
        const c = d.cambios.find((x) => x.id === id)
        c.estado = ok ? 'aprobado' : 'rechazado'; c.motivoRechazo = ok ? null : motivo; c.resueltaPor = usuario.empleadoId
        if (ok) {
          const a = d.turnos.find((t) => t.id === c.turnoId), b = d.turnos.find((t) => t.id === c.turnoDestinoId)
          if (a && b) { const tmp = a.empleadoId; a.empleadoId = b.empleadoId; b.empleadoId = tmp }
        }
        notificar(d, usuarioDeEmpleado(c.solicitanteId), ok ? 'Cambio de turno aprobado' : 'Cambio de turno rechazado', ok ? 'Tu cambio de turno fue aprobado.' : motivo, '/turnos')
      })
      avisar(ok ? 'Cambio aprobado' : 'Cambio rechazado', ok ? 'ok' : 'warn')
    }

    // Horas extras
    A.resolverHE = (id, ok) => { mutar((d) => { d.horasExtras.find((h) => h.id === id).estado = ok ? 'aprobada' : 'rechazada' }); avisar(ok ? 'Horas extras aprobadas' : 'Horas extras rechazadas', ok ? 'ok' : 'warn') }

    // Planificador
    A.asignarTurno = ({ empleadoId, tiendaId, fecha, franja }) => {
      mutar((d) => {
        d.turnos.push({ id: nextId(d.turnos.filter((t) => t.id.startsWith('TU')), 'TU', 5), tipo: 'normal', empleadoId, tiendaId, fecha, franja, estado: fecha < HOY ? 'cumplido' : 'programado', agregadoPorCoord: true })
      })
      avisar('Turno asignado')
    }
    A.quitarTurno = (turnoId) => { mutar((d) => { const i = d.turnos.findIndex((t) => t.id === turnoId); if (i >= 0) d.turnos.splice(i, 1) }); avisar('Turno quitado', 'warn') }
    A.cambiarFranja = (turnoId) => { mutar((d) => { const t = d.turnos.find((x) => x.id === turnoId); t.franja = t.franja === 'M' ? 'T' : 'M' }) }

    // Suplentes
    A.toggleDisponibilidad = (suplenteId, dia, franja) => {
      mutar((d) => {
        const s = d.suplentes.find((x) => x.id === suplenteId)
        const cur = s.disponibilidad[dia]
        const nuevo = cur.includes(franja) ? cur.filter((f) => f !== franja) : [...cur, franja]
        s.disponibilidad[dia] = ['M', 'T'].filter((f) => nuevo.includes(f))
      })
    }

    // Reintegros
    A.toggleTarea = (reId, tareaId) => mutar((d) => { const t = d.reintegros.find((r) => r.id === reId).tareasPendientes.find((x) => x.id === tareaId); t.hecho = !t.hecho })
    A.notaReintegro = (reId, texto) => { mutar((d) => { d.reintegros.find((r) => r.id === reId).notas.push({ fecha: HOY, autor: usuario.nombre, texto }) }); avisar('Nota agregada') }
    A.agregarTarea = (reId, texto, vence) => mutar((d) => { const r = d.reintegros.find((x) => x.id === reId); r.tareasPendientes.push({ id: 't' + (r.tareasPendientes.length + 1 + Math.floor(Math.random() * 1000)), texto, hecho: false, vence }) })
    A.setReintegro = (reId, patch, msg) => {
      mutar((d) => {
        const r = d.reintegros.find((x) => x.id === reId)
        Object.assign(r, patch)
        if (patch.certificado === undefined && patch.estado === 'reintegrado') r.reintegradoEn = HOY
        if (patch.estado === 'reintegrado' || patch.estado === 'reintegrado_con_ajuste') r.reintegradoEn = r.reintegradoEn || HOY
        notificar(d, usuarioDeEmpleado(r.empleadoId), 'Actualización de tu reintegro', msg || 'Tu coordinadora actualizó tu caso.', '/reintegro')
      })
      avisar(msg || 'Reintegro actualizado')
    }
    A.certificadoNuevo = (reId, archivo, hasta) => {
      mutar((d) => {
        const r = d.reintegros.find((x) => x.id === reId)
        r.certificado = { archivo, vigenteHasta: hasta }
        r.estado = 'en_licencia'
        r.notas.push({ fecha: HOY, autor: 'Sistema', texto: `Se cargó un nuevo certificado (${archivo}) vigente hasta ${hasta.split('-').reverse().join('/')}.` })
        const a = d.ausencias.find((x) => x.id === r.ausenciaId)
        if (a && a.hasta < hasta) a.hasta = hasta
      })
      avisar('Certificado cargado. El caso volvió a "En licencia"')
    }

    // Legajo / alertas / notificaciones / configuración
    A.nota = (empleadoId, texto, tipo = 'seguimiento') => { mutar((d) => { d.notasLegajo.unshift({ id: 'NL' + Date.now(), empleadoId, fecha: ahoraSim(), autor: usuario.nombre, texto, tipo }) }); avisar('Registrado en el legajo') }
    A.resolverAlerta = (id) => { mutar((d) => { d.alertas.find((a) => a.id === id).resuelta = true }); avisar('Alerta marcada como atendida') }
    A.leerNotificaciones = (uid) => mutar((d) => { d.notificaciones.forEach((n) => { if (n.usuarioId === uid) n.leida = true }) })
    A.setConfig = (fn) => mutar((d) => { fn(d.config) })
    return A
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutar, avisar, usuario, maps, data.usuarios])

  const value = useMemo(() => ({ ...data, idx, maps, usuario, setUsuarioId, acciones, reiniciar, toast, avisar }), [data, idx, maps, usuario, acciones, reiniciar, toast, avisar])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Hook de conveniencia: coberturas de una ausencia, etc.
export function useCoberturaAus() {
  const { idx } = useApp()
  return (aus) => coberturaAusencia(idx, aus)
}
export { HOY, dow }
