import { useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { WebLayout } from '../../components/Layouts.jsx'
import { Avatar, Badge, Campo, Card, Estado, Icon, Modal, Semaforo, Stat, Tabs, Titulo, Vacio, cx } from '../../components/ui.jsx'
import { useApp } from '../../lib/store.jsx'
import { HOY, addDays, dow, fmt, fmtCorto, fmtDia, hace, range, startOfWeek, DIAS_CORTO, DIAS_KEY, fmtFechaHora } from '../../lib/dates.js'
import { CAUSA_HE, ESTADO_AUSENCIA, ESTADO_LICENCIA, TIPOS_AUSENCIA, TIPO_SUPLENTE, ESTADO_OFERTA, num, pct, pesos } from '../../lib/labels.js'
import { metricas, semaforoTienda, slot, coberturaAusencia, NO_TRABAJA } from '../../lib/selectors.js'
import { AlertaItem, CoberturaLista, CoberturaPage, EquipoPage, LegajoPage, ReintegrosPage, TiendaPage, huecosAbiertos, useAlertasActivas } from '../shared/Shared.jsx'

export function useBandeja(regionId) {
  const { ausencias, licencias, cambios, horasExtras, config } = useApp()
  return useMemo(() => {
    const aus = ausencias.filter((a) => a.regionId === regionId && ['avisada', 'pendiente_comprobante'].includes(a.estado)).sort((a, b) => b.avisadoEn.localeCompare(a.avisadoEn))
    const lic = licencias.filter((l) => l.regionId === regionId && l.estado === 'pendiente').sort((a, b) => a.solicitadaEn.localeCompare(b.solicitadaEn))
    const cam = cambios.filter((c) => c.estado === 'pendiente_coordinadora' && c.tiendaId && true)
    const he = horasExtras.filter((h) => h.regionId === regionId && h.estado === 'pendiente')
    return { aus, lic, cam, he, total: aus.length + lic.filter((l) => config.tiposLicencia.find((t) => t.id === l.tipo).aprobador !== 'supervisor').length + cam.length + he.length }
  }, [ausencias, licencias, cambios, horasExtras, regionId, config])
}

export default function CoordinadoraApp() {
  const { usuario, maps, cambios, tiendas } = useApp()
  const regionId = usuario.regionId
  const region = maps.region[regionId]
  const b = useBandeja(regionId)
  const camR = b.cam.filter((c) => maps.tienda[c.tiendaId].regionId === regionId)
  const { ausencias, idx } = useApp()
  const huecos = huecosAbiertos({ ausencias, idx, regionId }).length
  const items = [
    { to: '/', label: 'Panel de región', icono: 'grid' },
    { to: '/bandeja', label: 'Bandeja', icono: 'inbox', n: b.aus.length + b.lic.length + camR.length + b.he.length },
    { to: '/cobertura', label: 'Cobertura', icono: 'alert', n: huecos },
    { to: '/planificador', label: 'Planificador', icono: 'calendar' },
    { to: '/suplentes', label: 'Bolsa de suplentes', icono: 'users' },
    { to: '/reintegros', label: 'Reintegros', icono: 'heart' },
    { to: '/equipo', label: 'Equipo', icono: 'user' },
  ]
  void cambios; void tiendas
  return (
    <WebLayout items={items} titulo={`Región ${region.nombre}`} subtitulo="Coordinadora regional">
      <Routes>
        <Route path="/" element={<Panel regionId={regionId} />} />
        <Route path="/bandeja" element={<Bandeja regionId={regionId} />} />
        <Route path="/cobertura" element={<CoberturaLista regionId={regionId} />} />
        <Route path="/cobertura/:id" element={<CoberturaPage />} />
        <Route path="/planificador" element={<Planificador regionId={regionId} />} />
        <Route path="/suplentes" element={<BolsaSuplentes regionId={regionId} />} />
        <Route path="/reintegros" element={<ReintegrosPage regionId={regionId} />} />
        <Route path="/reintegros/:id" element={<ReintegrosPage regionId={regionId} />} />
        <Route path="/equipo" element={<EquipoPage regionId={regionId} />} />
        <Route path="/equipo/:id" element={<LegajoPage />} />
        <Route path="/tienda/:id" element={<TiendaPage />} />
        <Route path="*" element={<Panel regionId={regionId} />} />
      </Routes>
    </WebLayout>
  )
}

// ───────────── Panel ─────────────
function Panel({ regionId }) {
  const app = useApp()
  const { tiendas, idx, reintegros, turnos, coberturas, horasExtras, empleados, config, maps } = app
  const ts = tiendas.filter((t) => t.regionId === regionId)
  const ids = new Set(ts.map((t) => t.id))
  const sems = ts.map((t) => ({ t, s: semaforoTienda(idx, t, { reintegros }) }))
  const alertas = useAlertasActivas(regionId)
  const b = useBandeja(regionId)
  const nEmp = empleados.filter((e) => e.regionId === regionId && e.tiendaId).length
  const m = metricas({ turnos, coberturas, horasExtras, config, desde: addDays(HOY, -27), hasta: HOY, tiendaIds: ids, empleadosCount: nEmp })
  const ausHoy = turnos.filter((t) => t.tipo === 'normal' && t.fecha === HOY && ids.has(t.tiendaId) && t.estado === 'ausente').length
  const huecosHoy = sems.reduce((s, x) => s + x.s.huecosHoy, 0)
  const cnt = { rojo: 0, amarillo: 0, verde: 0 }
  sems.forEach((x) => cnt[x.s.nivel]++)
  const orden = { rojo: 0, amarillo: 1, verde: 2 }
  sems.sort((a, b2) => orden[a.s.nivel] - orden[b2.s.nivel])
  return (
    <div className="space-y-6">
      <Titulo sub="Lunes 12/10/2026 · estado de tus tiendas en tiempo real">Panel de {maps.region[regionId].nombre}</Titulo>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Ausentes hoy" value={ausHoy} />
        <Stat label="Huecos sin cubrir hoy" value={huecosHoy} tono={huecosHoy ? 'bad' : 'ok'} />
        <Link to="/bandeja"><Stat label="Pendientes en bandeja" value={b.aus.length + b.lic.length + b.he.length + b.cam.filter((c) => ids.has(c.tiendaId)).length} tono="warn" sub="Tocá para resolver" className="h-full hover:ring-2 hover:ring-brand-600" /></Link>
        <Stat label="Ausentismo (4 sem.)" value={pct(m.ausentismo)} sub={`Cobertura ${pct(m.cobertura, 0)}`} />
        <Stat label="Horas extras (4 sem.)" value={`${num(m.horasHE)} h`} sub={`${num(m.hePorPersona, 1)} h por persona`} />
      </div>
      {alertas.length > 0 && (
        <section>
          <Titulo sub="Cada alerta lleva directo a la acción">Alertas de la región</Titulo>
          <ul className="space-y-2">{alertas.map((a) => <AlertaItem key={a.id} a={a} rol="coordinadora" />)}</ul>
        </section>
      )}
      <section>
        <Titulo sub={`${cnt.rojo} rojas · ${cnt.amarillo} amarillas · ${cnt.verde} verdes`}>Semáforo por tienda</Titulo>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sems.map(({ t, s }) => (
            <Link key={t.id} to={`/tienda/${t.id}`} className={cx('block rounded-2xl border-l-4 bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600', s.nivel === 'rojo' ? 'border-l-red-500' : s.nivel === 'amarillo' ? 'border-l-amber-500' : 'border-l-emerald-500')}>
              <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{t.nombre.replace('Pagnific ', '')}</div><div className="text-xs text-slate-500">{t.departamento} · {t.dotacionPorTurno} por turno</div></div><Semaforo nivel={s.nivel} /></div>
              <ul className="mt-2 min-h-[2.5rem] space-y-0.5 text-sm text-slate-600">{s.motivos.length ? s.motivos.map((x) => <li key={x}>• {x}</li>) : <li>• Dotación completa los próximos 7 días</li>}</ul>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// ───────────── Bandeja ─────────────
function Bandeja({ regionId }) {
  const app = useApp()
  const { acciones, maps, idx, empresa, config, usuario } = app
  const b = useBandeja(regionId)
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'ausencias'
  const camR = b.cam.filter((c) => maps.tienda[c.tiendaId].regionId === regionId)
  const [rech, setRech] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [ver, setVer] = useState(null)
  const [val, setVal] = useState(null)
  const [comentario, setComentario] = useState('')
  return (
    <div className="space-y-4">
      <Titulo sub="Todo lo que espera tu respuesta">Bandeja de solicitudes</Titulo>
      <Tabs valor={tab} onChange={(t) => setSp({ tab: t })} tabs={[{ id: 'ausencias', label: 'Ausencias', n: b.aus.length }, { id: 'licencias', label: 'Licencias', n: b.lic.length }, { id: 'cambios', label: 'Cambios de turno', n: camR.length }, { id: 'extras', label: 'Horas extras', n: b.he.length }]} />

      {tab === 'ausencias' && (
        <ul className="space-y-3">
          {b.aus.length === 0 && <Vacio icono="✅">No hay ausencias por validar.</Vacio>}
          {b.aus.map((a) => {
            const e = maps.emp[a.empleadoId]
            const cob = coberturaAusencia(idx, a)
            return (
              <Card as="li" key={a.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar nombre={e.nombre} color={e.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Link to={`/equipo/${e.id}`} className="font-bold text-brand-700">{e.nombre}</Link><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></div>
                    <div className="text-sm text-slate-600">{maps.tienda[a.tiendaId].nombre} · {TIPOS_AUSENCIA[a.tipo]} · {fmt(a.desde)}{a.hasta !== a.desde && ` al ${fmt(a.hasta)}`} · avisó {hace(a.avisadoEn)}</div>
                    <div className="mt-1 text-sm">“{a.motivo}”</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {a.comprobante ? <button onClick={() => setVer(a)} className="btn-secondary btn-sm"><Icon n="file" size={14} /> {a.comprobante.archivo}</button> : <Badge tono="warn">Sin comprobante</Badge>}
                      {cob.sinCubrirFut.length > 0 ? <Link to={`/cobertura/${a.id}`} className="btn-secondary btn-sm"><Icon n="alert" size={14} /> {cob.sinCubrirFut.length} turno(s) sin cubrir · buscar cobertura</Link> : cob.cubiertas > 0 ? <Badge tono="ok">Cubierta</Badge> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setVal(a); setComentario('') }} disabled={!a.comprobante && a.tipo !== 'tramite_personal'} className="btn-ok btn-sm" title={!a.comprobante ? 'Falta el comprobante' : ''}>Validar</button>
                    <button onClick={() => { setRech(a); setMotivo('') }} className="btn-danger btn-sm">Rechazar</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      {tab === 'licencias' && (
        <ul className="space-y-3">
          {b.lic.length === 0 && <Vacio icono="✅">No hay licencias pendientes.</Vacio>}
          {b.lic.map((l) => {
            const e = maps.emp[l.empleadoId]
            const tl = config.tiposLicencia.find((t) => t.id === l.tipo)
            const afectados = (idx.porEmpleado.get(l.empleadoId) || []).filter((t) => t.tipo === 'normal' && t.fecha >= l.desde && t.fecha <= l.hasta && !NO_TRABAJA.includes(t.estado)).length
            const sup = tl.aprobador === 'supervisor'
            return (
              <Card as="li" key={l.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar nombre={e.nombre} color={e.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Link to={`/equipo/${e.id}`} className="font-bold text-brand-700">{e.nombre}</Link><Badge tono="warn">{tl.nombre}</Badge>{sup && <Badge tono="info">Requiere Supervisión</Badge>}</div>
                    <div className="text-sm text-slate-600">{maps.tienda[l.tiendaId].nombre} · {fmt(l.desde)} al {fmt(l.hasta)} ({l.dias} días) · pedida {hace(l.solicitadaEn)}</div>
                    {l.comentario && <div className="mt-1 text-sm">“{l.comentario}”</div>}
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700"><span>Saldo: <b>{e.saldoLicenciaDias} d</b></span><span className={afectados ? 'font-semibold text-amber-800' : ''}>Turnos afectados: <b>{afectados}</b> {afectados > 0 && '(quedarán a cubrir)'}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={sup} onClick={() => acciones.resolverLicencia(l.id, 'aprobada')} className="btn-ok btn-sm" title={sup ? 'La aprueba Supervisión general' : ''}>Aprobar</button>
                    <button onClick={() => { setRech(l); setMotivo('') }} className="btn-danger btn-sm">Rechazar</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      {tab === 'cambios' && (
        <ul className="space-y-3">
          {camR.length === 0 && <Vacio icono="✅">No hay pedidos de cambio.</Vacio>}
          {camR.map((c) => {
            const a = idx.porId.get(c.turnoId), d = idx.porId.get(c.turnoDestinoId)
            return (
              <Card as="li" key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1 text-sm"><div className="font-bold">{maps.tienda[c.tiendaId].nombre}</div><div><b>{maps.emp[c.solicitanteId].nombre}</b> ({a && `${fmtDia(a.fecha)} ${empresa.franjas[a.franja].nombre}`}) ⇄ <b>{maps.emp[c.companeroId].nombre}</b> ({d && `${fmtDia(d.fecha)} ${empresa.franjas[d.franja].nombre}`})</div><div className="text-slate-600">Motivo: {c.motivo}</div></div>
                <button onClick={() => acciones.resolverCambio(c.id, true)} className="btn-ok btn-sm">Aprobar</button>
                <button onClick={() => { setRech(c); setMotivo('') }} className="btn-danger btn-sm">Rechazar</button>
              </Card>
            )
          })}
        </ul>
      )}

      {tab === 'extras' && (
        <ul className="space-y-3">
          {b.he.length === 0 && <Vacio icono="✅">No hay horas extras pendientes.</Vacio>}
          {b.he.map((h) => (
            <Card as="li" key={h.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1"><b>{maps.emp[h.empleadoId].nombre}</b> · {maps.tienda[h.tiendaId].nombre.replace('Pagnific ', '')}<div className="text-slate-600">{fmt(h.fecha)} · <b>{h.horas} h</b> · {CAUSA_HE[h.causa]} · {pesos(h.horas * config.valorHoraExtra)}</div></div>
              <button onClick={() => acciones.resolverHE(h.id, true)} className="btn-ok btn-sm">Autorizar</button>
              <button onClick={() => acciones.resolverHE(h.id, false)} className="btn-secondary btn-sm">Rechazar</button>
            </Card>
          ))}
        </ul>
      )}

      <Modal abierto={!!ver} onCerrar={() => setVer(null)} titulo={ver ? `Comprobante de ${maps.emp[ver.empleadoId].nombre}` : ''}>
        {ver && <><img src={ver.comprobante.imagen} alt={`Comprobante ${ver.comprobante.archivo}`} className="mx-auto max-h-96 rounded-xl ring-1 ring-slate-200" /><p className="mt-2 text-center text-sm text-slate-500">{ver.comprobante.archivo} · subido {hace(ver.comprobante.subidoEn)}</p><div className="mt-3 flex justify-end gap-2"><button className="btn-ok" onClick={() => { setVal(ver); setVer(null); setComentario('') }}>Validar</button></div></>}
      </Modal>
      <Modal abierto={!!val} onCerrar={() => setVal(null)} titulo="Validar ausencia">
        {val && <div className="space-y-3"><p className="text-sm text-slate-600">{maps.emp[val.empleadoId].nombre} · {TIPOS_AUSENCIA[val.tipo]} · {fmt(val.desde)}</p><Campo label="Comentario (opcional)"><input className="input" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comprobante válido" /></Campo><button className="btn-ok w-full" onClick={() => { acciones.validarAusencia(val.id, comentario); setVal(null) }}>Confirmar validación</button></div>}
      </Modal>
      <Modal abierto={!!rech} onCerrar={() => setRech(null)} titulo="Rechazar con motivo">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">La persona recibe el motivo en su celular.</p>
          <div className="flex flex-wrap gap-2">{['El comprobante no corresponde a la fecha', 'Falta información en el comprobante', 'No se alcanza la dotación mínima en esas fechas', 'Solicitud fuera de plazo'].map((m) => <button key={m} onClick={() => setMotivo(m)} className="btn-secondary btn-sm">{m}</button>)}</div>
          <Campo label="Motivo"><textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
          <button disabled={!motivo} className="btn-danger w-full" onClick={() => {
            if (rech.tipo && rech.empleadoId && rech.avisadoEn) acciones.rechazarAusencia(rech.id, motivo)
            else if (rech.solicitanteId) acciones.resolverCambio(rech.id, false, motivo)
            else acciones.resolverLicencia(rech.id, 'rechazada', motivo)
            setRech(null)
          }}>Rechazar</button>
        </div>
      </Modal>
      <p className="text-xs text-slate-500">Resuelve {usuario.nombre}.</p>
    </div>
  )
}

// ───────────── Planificador ─────────────
function Planificador({ regionId }) {
  const app = useApp()
  const { tiendas, empleados, idx, empresa, config, acciones, maps } = app
  const ts = tiendas.filter((t) => t.regionId === regionId)
  const [tid, setTid] = useState(ts.find((t) => t.id === 'T02')?.id || ts[0].id)
  const [semana, setSemana] = useState(startOfWeek(HOY))
  const [celda, setCelda] = useState(null)
  const [hueco, setHueco] = useState(null)
  const t = maps.tienda[tid]
  const plantel = empleados.filter((e) => e.tiendaId === tid)
  const dias = range(semana, addDays(semana, 6))
  const filas = (eid, f) => (idx.porEmpleado.get(eid) || []).filter((x) => x.fecha === f && x.tipo === 'normal')
  const horasSem = (eid) => dias.reduce((s, d) => s + filas(eid, d).filter((x) => !NO_TRABAJA.includes(x.estado)).length * 8, 0)
  const excedidos = plantel.filter((e) => horasSem(e.id) > config.horasSemanalesTope)
  const tope = config.horasSemanalesTope
  return (
    <div className="space-y-4">
      <Titulo sub="Asigná, cambiá o quitá turnos. Te avisamos si alguien supera el tope semanal.">Planificador de turnos</Titulo>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" aria-label="Tienda" value={tid} onChange={(e) => setTid(e.target.value)}>{ts.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          <button aria-label="Semana anterior" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setSemana(addDays(semana, -7))}><Icon n="left" /></button>
          <span className="px-2 text-sm font-semibold">{fmtCorto(semana)} al {fmtCorto(addDays(semana, 6))}</span>
          <button aria-label="Semana siguiente" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setSemana(addDays(semana, 7))}><Icon n="right" /></button>
        </div>
      </div>
      {excedidos.length > 0 && <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"><b>⚠ Horas extras:</b> {excedidos.map((e) => `${e.nombre} (${horasSem(e.id)} h, +${horasSem(e.id) - tope} h)`).join(' · ')}. Superan el tope de {tope} h semanales: requieren tu autorización.</div>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="sticky left-0 bg-slate-50 p-3 text-left">Persona</th>{dias.map((d) => <th key={d} className={cx('p-2 text-center', d === HOY && 'text-brand-700')}>{DIAS_CORTO[dow(d)]}<br />{fmtCorto(d)}</th>)}<th className="p-3 text-right">Horas</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {plantel.map((e) => {
              const h = horasSem(e.id)
              return (
                <tr key={e.id}>
                  <td className="sticky left-0 bg-white p-3"><div className="flex items-center gap-2"><Avatar nombre={e.nombre} color={e.avatarColor} size={28} /><div><div className="font-semibold">{e.nombre.split(' ')[0]} {e.nombre.split(' ')[1]}</div><div className="text-xs text-slate-500">{e.cargo}</div></div></div></td>
                  {dias.map((d) => {
                    const fs = filas(e.id, d)
                    return (
                      <td key={d} className="p-1 text-center">
                        <button onClick={() => setCelda({ e, d, fs })} aria-label={`${e.nombre} ${fmtDia(d)}`} className={cx('min-h-[44px] w-full rounded-lg px-1 py-1 text-xs font-bold hover:ring-2 hover:ring-brand-600', !t.diasAbierto.includes(dow(d)) && 'bg-slate-100')}>
                          {fs.length === 0 ? <span className="text-slate-300">—</span> : fs.map((f) => <span key={f.id} className={cx('mb-0.5 block rounded-md px-1 py-1', f.estado === 'ausente' ? 'bg-amber-100 text-amber-900 line-through' : f.estado === 'licencia' ? 'bg-sky-100 text-sky-900' : f.franja === 'M' ? 'bg-brand-100 text-brand-800' : 'bg-violet-100 text-violet-800')}>{f.franja === 'M' ? 'Mañana' : 'Tarde'}{f.estado === 'ausente' ? ' ✕' : ''}</span>)}
                        </button>
                      </td>
                    )
                  })}
                  <td className={cx('p-3 text-right font-bold tabular-nums', h > tope ? 'text-red-700' : 'text-slate-700')}>{h} h{h > tope && <div className="text-xs">+{h - tope} extra</div>}</td>
                </tr>
              )
            })}
            {['M', 'T'].map((f) => (
              <tr key={f} className="bg-slate-50">
                <td className="sticky left-0 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-600">Dotación {f === 'M' ? 'mañana' : 'tarde'} ({t.dotacionPorTurno})</td>
                {dias.map((d) => { const s = slot(idx, t, d, f); const cerrada = !t.diasAbierto.includes(dow(d)); return <td key={d} className="p-1 text-center">{cerrada ? <span className="text-slate-400">cerrada</span> : <button onClick={() => s.huecos && setHueco({ d, f })} className={cx('w-full rounded-lg py-1.5 text-xs font-bold', s.huecos ? 'bg-red-100 text-red-800 hover:ring-2 hover:ring-red-500' : 'bg-emerald-100 text-emerald-800 cursor-default')} aria-label={s.huecos ? `Hueco ${f} ${fmtDia(d)}: asignar` : 'Completo'}>{s.presentes}/{s.requeridos}{s.huecos ? ' · Asignar' : ' ✓'}</button>}</td> })}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-500">Cada turno = 8 h. Tope semanal: {tope} h. Tocá una celda para cambiar el turno; tocá un hueco rojo para asignar a alguien.</p>

      <Modal abierto={!!celda} onCerrar={() => setCelda(null)} titulo={celda ? `${celda.e.nombre} · ${fmtDia(celda.d)}` : ''}>
        {celda && (() => {
          const { e, d, fs } = celda
          const pasado = d < HOY
          const activo = fs.find((x) => !NO_TRABAJA.includes(x.estado))
          const nuevaH = horasSem(e.id) + (activo ? 0 : 8)
          return (
            <div className="space-y-3">
              {pasado && <p className="rounded-xl bg-slate-100 p-3 text-sm">Es una fecha pasada: solo lectura.</p>}
              {fs.map((x) => <div key={x.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span><b>{empresa.franjas[x.franja].nombre}</b> {empresa.franjas[x.franja].inicio}–{empresa.franjas[x.franja].fin} · {x.estado}</span>{!pasado && !x.ausenciaId && <div className="flex gap-1"><button className="btn-secondary btn-sm" onClick={() => { acciones.cambiarFranja(x.id); setCelda(null) }}>Pasar a {x.franja === 'M' ? 'tarde' : 'mañana'}</button><button className="btn-danger btn-sm" onClick={() => { acciones.quitarTurno(x.id); setCelda(null) }}>Quitar</button></div>}</div>)}
              {!pasado && !activo && fs.length === 0 && (
                <div className="grid grid-cols-2 gap-2">{['M', 'T'].map((f) => <button key={f} className="btn-primary" onClick={() => { acciones.asignarTurno({ empleadoId: e.id, tiendaId: tid, fecha: d, franja: f }); setCelda(null) }}>Asignar {f === 'M' ? 'mañana' : 'tarde'}</button>)}</div>
              )}
              {!pasado && !activo && fs.length === 0 && nuevaH > tope && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">⚠ Con este turno {e.nombre.split(' ')[0]} llega a {nuevaH} h: {nuevaH - tope} h extra (≈ {pesos((nuevaH - tope) * config.valorHoraExtra)}).</p>}
              {!t.diasAbierto.includes(dow(d)) && <p className="text-sm text-amber-800">La tienda está cerrada ese día.</p>}
            </div>
          )
        })()}
      </Modal>
      <Modal abierto={!!hueco} onCerrar={() => setHueco(null)} titulo={hueco ? `Cubrir hueco · ${fmtDia(hueco.d)} · ${hueco.f === 'M' ? 'mañana' : 'tarde'}` : ''}>
        {hueco && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Personas de {t.nombre.replace('Pagnific ', '')} sin turno ese día. Si superan el tope, se pagan horas extras. Para sumar un suplente, usá <Link to="/cobertura" className="font-semibold text-brand-700">Cobertura</Link>.</p>
            <ul className="space-y-2">
              {plantel.filter((e) => filas(e.id, hueco.d).filter((x) => !NO_TRABAJA.includes(x.estado)).length === 0 && !filas(e.id, hueco.d).some((x) => x.estado === 'licencia')).map((e) => { const h = horasSem(e.id) + 8; return (
                <li key={e.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><Avatar nombre={e.nombre} color={e.avatarColor} size={32} /><div className="flex-1"><b>{e.nombre}</b><div className={h > tope ? 'font-semibold text-red-700' : 'text-slate-500'}>{horasSem(e.id)} h → {h} h {h > tope && `· +${h - tope} h extra`}</div></div><button className="btn-primary btn-sm" onClick={() => { acciones.asignarTurno({ empleadoId: e.id, tiendaId: tid, fecha: hueco.d, franja: hueco.f }); setHueco(null) }}>Asignar</button></li>) })}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ───────────── Bolsa de suplentes ─────────────
function BolsaSuplentes({ regionId }) {
  const { suplentes, coberturas, idx } = useApp()
  const [tipo, setTipo] = useState('todos')
  const [abierto, setAbierto] = useState(null)
  const lista = suplentes.filter((s) => s.regionId === regionId && (tipo === 'todos' || s.tipo === tipo))
  return (
    <div className="space-y-4">
      <Titulo sub={`${lista.length} personas en tu bolsa`}>Bolsa de suplentes</Titulo>
      <Tabs valor={tipo} onChange={setTipo} tabs={[{ id: 'todos', label: 'Todos' }, ...Object.entries(TIPO_SUPLENTE).map(([id, label]) => ({ id, label }))]} />
      <div className="grid gap-4 lg:grid-cols-2">
        {lista.map((s) => {
          const of = coberturas.filter((c) => c.suplenteId === s.id)
          const resp = of.filter((c) => c.tiempoRespuestaMin)
          const acept = of.filter((c) => c.estado === 'aceptada').length
          const tasa = of.filter((c) => c.estado !== 'pendiente' && c.estado !== 'cancelada').length
          const prox = (idx.porSuplente.get(s.id) || []).filter((r) => r.fecha >= HOY).length
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar nombre={s.nombre} color={s.avatarColor} size={44} />
                <div className="min-w-0 flex-1"><div className="font-bold">{s.nombre}</div><div className="text-sm text-slate-600">{TIPO_SUPLENTE[s.tipo]} · base {s.base.ciudad} · ⭐ {s.calificacion.toFixed(1)}</div><div className="text-xs text-slate-500">{s.telefono} · {s.coberturasRealizadas} coberturas · {prox} agendadas</div></div>
                {prox > 0 && <Badge tono="info">{prox} próximas</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">{s.zonas.map((z) => <Badge key={z}>{z}</Badge>)}{s.habilitaciones.map((h) => <Badge key={h} tono="info">{h}</Badge>)}</div>
              <div className="mt-3 overflow-x-auto"><table className="w-full text-center text-[11px]"><thead><tr><th />{DIAS_CORTO.map((d) => <th key={d} className="font-semibold text-slate-500">{d}</th>)}</tr></thead><tbody>{['M', 'T'].map((f) => <tr key={f}><td className="pr-1 text-right font-semibold text-slate-500">{f === 'M' ? 'Mañ.' : 'Tarde'}</td>{DIAS_KEY.map((k) => <td key={k} className="p-0.5"><div className={cx('rounded-md py-1 font-bold', s.disponibilidad[k].includes(f) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400')} aria-label={s.disponibilidad[k].includes(f) ? 'disponible' : 'no disponible'}>{s.disponibilidad[k].includes(f) ? '✓' : '–'}</div></td>)}</tr>)}</tbody></table></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-600">Acepta {tasa ? Math.round((acept / tasa) * 100) : 0} % · responde en {resp.length ? Math.round(resp.reduce((a, c) => a + c.tiempoRespuestaMin, 0) / resp.length) : '—'} min</span><button className="btn-ghost btn-sm" onClick={() => setAbierto(abierto === s.id ? null : s.id)}>{abierto === s.id ? 'Ocultar ofertas' : `Ver ofertas (${of.length})`}</button></div>
              {abierto === s.id && <ul className="mt-2 divide-y divide-slate-100 text-sm">{of.slice(-6).reverse().map((c) => <li key={c.id} className="flex items-center justify-between py-1.5"><span>{c.tiendaId} · {fmt(c.fechaDesde)} · {fmtFechaHora(c.enviadaEn).slice(11)}</span><Estado mapa={ESTADO_OFERTA} valor={c.estado} /></li>)}{of.length === 0 && <li className="py-2 text-slate-500">Sin ofertas todavía.</li>}</ul>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
