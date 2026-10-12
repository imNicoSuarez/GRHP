// Pantallas compartidas por Coordinadora y Supervisor: cobertura, reintegros, legajo/equipo, detalle de tienda, alertas.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Barra, Campo, Card, Estado, Icon, Modal, Semaforo, Stat, Tabs, Titulo, Vacio, cx } from '../../components/ui.jsx'
import { useApp } from '../../lib/store.jsx'
import { HOY, AHORA, minDiff, addDays, diffDays, dow, fmt, fmtDia, fmtFechaHora, hace, range, DIAS_CORTO } from '../../lib/dates.js'
import { ESTADO_AUSENCIA, ESTADO_OFERTA, ESTADO_REINTEGRO, TIPOS_AUSENCIA, TIPO_SUPLENTE, SEVERIDAD, pesos } from '../../lib/labels.js'
import { accionAlerta, alertaActiva, coberturaAusencia, semaforoTienda, slot, sugerirCobertura } from '../../lib/selectors.js'

export const nombreCobertor = (row, maps) => (row.suplenteId ? maps.sup[row.suplenteId]?.nombre : maps.emp[row.empleadoId]?.nombre) || '—'

// ───────────── Alertas y responsables ─────────────
const ROL_ETIQ = { coordinadora: 'Coordinadora regional', supervisor: 'Supervisor general' }
export function EstadoGestion({ a }) {
  const { maps } = useApp()
  const g = a.gestion || { estado: 'sin_gestionar' }
  const quien = g.porId ? maps.emp[g.porId]?.nombre : null
  if (g.estado === 'elevada') return <Badge tono="info">Elevada a Supervisión{quien ? ` por ${quien}` : ''}</Badge>
  if (g.estado === 'en_gestion') return <Badge tono="ok">En gestión{quien ? ` de ${quien}` : ''}</Badge>
  const min = minDiff(a.creadaEn, AHORA)
  return <Badge tono="warn">Sin gestionar · {min < 10 ? 'recién llegada' : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.floor(min / 60)} h` : `hace ${Math.floor(min / 1440)} d`}</Badge>
}
export function Responsable({ a }) {
  const { maps } = useApp()
  const r = maps.emp[a.responsable?.empleadoId]
  if (!r) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm text-slate-700">
      <Avatar nombre={r.nombre} color={r.avatarColor} size={24} />
      <span>Lo resuelve: <b className="text-slate-900">{r.nombre}</b> <span className="text-slate-500">· {ROL_ETIQ[a.responsable?.rol] || 'Coordinadora regional'}</span></span>
    </span>
  )
}

// Botones de la decisión de Supervisión sobre un tema elevado
export function AccionesElevada({ a }) {
  const { acciones } = useApp()
  const [modal, setModal] = useState(null)
  const [txt, setTxt] = useState('')
  const cerrar = () => { setModal(null); setTxt('') }
  return (
    <>
      <button className="btn-ok btn-sm" onClick={() => setModal('decidir')}>Tomar decisión</button>
      <button className="btn-secondary btn-sm" onClick={() => setModal('devolver')}>Devolver a la coordinadora</button>
      <Modal abierto={modal === 'decidir'} onCerrar={cerrar} titulo="Tu decisión">
        <div className="space-y-3"><p className="text-sm text-slate-600">{a.gestion?.nota}</p><Campo label="Decisión (queda registrada)"><textarea className="input" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ej: autorizado el refuerzo de 2 personas desde el 02/11" /></Campo><button disabled={!txt} className="btn-ok w-full" onClick={() => { acciones.resolverAlerta(a.id, txt); cerrar() }}>Registrar decisión y cerrar</button></div>
      </Modal>
      <Modal abierto={modal === 'devolver'} onCerrar={cerrar} titulo="Devolver a la coordinadora">
        <div className="space-y-3"><Campo label="Indicación para ella"><textarea className="input" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Qué tiene que resolver o qué le falta" /></Campo><button disabled={!txt} className="btn-primary w-full" onClick={() => { acciones.devolverAlerta(a.id, txt); cerrar() }}>Devolver</button></div>
      </Modal>
    </>
  )
}

export function BotonElevar({ onElevar, etiqueta = 'Elevar a Supervisión' }) {
  const [abierto, setAbierto] = useState(false)
  const [txt, setTxt] = useState('')
  return (
    <>
      <button className="btn-secondary btn-sm" onClick={() => setAbierto(true)}>{etiqueta}</button>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Elevar a Supervisión general">
        <div className="space-y-3"><p className="text-sm text-slate-600">Desde que lo elevás, Supervisión pasa a ser la responsable de resolverlo. Explicá qué necesitás que decida.</p><Campo label="Qué necesitás"><textarea className="input" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} /></Campo><button disabled={!txt} className="btn-primary w-full" onClick={() => { onElevar(txt); setAbierto(false); setTxt('') }}>Elevar</button></div>
      </Modal>
    </>
  )
}

export function AlertaItem({ a, rol, compacta }) {
  const { acciones } = useApp()
  const nav = useNavigate()
  const ac = accionAlerta(a, rol)
  const [, tono] = SEVERIDAD[a.severidad]
  const g = a.gestion || { estado: 'sin_gestionar' }
  const elevada = g.estado === 'elevada'
  const esSup = rol === 'supervisor'
  return (
    <li className={cx('rounded-2xl bg-white p-4 ring-1 ring-slate-200 border-l-4', a.severidad === 'alta' ? 'border-l-red-500' : a.severidad === 'media' ? 'border-l-amber-500' : 'border-l-sky-500')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2"><Badge tono={tono}>{SEVERIDAD[a.severidad][0]}</Badge><b className="text-sm">{a.titulo}</b></div>
          {!compacta && <p className="text-sm text-slate-600">{a.detalle}</p>}
          <div className="flex flex-wrap items-center gap-2"><EstadoGestion a={a} /><Responsable a={a} /></div>
          {!compacta && g.nota && <p className="rounded-xl bg-slate-50 p-2 text-sm text-slate-700"><b>{elevada ? 'Motivo de la elevación: ' : 'Nota: '}</b>{g.nota}</p>}
          {!compacta && a.recordadaEn && <p className="text-xs text-slate-500">Recordatorio enviado {hace(a.recordadaEn)}.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {esSup && !elevada && <button onClick={() => nav(ac.to)} className="btn-secondary btn-sm">Ver detalle <Icon n="right" size={14} /></button>}
          {(!esSup || elevada) && <button onClick={() => nav(ac.to)} className="btn-primary btn-sm">{ac.label} <Icon n="right" size={14} /></button>}
          {!compacta && esSup && elevada && <AccionesElevada a={a} />}
          {!compacta && esSup && g.estado === 'sin_gestionar' && <button onClick={() => acciones.recordarAlerta(a.id)} className="btn-secondary btn-sm">Recordar a la coordinadora</button>}
          {!compacta && !esSup && g.estado === 'sin_gestionar' && <button onClick={() => acciones.tomarAlerta(a.id)} className="btn-secondary btn-sm">Me hago cargo</button>}
          {!compacta && !esSup && !elevada && <BotonElevar onElevar={(m) => acciones.elevarAlerta(a.id, m)} />}
          {!compacta && !esSup && !elevada && a.tipo !== 'sin_cobertura' && <button onClick={() => acciones.resolverAlerta(a.id)} className="btn-secondary btn-sm">Marcar atendida</button>}
        </div>
      </div>
    </li>
  )
}
export function useAlertasActivas(regionId) {
  const { alertas, idx, ausencias, reintegros, licencias } = useApp()
  return useMemo(() => alertas.filter((a) => (!regionId || a.regionId === regionId) && alertaActiva(a, { idx, ausencias, reintegros, licencias })).sort((x, y) => ({ alta: 0, media: 1, baja: 2 }[x.severidad] - { alta: 0, media: 1, baja: 2 }[y.severidad])), [alertas, idx, ausencias, reintegros, licencias, regionId])
}

// ───────────── Cobertura ─────────────
export function huecosAbiertos({ ausencias, idx, regionId }) {
  return ausencias.filter((a) => !regionId || a.regionId === regionId).map((a) => ({ a, cob: coberturaAusencia(idx, a) })).filter((x) => x.cob.sinCubrirFut.length > 0).sort((x, y) => x.cob.sinCubrirFut[0].fecha.localeCompare(y.cob.sinCubrirFut[0].fecha))
}

export function CoberturaLista({ regionId }) {
  const { ausencias, idx, maps, coberturas, alertas, usuario } = useApp()
  const lista = huecosAbiertos({ ausencias, idx, regionId })
  return (
    <div className="space-y-4">
      <Titulo sub="Ausencias con turnos futuros o de hoy todavía sin cubrir">Cobertura pendiente</Titulo>
      {lista.length === 0 && <Vacio icono="🎉">No hay huecos sin cubrir. Todo en orden.</Vacio>}
      <ul className="space-y-2">
        {lista.map(({ a, cob }) => {
          const ofertas = coberturas.filter((c) => c.ausenciaId === a.id)
          const pend = ofertas.filter((o) => o.estado === 'pendiente').length
          const primera = cob.sinCubrirFut[0]
          const al = alertas.find((x) => x.ausenciaId === a.id && !x.resuelta)
          return (
            <li key={a.id}>
              <Link to={`/cobertura/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-xl text-white', primera.fecha === HOY ? 'bg-red-600' : 'bg-amber-500')}><Icon n="alert" /></span>
                <div className="min-w-0 flex-1"><div className="font-bold">{maps.tienda[a.tiendaId].nombre}</div><div className="text-sm text-slate-600">{maps.emp[a.empleadoId].nombre} · {TIPOS_AUSENCIA[a.tipo]} · {cob.sinCubrirFut.length} turno(s) sin cubrir desde {fmtDia(primera.fecha)}</div><div className="mt-1 flex flex-wrap items-center gap-2">{al ? <><EstadoGestion a={al} /><Responsable a={al} /></> : <Responsable a={{ responsable: { rol: 'coordinadora', empleadoId: maps.region[a.regionId].coordinadoraId } }} />}</div></div>
                <div className="flex items-center gap-2">{pend > 0 && <Badge tono="warn">{pend} oferta(s) pendiente(s)</Badge>}{ofertas.length === 0 && <Badge tono="bad">Sin ofertas</Badge>}<span className="btn-primary btn-sm">{usuario.rol === 'supervisor' && al?.gestion?.estado !== 'elevada' ? 'Ver detalle' : 'Buscar cobertura'}</span></div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CoberturaPage() {
  const { id } = useParams()
  const app = useApp()
  const { ausencias, maps, idx, suplentes, empleados, tiendas, coberturas, config, acciones, empresa, usuario, alertas } = app
  const nav = useNavigate()
  const aus = ausencias.find((a) => a.id === id)
  if (!aus) return <Vacio>No encontramos esa ausencia. <Link className="font-semibold text-brand-700" to="/cobertura">Volver</Link></Vacio>
  const tienda = maps.tienda[aus.tiendaId]
  const emp = maps.emp[aus.empleadoId]
  const cob = coberturaAusencia(idx, aus)
  const filas = cob.sinCubrirFut
  const ofertas = coberturas.filter((c) => c.ausenciaId === aus.id).sort((a, b) => b.enviadaEn.localeCompare(a.enviadaEn))
  const sug = useMemo(() => (filas.length ? sugerirCobertura({ idx, tienda, filas, suplentes, empleados, tiendas, coberturas, ausenciaId: aus.id, config }) : null), [idx, tienda, filas.length, suplentes, empleados, tiendas, coberturas, aus.id, config])
  const nombreOferta = (o) => (o.suplenteId ? maps.sup[o.suplenteId].nombre : maps.emp[o.empleadoId].nombre)
  const [verPrest, setVerPrest] = useState(false)
  const [verOtras, setVerOtras] = useState(false)
  const escalar = sug && !sug.hayEnZona
  const alerta = alertas.find((x) => x.ausenciaId === aus.id && !x.resuelta)
  const elevada = alerta?.gestion?.estado === 'elevada'
  const puede = usuario.rol !== 'supervisor' || elevada
  const resp = alerta ? maps.emp[alerta.responsable.empleadoId] : maps.emp[maps.region[aus.regionId].coordinadoraId]
  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-semibold text-brand-700"><Icon n="left" size={16} /> Volver</button>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Cobertura</div><h1 className="text-xl font-bold">{tienda.nombre}</h1><p className="text-sm text-slate-600">{tienda.ciudad}, {tienda.departamento} · Dotación requerida: {tienda.dotacionPorTurno} por turno</p></div>
          <Estado mapa={ESTADO_AUSENCIA} valor={aus.estado} />
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><div className="label">Ausente</div><Link className="font-semibold text-brand-700" to={`/equipo/${emp.id}`}>{emp.nombre}</Link><div className="text-slate-500">{emp.cargo}</div></div>
          <div><div className="label">Motivo</div><div className="font-semibold">{TIPOS_AUSENCIA[aus.tipo]}</div><div className="text-slate-500">{aus.motivo}</div></div>
          <div><div className="label">Turnos</div>{cob.filas.map((f) => <div key={f.id} className="flex items-center gap-2"><span>{fmtDia(f.fecha)} · {empresa.franjas[f.franja].nombre}</span>{f.cubiertoPor ? <Badge tono="ok">Cubre {nombreCobertor(idx.porId.get(f.cubiertoPor), maps)}</Badge> : f.fecha >= HOY ? <Badge tono="bad">Sin cubrir</Badge> : <Badge>Pasado</Badge>}</div>)}</div>
        </div>
      </Card>

      {alerta ? (
        <Card className={cx('space-y-2 border-l-4 p-4', elevada ? 'border-sky-500' : 'border-slate-300')}>
          <div className="flex flex-wrap items-center gap-2"><EstadoGestion a={alerta} /><Responsable a={alerta} /></div>
          {alerta.gestion?.nota && <p className="text-sm text-slate-700"><b>{elevada ? 'Motivo de la elevación: ' : 'Nota: '}</b>{alerta.gestion.nota}</p>}
          {usuario.rol === 'supervisor' && !elevada && <p className="text-sm font-semibold text-slate-700">Solo lectura: la resuelve {resp.nombre}. Intervenís recién si ella lo eleva.</p>}
          {usuario.rol === 'supervisor' && elevada && <div className="flex flex-wrap gap-2"><AccionesElevada a={alerta} /></div>}
          {usuario.rol === 'coordinadora' && !elevada && <div className="flex flex-wrap gap-2">{alerta.gestion?.estado === 'sin_gestionar' && <button className="btn-secondary btn-sm" onClick={() => acciones.tomarAlerta(alerta.id)}>Me hago cargo</button>}<BotonElevar onElevar={(m) => acciones.elevarAlerta(alerta.id, m)} /></div>}
          {usuario.rol === 'coordinadora' && elevada && <p className="text-sm text-slate-600">Esperando la decisión de Supervisión general. Mientras tanto podés seguir buscando cobertura.</p>}
        </Card>
      ) : usuario.rol === 'supervisor' && <Card className="border-l-4 border-slate-300 p-4 text-sm font-semibold text-slate-700">Solo lectura: la resuelve {resp.nombre} (coordinadora regional).</Card>}

      {!filas.length && <Card className="border-l-4 border-emerald-500 p-5"><b className="text-emerald-800">✓ Todos los turnos están cubiertos.</b><p className="text-sm text-slate-600">La alerta de “sin cobertura” se resolvió sola.</p></Card>}

      {ofertas.length > 0 && (
        <section>
          <Titulo sub="Se asigna a la primera persona que acepta; las demás ofertas se cancelan solas">Ofertas enviadas</Titulo>
          <Card className="divide-y divide-slate-100">
            {ofertas.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1"><b>{nombreOferta(o)}</b> <span className="text-slate-500">· {o.tipoOferta === 'prestamo' ? 'de otra tienda' : TIPO_SUPLENTE[maps.sup[o.suplenteId].tipo].toLowerCase()} · {o.distanciaKm} km · {pesos(o.pagoEstimado)}</span>
                  <div className="text-xs text-slate-500">Enviada {fmtFechaHora(o.enviadaEn)}{o.tiempoRespuestaMin ? ` · respondió en ${o.tiempoRespuestaMin} min` : ''}{o.motivoRechazo ? ` · “${o.motivoRechazo}”` : ''}</div></div>
                <Estado mapa={ESTADO_OFERTA} valor={o.estado} />
                {o.estado === 'pendiente' && puede && (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" title="Solo para la demo: simula la respuesta de la persona">
                    <span className="px-1 text-[10px] font-bold uppercase text-slate-500">Demo</span>
                    <button className="btn-ok btn-sm" onClick={() => acciones.responderOferta(o.id, 'aceptada')}>Aceptó</button>
                    <button className="btn-secondary btn-sm" onClick={() => acciones.responderOferta(o.id, 'rechazada', 'No puedo ese día')}>Rechazó</button>
                    <button className="btn-secondary btn-sm" onClick={() => acciones.responderOferta(o.id, 'sin_respuesta')}>Sin resp.</button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}

      {sug && (
        <>
          <section>
            <Titulo sub={`Suplentes de la bolsa de ${maps.region[tienda.regionId].nombre} que cubren ${tienda.departamento}, ordenados por disponibilidad y cercanía`}>Suplentes sugeridos</Titulo>
            {sug.zona.length === 0 && <Card className="border-l-4 border-red-500 p-4 text-sm"><b>No hay suplentes que cubran {tienda.departamento}.</b> Ninguna persona de tu bolsa tiene esta zona. Escalá a otra tienda o a un externo.</Card>}
            {sug.zona.length > 0 && !sug.hayEnZona && <Card className="mb-2 border-l-4 border-red-500 p-4 text-sm"><b>Nadie de tu bolsa está disponible</b> en ese horario. Probá con otras tiendas o externos.</Card>}
            <ul className="grid gap-3 md:grid-cols-2">
              {sug.zona.map((z) => <SugCard key={z.suplente.id} z={z} filas={filas} soloLectura={!puede} onEnviar={() => acciones.enviarOferta({ ausenciaId: aus.id, suplenteId: z.suplente.id, pagoEstimado: z.pago, distanciaKm: z.km })} />)}
            </ul>
          </section>

          <section>
            <button onClick={() => setVerPrest(!verPrest)} className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200">
              <span><b>Cobertura entre tiendas</b> <span className="text-sm text-slate-500">· personal de otras tiendas en su franco ({sug.prestamos.length})</span></span>
              <Badge tono={escalar ? 'warn' : 'neutral'}>{escalar ? 'Recomendado' : verPrest ? 'Ocultar' : 'Ver'}</Badge>
            </button>
            {(verPrest || escalar) && (
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {sug.prestamos.length === 0 && <Vacio>No hay personal libre en tiendas cercanas.</Vacio>}
                {sug.prestamos.map((p) => (
                  <li key={p.empleado.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <Avatar nombre={p.empleado.nombre} color={p.empleado.avatarColor} />
                    <div className="min-w-0 flex-1 text-sm"><div className="truncate font-bold">{p.empleado.nombre}</div><div className="text-slate-600">{p.tienda.nombre} · {p.km} km{p.misma ? '' : ' · otra región'}</div><div className="text-xs text-slate-500">En su franco → hora extra · {pesos(p.pago)} (incl. viáticos)</div></div>
                    {p.oferta ? <Estado mapa={ESTADO_OFERTA} valor={p.oferta.estado} /> : <button disabled={!puede} className="btn-primary btn-sm" onClick={() => acciones.enviarOferta({ ausenciaId: aus.id, empleadoId: p.empleado.id, pagoEstimado: p.pago, distanciaKm: p.km })}>Solicitar</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <button onClick={() => setVerOtras(!verOtras)} className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200">
              <span><b>Externos y bolsas de otras regiones</b> <span className="text-sm text-slate-500">· suplentes que cubren {tienda.departamento} ({sug.otrasRegiones.length})</span></span>
              <Badge tono={escalar ? 'warn' : 'neutral'}>{escalar ? 'Recomendado' : verOtras ? 'Ocultar' : 'Ver'}</Badge>
            </button>
            {(verOtras || escalar) && (
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {sug.otrasRegiones.length === 0 && <Vacio>No hay externos registrados para esta zona.</Vacio>}
                {sug.otrasRegiones.map((z) => <SugCard key={z.suplente.id} z={z} filas={filas} soloLectura={!puede} region={maps.region[z.suplente.regionId].nombre} onEnviar={() => acciones.enviarOferta({ ausenciaId: aus.id, suplenteId: z.suplente.id, pagoEstimado: z.pago, distanciaKm: z.km })} />)}
              </ul>
            )}
          </section>
        </>
      )}
      <p className="text-xs text-slate-500">Ves esta pantalla como {usuario.nombre}. Las respuestas de las personas se simulan con los botones “Demo” o entrando como suplente desde “Ver como…”.</p>
    </div>
  )
}

function SugCard({ z, filas, onEnviar, region, soloLectura }) {
  const s = z.suplente
  return (
    <li className={cx('flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1', z.elegible ? 'ring-slate-200' : 'opacity-80 ring-slate-200')}>
      <div className="flex items-center gap-3">
        <Avatar nombre={s.nombre} color={s.avatarColor} />
        <div className="min-w-0 flex-1"><div className="truncate font-bold">{s.nombre}</div><div className="text-xs text-slate-600">{TIPO_SUPLENTE[s.tipo]}{region ? ` · bolsa ${region}` : ''} · ⭐ {s.calificacion.toFixed(1)} · {s.coberturasRealizadas} coberturas</div></div>
        {z.elegible ? <Badge tono="ok">Disponible</Badge> : <Badge tono="neutral">No disponible</Badge>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700"><span className="inline-flex items-center gap-1"><Icon n="pin" size={14} /> {z.km} km desde {s.base.ciudad}</span><span className="inline-flex items-center gap-1"><Icon n="money" size={14} /> {pesos(z.pago)}</span><span>{s.habilitaciones.join(' · ')}</span></div>
      {z.razones.length > 0 && <ul className="text-xs text-amber-800">{z.razones.map((r) => <li key={r}>! {r}</li>)}</ul>}
      <button disabled={!z.elegible || soloLectura} onClick={onEnviar} className="btn-primary btn-sm self-start">{z.oferta ? 'Ya ofertada' : `Enviar oferta (${filas.length} turno${filas.length > 1 ? 's' : ''})`}</button>
    </li>
  )
}

// ───────────── Reintegros ─────────────
export function ReintegrosPage({ regionId }) {
  const { id } = useParams()
  const { reintegros, maps } = useApp()
  const [filtro, setFiltro] = useState('todos')
  const lista = reintegros.filter((r) => !regionId || r.regionId === regionId).filter((r) => filtro === 'todos' || r.estado === filtro)
  const sel = id ? reintegros.find((r) => r.id === id) : null
  const orden = { certificado_por_vencer: 0, alta_proxima: 1, en_licencia: 2, reintegrado_con_ajuste: 3, reintegrado: 4 }
  lista.sort((a, b) => orden[a.estado] - orden[b.estado])
  return (
    <div className="space-y-4">
      <Titulo sub={regionId ? `Región ${maps.region[regionId].nombre}` : 'Seguimiento nacional'}>Reintegros y ausencias prolongadas</Titulo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className={cx('space-y-3', sel && 'hidden lg:block')}>
          <select aria-label="Filtrar por estado" className="input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_REINTEGRO).map(([k, [et]]) => <option key={k} value={k}>{et}</option>)}
          </select>
          <ul className="space-y-2">
            {lista.map((r) => {
              const e = maps.emp[r.empleadoId]
              const dias = r.certificado ? diffDays(HOY, r.certificado.vigenteHasta) : null
              return (
                <li key={r.id}><Link to={`/reintegros/${r.id}`} className={cx('block rounded-2xl bg-white p-3 ring-1 hover:ring-brand-600', sel?.id === r.id ? 'ring-2 ring-brand-600' : 'ring-slate-200')}>
                  <div className="flex items-center gap-3"><Avatar nombre={e.nombre} color={e.avatarColor} size={36} /><div className="min-w-0 flex-1"><div className="truncate font-bold">{e.nombre}</div><div className="truncate text-xs text-slate-500">{maps.tienda[r.tiendaId].nombre} · {r.motivo}</div></div></div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><Estado mapa={ESTADO_REINTEGRO} valor={r.estado} />{r.certificado && r.estado !== 'reintegrado' && r.estado !== 'reintegrado_con_ajuste' && <span className={cx('text-xs font-semibold', dias <= 3 ? 'text-red-700' : 'text-slate-500')}>Cert. vence {fmt(r.certificado.vigenteHasta)}</span>}</div>
                </Link></li>
              )
            })}
            {lista.length === 0 && <Vacio>No hay casos con ese filtro.</Vacio>}
          </ul>
        </div>
        <div className={cx(!sel && 'hidden lg:block')}>{sel ? <ReintegroDetalle r={sel} /> : <Vacio icono="👈">Elegí un caso para ver el detalle y actuar.</Vacio>}</div>
      </div>
    </div>
  )
}

function ReintegroDetalle({ r }) {
  const { maps, acciones, ausencias, usuario, alertas } = useApp()
  const e = maps.emp[r.empleadoId]
  const elev = alertas.find((x) => x.reintegroId === r.id && x.gestion?.estado === 'elevada' && !x.resuelta)
  const esSup = usuario.rol === 'supervisor'
  const puede = !esSup || !!elev
  const coordR = maps.emp[maps.region[r.regionId].coordinadoraId]
  const [nota, setNota] = useState('')
  const [tarea, setTarea] = useState({ texto: '', vence: addDays(HOY, 7) })
  const [modal, setModal] = useState(null)
  const [cert, setCert] = useState({ archivo: 'certificado_actualizado.pdf', hasta: addDays(HOY, 14) })
  const [ajuste, setAjuste] = useState('')
  const aus = ausencias.find((a) => a.id === r.ausenciaId)
  const cerrado = r.estado === 'reintegrado' || r.estado === 'reintegrado_con_ajuste'
  const dias = r.certificado ? diffDays(HOY, r.certificado.vigenteHasta) : null
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><Avatar nombre={e.nombre} color={e.avatarColor} size={52} /><div><Link to={`/equipo/${e.id}`} className="text-lg font-bold text-brand-700">{e.nombre}</Link><div className="text-sm text-slate-600">{e.cargo} · {maps.tienda[r.tiendaId].nombre}</div><div className="text-sm text-slate-600">{e.telefono}</div></div></div>
        <Estado mapa={ESTADO_REINTEGRO} valor={r.estado} />
      </div>
      <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
        <div><span className="label !mb-0 mr-2 inline">Responsable</span><b>{coordR.nombre}</b> (coordinadora regional)</div>
        {elev && <div><Badge tono="info">Elevado a Supervisión</Badge> <span className="text-slate-700">{elev.gestion.nota}</span></div>}
        {esSup && !elev && <div className="font-semibold text-slate-700">Solo lectura: lo gestiona {coordR.nombre}. Intervenís recién si lo eleva.</div>}
        <div className="flex flex-wrap gap-2">{esSup && elev && <AccionesElevada a={elev} />}{!esSup && !elev && <BotonElevar onElevar={(m) => acciones.elevarReintegro(r.id, m)} />}</div>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="label">Motivo</dt><dd className="font-semibold">{r.motivo}</dd></div>
        <div><dt className="label">Ausente desde</dt><dd className="font-semibold">{fmt(r.desde)}{aus && ` (${diffDays(r.desde, HOY)} días)`}</dd></div>
        <div><dt className="label">{cerrado ? 'Reintegrado el' : 'Alta prevista'}</dt><dd className="font-semibold">{fmt(cerrado ? r.reintegradoEn : r.altaPrevista) || 'A definir'}</dd></div>
        {r.certificado && <div className="sm:col-span-3"><dt className="label">Certificado vigente</dt><dd className={cx('font-semibold', !cerrado && dias <= 3 && 'text-red-700')}>{r.certificado.archivo} · hasta {fmt(r.certificado.vigenteHasta)} {!cerrado && dias >= 0 && `(en ${dias} día${dias !== 1 ? 's' : ''})`}</dd></div>}
      </dl>
      {r.ajusteTareas && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><b>Ajuste de tareas:</b> {r.ajusteTareas}</div>}
      {!cerrado && puede && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setModal('cert')}><Icon n="upload" size={14} /> Registrar nuevo certificado</button>
          {r.estado !== 'alta_proxima' && <button className="btn-secondary btn-sm" onClick={() => acciones.setReintegro(r.id, { estado: 'alta_proxima', altaPrevista: r.altaPrevista || addDays(HOY, 7) }, 'Marcado como alta próxima')}>Marcar alta próxima</button>}
          <button className="btn-ok btn-sm" onClick={() => setModal('alta')}><Icon n="check" size={14} /> Registrar reintegro</button>
        </div>
      )}
      {cerrado && puede && !r.ajusteTareas && <button className="btn-secondary btn-sm" onClick={() => setModal('ajuste')}>Agregar ajuste de tareas</button>}
      <section>
        <h3 className="mb-2 font-bold">Tareas de seguimiento</h3>
        <ul className="space-y-1.5">{r.tareasPendientes.map((t) => <li key={t.id}><label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 text-sm hover:bg-slate-50"><input type="checkbox" disabled={!puede} checked={t.hecho} onChange={() => acciones.toggleTarea(r.id, t.id)} className="mt-0.5 h-5 w-5 accent-brand-600" /><span className={t.hecho ? 'text-slate-400 line-through' : ''}>{t.texto}<span className={cx('ml-2 text-xs', !t.hecho && t.vence < HOY ? 'font-bold text-red-700' : 'text-slate-500')}>vence {fmt(t.vence)}</span></span></label></li>)}</ul>
        {puede && <form className="mt-2 flex flex-wrap gap-2" onSubmit={(ev) => { ev.preventDefault(); if (tarea.texto) { acciones.agregarTarea(r.id, tarea.texto, tarea.vence); setTarea({ ...tarea, texto: '' }) } }}>
          <input className="input flex-1" placeholder="Nueva tarea…" value={tarea.texto} onChange={(e2) => setTarea({ ...tarea, texto: e2.target.value })} aria-label="Nueva tarea" />
          <input type="date" className="input w-40" value={tarea.vence} onChange={(e2) => setTarea({ ...tarea, vence: e2.target.value })} aria-label="Vence" />
          <button className="btn-secondary btn-sm">Agregar</button>
        </form>}
      </section>
      <section>
        <h3 className="mb-2 font-bold">Notas del caso</h3>
        <ul className="space-y-2">{r.notas.map((n, i) => <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">{fmt(n.fecha)} · {n.autor}</div>{n.texto}</li>)}</ul>
        {puede && <form className="mt-2 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); if (nota) { acciones.notaReintegro(r.id, nota); setNota('') } }}>
          <input className="input flex-1" placeholder={`Nota como ${usuario.nombre.split(' ')[0]}…`} value={nota} onChange={(e2) => setNota(e2.target.value)} aria-label="Nueva nota" />
          <button className="btn-secondary btn-sm">Guardar</button>
        </form>}
      </section>
      <Modal abierto={modal === 'cert'} onCerrar={() => setModal(null)} titulo="Registrar nuevo certificado">
        <div className="space-y-3"><Campo label="Archivo"><input className="input" value={cert.archivo} onChange={(e2) => setCert({ ...cert, archivo: e2.target.value })} /></Campo><Campo label="Vigente hasta"><input type="date" className="input" value={cert.hasta} onChange={(e2) => setCert({ ...cert, hasta: e2.target.value })} /></Campo><button className="btn-primary w-full" onClick={() => { acciones.certificadoNuevo(r.id, cert.archivo, cert.hasta); setModal(null) }}>Guardar certificado</button></div>
      </Modal>
      <Modal abierto={modal === 'alta' || modal === 'ajuste'} onCerrar={() => setModal(null)} titulo={modal === 'alta' ? 'Registrar reintegro' : 'Ajuste de tareas'}>
        <div className="space-y-3">
          <Campo label="Ajuste de tareas (opcional)" ayuda="Si lo completás, el caso queda como “Reintegrado con ajuste de tareas”."><textarea className="input" rows={3} value={ajuste} onChange={(e2) => setAjuste(e2.target.value)} placeholder="Ej: sin cargas de más de 5 kg durante 30 días" /></Campo>
          <button className="btn-ok w-full" onClick={() => { acciones.setReintegro(r.id, modal === 'alta' ? { estado: ajuste ? 'reintegrado_con_ajuste' : 'reintegrado', ajusteTareas: ajuste || null } : { ajusteTareas: ajuste, estado: 'reintegrado_con_ajuste' }, 'Reintegro registrado'); setModal(null) }}>Confirmar</button>
        </div>
      </Modal>
    </Card>
  )
}

// ───────────── Equipo y legajo ─────────────
export function EquipoPage({ regionId }) {
  const { empleados, maps, tiendas, ausencias } = useApp()
  const [q, setQ] = useState('')
  const [tid, setTid] = useState('')
  const nav = useNavigate()
  const tiendasScope = tiendas.filter((t) => !regionId || t.regionId === regionId)
  const lista = empleados.filter((e) => e.tiendaId && (!regionId || e.regionId === regionId) && (!tid || e.tiendaId === tid) && e.nombre.toLowerCase().includes(q.toLowerCase()))
  const cuenta = (id) => ausencias.filter((a) => a.empleadoId === id && a.desde >= addDays(HOY, -56) && a.tipo !== 'licencia').length
  return (
    <div className="space-y-4">
      <Titulo sub={`${lista.length} personas`}>Equipo</Titulo>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Icon n="search" size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input pl-9" placeholder="Buscar por nombre…" aria-label="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input w-auto" aria-label="Filtrar por tienda" value={tid} onChange={(e) => setTid(e.target.value)}><option value="">Todas las tiendas</option>{tiendasScope.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Persona</th><th className="p-3">Cargo</th><th className="p-3">Tienda</th><th className="p-3">Contrato</th><th className="p-3 text-right">Ausencias (8 sem.)</th><th className="p-3 text-right">Saldo lic.</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((e) => { const c = cuenta(e.id); return (
              <tr key={e.id} tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && nav(`/equipo/${e.id}`)} onClick={() => nav(`/equipo/${e.id}`)} className="cursor-pointer hover:bg-brand-50/40 focus:bg-brand-50/60">
                <td className="p-3"><div className="flex items-center gap-2"><Avatar nombre={e.nombre} color={e.avatarColor} size={30} /><span className="font-semibold">{e.nombre}</span></div></td>
                <td className="p-3">{e.cargo}</td><td className="p-3">{maps.tienda[e.tiendaId].nombre.replace('Pagnifique ', '')}</td><td className="p-3">{e.contrato}</td>
                <td className="p-3 text-right"><Badge tono={c >= 4 ? 'bad' : c >= 2 ? 'warn' : 'ok'}>{c}</Badge></td><td className="p-3 text-right tabular-nums">{e.saldoLicenciaDias} d</td>
              </tr>) })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function LegajoPage() {
  const { id } = useParams()
  const { maps, ausencias, horasExtras, notasLegajo, acciones, licencias, reintegros, usuario, alertas } = useApp()
  const nav = useNavigate()
  const e = maps.emp[id]
  const [txt, setTxt] = useState('')
  const [ver, setVer] = useState(null)
  if (!e) return <Vacio>Persona no encontrada.</Vacio>
  const aus = ausencias.filter((a) => a.empleadoId === id).sort((a, b) => b.desde.localeCompare(a.desde))
  const ult = aus.filter((a) => a.tipo !== 'licencia' && a.desde >= addDays(HOY, -56))
  const porDia = Array(7).fill(0)
  ult.forEach((a) => { porDia[dow(a.desde)]++ })
  const lunes = porDia[0]
  const sinAviso = ult.filter((a) => a.tipo === 'falta_sin_aviso').length
  const he = horasExtras.filter((h) => h.empleadoId === id && h.estado !== 'rechazada').reduce((s, h) => s + h.horas, 0)
  const notas = notasLegajo.filter((n) => n.empleadoId === id)
  const alerta = alertas.find((a) => a.empleadoId === id && a.tipo === 'patron_faltas')
  const rein = reintegros.find((r) => r.empleadoId === id)
  const max = Math.max(...porDia, 1)
  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-semibold text-brand-700"><Icon n="left" size={16} /> Volver</button>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Avatar nombre={e.nombre} color={e.avatarColor} size={64} />
        <div className="min-w-0 flex-1"><h1 className="text-xl font-bold">{e.nombre}</h1><div className="text-sm text-slate-600">{e.cargo} · {e.tiendaId ? maps.tienda[e.tiendaId].nombre : 'Casa matriz'} · {e.contrato}</div><div className="text-sm text-slate-600">Ingreso {fmt(e.ingreso)} · {e.telefono} · {e.email}</div></div>
        {rein && <Link to={`/reintegros/${rein.id}`} className="btn-secondary btn-sm"><Icon n="heart" size={14} /> Ver caso de reintegro</Link>}
      </Card>
      {alerta && <Card className="border-l-4 border-amber-500 p-4 text-sm"><b>⚠ {alerta.titulo}</b><p className="text-slate-600">{alerta.detalle}</p></Card>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ausencias (8 sem.)" value={ult.length} tono={ult.length >= 4 ? 'bad' : ult.length >= 2 ? 'warn' : 'ok'} />
        <Stat label="Faltas sin aviso" value={sinAviso} tono={sinAviso >= 2 ? 'bad' : sinAviso ? 'warn' : 'ok'} />
        <Stat label="Horas extras (5 sem.)" value={`${he} h`} />
        <Stat label="Saldo de licencia" value={`${e.saldoLicenciaDias} d`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-bold">Ausencias por día de la semana</h2>
          <p className="mb-3 text-sm text-slate-500">Últimas 8 semanas{lunes >= 3 && <span className="font-semibold text-amber-700"> · patrón detectado los lunes ({lunes} de {ult.length})</span>}</p>
          <div className="flex h-28 items-end gap-2">{porDia.map((n, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><span className="text-xs font-bold tabular-nums">{n}</span><div className={cx('w-full rounded-t-md', i === 0 && n >= 3 ? 'bg-amber-500' : 'bg-brand-500/70')} style={{ height: `${(n / max) * 80 + 3}px` }} /><span className="text-xs text-slate-600">{DIAS_CORTO[i]}</span></div>)}</div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Seguimiento y conversaciones</h2>
          {usuario.rol === 'supervisor' ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">El seguimiento de esta persona lo hace {maps.emp[maps.region[e.regionId].coordinadoraId].nombre}, coordinadora regional. Solo lectura.</p> : <form onSubmit={(ev) => { ev.preventDefault(); if (txt) { acciones.nota(id, txt, 'conversacion'); setTxt('') } }} className="space-y-2">
            <textarea className="input" rows={2} placeholder="Registrar conversación o acuerdo (queda en el legajo)…" aria-label="Nota de seguimiento" value={txt} onChange={(ev) => setTxt(ev.target.value)} />
            <div className="flex flex-wrap gap-2"><button className="btn-primary btn-sm">Registrar en el legajo</button>{lunes >= 3 && <button type="button" onClick={() => setTxt('Conversación por patrón de faltas los lunes. Se acuerda avisar con anticipación y revisar horarios.')} className="btn-secondary btn-sm">Usar texto sugerido</button>}</div>
          </form>}
          <ul className="mt-3 space-y-2">{notas.map((n) => <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">{fmtFechaHora(n.fecha)} · {n.autor}</div>{n.texto}</li>)}{notas.length === 0 && <li className="text-sm text-slate-500">Sin notas todavía.</li>}</ul>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <div className="p-4 pb-0 font-bold">Historial de ausencias</div>
        <table className="mt-2 w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Fecha</th><th className="p-3">Día</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Comprobante</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {aus.map((a) => <tr key={a.id}><td className="p-3">{fmt(a.desde)}{a.hasta !== a.desde && ` al ${fmt(a.hasta)}`}</td><td className={cx('p-3', dow(a.desde) === 0 && 'font-bold text-amber-700')}>{DIAS_CORTO[dow(a.desde)]}</td><td className="p-3">{TIPOS_AUSENCIA[a.tipo]}</td><td className="p-3"><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></td><td className="p-3">{a.comprobante ? <button onClick={() => setVer(a)} className="font-semibold text-brand-700 underline">Ver</button> : '—'}</td></tr>)}
            {aus.length === 0 && <tr><td colSpan={5} className="p-4 text-slate-500">Sin ausencias.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal abierto={!!ver} onCerrar={() => setVer(null)} titulo="Comprobante">{ver && <><img src={ver.comprobante.imagen} alt={ver.comprobante.archivo} className="mx-auto max-h-80 rounded-xl ring-1 ring-slate-200" /><p className="mt-2 text-center text-sm text-slate-500">{ver.comprobante.archivo}</p></>}</Modal>
      <p className="text-xs text-slate-500">Visto por {usuario.nombre}. Los datos personales se muestran solo a quien gestiona al equipo.</p>
    </div>
  )
}

// ───────────── Detalle de tienda ─────────────
export function TiendaPage() {
  const { id } = useParams()
  const app = useApp()
  const { maps, idx, reintegros, empresa, ausencias, horasExtras, empleados, coberturas } = app
  const nav = useNavigate()
  const t = maps.tienda[id]
  if (!t) return <Vacio>Tienda no encontrada.</Vacio>
  const sem = semaforoTienda(idx, t, { reintegros })
  const plantel = empleados.filter((e) => e.tiendaId === id)
  const ausT = ausencias.filter((a) => a.tiendaId === id).sort((a, b) => b.desde.localeCompare(a.desde)).slice(0, 6)
  const he = horasExtras.filter((h) => h.tiendaId === id && h.estado !== 'rechazada').reduce((s, h) => s + h.horas, 0)
  const dias = range(HOY, addDays(HOY, 6))
  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-semibold text-brand-700"><Icon n="left" size={16} /> Volver</button>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-bold">{t.nombre}</h1><p className="text-sm text-slate-600">{t.ciudad}, {t.departamento} · {maps.region[t.regionId].nombre} · {t.apertura.horario} ({t.apertura.dias})</p><p className="mt-1 text-sm text-slate-700">📌 {t.datoRelevante}</p></div><Semaforo nivel={sem.nivel} /></div>
        {sem.motivos.length > 0 && <ul className="mt-2 list-inside list-disc text-sm text-slate-600">{sem.motivos.map((m) => <li key={m}>{m}</li>)}</ul>}
      </Card>
      <section>
        <Titulo>Hoy, turno por turno</Titulo>
        <div className="grid gap-3 md:grid-cols-2">
          {['M', 'T'].map((f) => { const s = slot(idx, t, HOY, f); return (
            <Card key={f} className="p-4">
              <div className="mb-2 flex items-center justify-between"><b>{empresa.franjas[f].nombre} · {empresa.franjas[f].inicio}–{empresa.franjas[f].fin}</b><Badge tono={s.huecos ? 'bad' : 'ok'}>{s.presentes}/{s.requeridos} {s.huecos ? 'FALTA' : 'completo'}</Badge></div>
              <ul className="space-y-1 text-sm">{s.filas.map((r) => <li key={r.id} className="flex items-center justify-between"><span>{r.tipo === 'cobertura' ? `↳ ${nombreCobertor(r, maps)} (cobertura)` : maps.emp[r.empleadoId].nombre}</span>{r.estado === 'ausente' ? <Badge tono="warn">Ausente</Badge> : r.estado === 'licencia' ? <Badge tono="info">Licencia</Badge> : <Badge tono="ok">Presente</Badge>}</li>)}</ul>
              {s.huecos > 0 && s.ausentes.map((r) => !r.cubiertoPor && <Link key={r.id} to={`/cobertura/${r.ausenciaId}`} className="btn-primary btn-sm mt-3">Buscar cobertura para {maps.emp[r.empleadoId].nombre.split(' ')[0]}</Link>)}
            </Card>) })}
        </div>
      </section>
      <section>
        <Titulo>Próximos 7 días</Titulo>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {dias.map((d) => { const h = ['M', 'T'].reduce((a, f) => a + slot(idx, t, d, f).huecos, 0); const cerrada = !t.diasAbierto.includes(dow(d)); return <div key={d} className={cx('rounded-xl p-2 ring-1', cerrada ? 'bg-slate-100 text-slate-400 ring-slate-200' : h ? 'bg-red-50 ring-red-300 text-red-800' : 'bg-emerald-50 ring-emerald-200 text-emerald-800')}><div className="font-bold">{fmtDia(d).split(' ')[0]}</div><div>{d.slice(8)}</div><div className="mt-1 font-bold">{cerrada ? 'Cerrada' : h ? `${h} hueco${h > 1 ? 's' : ''}` : '✓'}</div></div> })}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-2 font-bold">Equipo ({plantel.length})</h2><ul className="divide-y divide-slate-100 text-sm">{plantel.map((e) => <li key={e.id}><Link to={`/equipo/${e.id}`} className="flex items-center justify-between py-2 hover:text-brand-700"><span className="flex items-center gap-2"><Avatar nombre={e.nombre} color={e.avatarColor} size={28} />{e.nombre}</span><span className="text-slate-500">{e.cargo}</span></Link></li>)}</ul></Card>
        <Card className="p-5"><h2 className="mb-2 font-bold">Últimas ausencias · {he} h extras (5 sem.)</h2><ul className="divide-y divide-slate-100 text-sm">{ausT.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-2"><span>{maps.emp[a.empleadoId].nombre.split(' ')[0]} · {TIPOS_AUSENCIA[a.tipo]} · {fmt(a.desde)}</span><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></li>)}</ul></Card>
      </div>
    </div>
  )
}
