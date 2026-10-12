import { useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { WebLayout } from '../../components/Layouts.jsx'
import UyMap from '../../components/UyMap.jsx'
import { Avatar, Badge, BarrasH, BarrasV, Campo, Card, Estado, Icon, Modal, Semaforo, Stat, Tabs, Titulo, Vacio, cx } from '../../components/ui.jsx'
import { useApp } from '../../lib/store.jsx'
import { HOY, AHORA, addDays, dow, fmt, fmtCorto, fmtDia, hace, minDiff, range, startOfWeek, DIAS_KEY } from '../../lib/dates.js'
import { CAUSA_HE, ESTADO_LICENCIA, ESTADO_REINTEGRO, TIPOS_AUSENCIA, TIPO_SUPLENTE, num, pct, pesos } from '../../lib/labels.js'
import { huecosDia, metricas, peorNivel, semaforoTienda } from '../../lib/selectors.js'
import { AccionesElevada, AlertaItem, EstadoGestion, Responsable, CoberturaLista, CoberturaPage, EquipoPage, LegajoPage, ReintegrosPage, TiendaPage, huecosAbiertos, useAlertasActivas } from '../shared/Shared.jsx'

export default function SupervisorApp() {
  const { ausencias, idx, licencias, config } = useApp()
  const alertas = useAlertasActivas(null)
  const paraMi = licencias.filter((l) => l.estado === 'pendiente' && config.tiposLicencia.find((t) => t.id === l.tipo).aprobador === 'supervisor').length
  const huecos = huecosAbiertos({ ausencias, idx }).length
  const items = [
    { to: '/', label: 'Tablero nacional', icono: 'chart' },
    { to: '/mapa', label: 'Mapa de Uruguay', icono: 'map' },
    { to: '/comparativas', label: 'Comparativas', icono: 'grid' },
    { to: '/analisis', label: 'Análisis para decidir', icono: 'sliders' },
    { to: '/alertas', label: 'Alertas y aprobaciones', icono: 'alert', n: alertas.filter((a) => a.gestion?.estado === 'elevada').length + paraMi },
    { to: '/cobertura', label: 'Cobertura', icono: 'inbox', n: huecos },
    { to: '/reintegros', label: 'Reintegros', icono: 'heart' },
    { to: '/equipo', label: 'Personas', icono: 'users' },
    { to: '/reportes', label: 'Reportes', icono: 'download' },
    { to: '/config', label: 'Configuración', icono: 'sliders' },
  ]
  return (
    <WebLayout items={items} titulo="Casa matriz · Montevideo" subtitulo="Supervisión general">
      <Routes>
        <Route path="/" element={<Tablero />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/comparativas" element={<Comparativas />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/cobertura" element={<CoberturaLista />} />
        <Route path="/cobertura/:id" element={<CoberturaPage />} />
        <Route path="/reintegros" element={<ReintegrosPage />} />
        <Route path="/reintegros/:id" element={<ReintegrosPage />} />
        <Route path="/equipo" element={<EquipoPage />} />
        <Route path="/equipo/:id" element={<LegajoPage />} />
        <Route path="/tienda/:id" element={<TiendaPage />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/config" element={<Config />} />
        <Route path="*" element={<Tablero />} />
      </Routes>
    </WebLayout>
  )
}

const PERIODOS = { '4s': ['Últimas 4 semanas', -27], '7d': ['Últimos 7 días', -6] }
function useMetricas() {
  const { turnos, coberturas, horasExtras, config, empleados, tiendas, regiones } = useApp()
  const calc = (desde, hasta, tiendaIds, empCount) => metricas({ turnos, coberturas, horasExtras, config, desde, hasta, tiendaIds, empleadosCount: empCount })
  const nEmp = (pred) => empleados.filter((e) => e.tiendaId && pred(e)).length
  return { calc, nEmp, tiendas, regiones }
}


function useGestionRegiones() {
  const { regiones, tiendas, ausencias, licencias, cambios, horasExtras, alertas, idx, maps, reintegros } = useApp()
  const alertasActivas = useAlertasActivas(null)
  return regiones.map((r) => {
    const ids = new Set(tiendas.filter((t) => t.regionId === r.id).map((t) => t.id))
    const pendAus = ausencias.filter((a) => a.regionId === r.id && ['avisada', 'pendiente_comprobante'].includes(a.estado))
    const pendLic = licencias.filter((l) => l.regionId === r.id && l.estado === 'pendiente')
    const pendCam = cambios.filter((c) => c.estado === 'pendiente_coordinadora' && ids.has(c.tiendaId))
    const pendHE = horasExtras.filter((h) => h.regionId === r.id && h.estado === 'pendiente')
    const fechas = [...pendAus.map((a) => a.avisadoEn), ...pendLic.map((l) => l.solicitadaEn), ...pendCam.map((c) => c.creadaEn)]
    const masVieja = fechas.length ? Math.max(...fechas.map((f) => minDiff(f, AHORA))) : 0
    const resueltas = ausencias.filter((a) => a.regionId === r.id && a.resueltaEn && a.avisadoEn && a.resueltaPor)
    const tProm = resueltas.length ? resueltas.reduce((s, a) => s + Math.max(0, minDiff(a.avisadoEn, a.resueltaEn)), 0) / resueltas.length : 0
    const al = alertasActivas.filter((a) => a.regionId === r.id)
    const huecosHoy = [...ids].reduce((s, id) => s + huecosDia(idx, maps.tienda[id], HOY), 0)
    return { r, coord: maps.emp[r.coordinadoraId], pend: pendAus.length + pendLic.length + pendCam.length + pendHE.length, masVieja, tProm, sinGestionar: al.filter((a) => (a.gestion?.estado || 'sin_gestionar') === 'sin_gestionar').length, enGestion: al.filter((a) => a.gestion?.estado === 'en_gestion').length, elevadas: al.filter((a) => a.gestion?.estado === 'elevada').length, huecosHoy, reint: reintegros.filter((x) => x.regionId === r.id && x.estado === 'certificado_por_vencer').length }
  })
}
const durar = (min) => (min >= 1440 ? `${Math.floor(min / 1440)} d` : min >= 60 ? `${Math.floor(min / 60)} h` : `${Math.round(min)} min`)

function GestionRegiones() {
  const filas = useGestionRegiones()
  return (
    <Card className="overflow-x-auto">
      <div className="p-5 pb-2"><h2 className="font-bold">Gestión por región</h2><p className="text-sm text-slate-500">Quién es responsable en cada región y si está al día. Estos temas los resuelven las coordinadoras; llegan a vos solo si los elevan.</p></div>
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Región · responsable</th><th className="p-3 text-right">Pendientes en bandeja</th><th className="p-3 text-right">Más antigua</th><th className="p-3 text-right">Validación (prom.)</th><th className="p-3 text-right">Alertas sin gestionar</th><th className="p-3 text-right">En gestión</th><th className="p-3 text-right">Elevadas</th><th className="p-3 text-right">Huecos hoy</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((f) => (
            <tr key={f.r.id}>
              <td className="p-3"><div className="font-semibold">{f.r.nombre}</div><div className="text-xs text-slate-500">{f.coord.nombre}</div></td>
              <td className="p-3 text-right"><Badge tono={f.pend > 12 ? 'bad' : f.pend > 6 ? 'warn' : 'ok'}>{f.pend}</Badge></td>
              <td className="p-3 text-right tabular-nums">{f.pend ? durar(f.masVieja) : '—'}</td>
              <td className="p-3 text-right tabular-nums">{f.tProm ? durar(f.tProm) : '—'}</td>
              <td className="p-3 text-right"><Badge tono={f.sinGestionar ? 'warn' : 'ok'}>{f.sinGestionar}</Badge></td>
              <td className="p-3 text-right tabular-nums">{f.enGestion}</td>
              <td className="p-3 text-right"><Badge tono={f.elevadas ? 'info' : 'neutral'}>{f.elevadas}</Badge></td>
              <td className="p-3 text-right"><Badge tono={f.huecosHoy ? 'bad' : 'ok'}>{f.huecosHoy}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ElevadasCard() {
  const alertas = useAlertasActivas(null).filter((a) => a.gestion?.estado === 'elevada')
  if (!alertas.length) return <Card className="p-4 text-sm text-slate-600"><b>Sin temas elevados.</b> Las coordinadoras están resolviendo lo suyo; si necesitan tu decisión, aparece acá.</Card>
  return (
    <Card className="border-l-4 border-sky-500 p-5">
      <h2 className="font-bold">Elevados a vos ({alertas.length})</h2>
      <p className="mb-2 text-sm text-slate-500">Una coordinadora pidió tu decisión. Hasta que respondas, sos el responsable.</p>
      <ul className="space-y-2">{alertas.map((a) => <AlertaItem key={a.id} a={a} rol="supervisor" />)}</ul>
    </Card>
  )
}

// ───────────── Tablero ─────────────
function Tablero() {
  const app = useApp()
  const { calc, nEmp, tiendas, regiones } = useMetricas()
  const { turnos, idx, reintegros, licencias, config, acciones } = app
  const [per, setPer] = useState('4s')
  const desde = addDays(HOY, PERIODOS[per][1])
  const total = calc(desde, HOY, null, nEmp(() => true))
  const alertas = useAlertasActivas(null)
  const semanas = Array.from({ length: 4 }, (_, i) => { const d = addDays(startOfWeek(HOY), (i - 4) * 7); const m = calc(d, addDays(d, 6), null, 1); return { etiqueta: fmtCorto(d), valor: +m.ausentismo.toFixed(1), actual: i === 3 } })
  const porRegion = regiones.map((r) => { const ids = new Set(tiendas.filter((t) => t.regionId === r.id).map((t) => t.id)); const m = calc(desde, HOY, ids, nEmp((e) => e.regionId === r.id)); return { r, m } })
  const paraMi = licencias.filter((l) => l.estado === 'pendiente' && config.tiposLicencia.find((t) => t.id === l.tipo).aprobador === 'supervisor')
  const rojas = tiendas.filter((t) => semaforoTienda(idx, t, { reintegros }).nivel === 'rojo')
  const prom = total.hePorPersona
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><Titulo sub="Los 19 departamentos, 30 tiendas, 5 regiones">Tablero nacional</Titulo><Tabs valor={per} onChange={setPer} tabs={Object.entries(PERIODOS).map(([id, [label]]) => ({ id, label }))} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Ausentismo" value={pct(total.ausentismo)} sub={`${total.ausentes} de ${num(total.programados)} turnos`} tono={total.ausentismo > 6 ? 'bad' : total.ausentismo > 4 ? 'warn' : 'ok'} />
        <Stat label="Horas extras" value={`${num(total.horasHE)} h`} sub={`${num(total.hePorPersona, 1)} h por persona`} />
        <Stat label="Tasa de cobertura" value={pct(total.cobertura, 0)} sub={`${total.cubiertos} cubiertos · ${total.sinCubrir} sin cubrir`} tono={total.cobertura < 70 ? 'bad' : total.cobertura < 85 ? 'warn' : 'ok'} />
        <Stat label="Tiempo de cobertura" value={`${num(total.tiempoCobertura)} min`} sub="Del envío de la oferta a la aceptación" />
        <Stat label="Costo estimado" value={pesos(total.costo)} sub={`Extras ${pesos(total.costoHE)} · suplentes ${pesos(total.costoSup)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1"><h2 className="font-bold">Ausentismo semanal</h2><p className="mb-2 text-sm text-slate-500">% de turnos con ausencia, semanas completas</p><BarrasV datos={semanas} formato={(v) => `${v}%`} /></Card>
        <Card className="p-5 lg:col-span-1"><h2 className="font-bold">Horas extras por persona</h2><p className="mb-3 text-sm text-slate-500">Por región, {PERIODOS[per][0].toLowerCase()}</p>
          <BarrasH datos={porRegion.map(({ r, m }) => ({ etiqueta: r.nombre, valor: +m.hePorPersona.toFixed(1), color: m.hePorPersona > prom * 1.5 ? '#dc2626' : r.color }))} formato={(v) => `${v} h`} />
          {porRegion.some(({ m }) => m.hePorPersona > prom * 1.5) && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-800">⚠ {porRegion.find(({ m }) => m.hePorPersona > prom * 1.5).r.nombre} está {Math.round((porRegion.find(({ m }) => m.hePorPersona > prom * 1.5).m.hePorPersona / prom - 1) * 100)} % sobre el promedio nacional. <Link className="underline" to="/comparativas?region=este">Ver detalle</Link></p>}
        </Card>
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-bold">Hoy, de un vistazo</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {['rojo', 'amarillo', 'verde'].map((n) => { const c = tiendas.filter((t) => semaforoTienda(idx, t, { reintegros }).nivel === n).length; return <div key={n} className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-bold">{c}</div><Semaforo nivel={n} conTexto={false} size={14} /><div className="text-xs text-slate-600">{n === 'rojo' ? 'Sin cobertura' : n === 'amarillo' ? 'Atención' : 'Sin novedades'}</div></div> })}
          </div>
          <ul className="mt-3 space-y-1 text-sm">{rojas.map((t) => <li key={t.id}><Link className="font-semibold text-brand-700 hover:underline" to={`/tienda/${t.id}`}>● {t.nombre.replace('Pagnifique ', '')}</Link> <span className="text-slate-500">({t.departamento})</span></li>)}</ul>
          <Link to="/mapa" className="btn-secondary btn-sm mt-3"><Icon n="map" size={14} /> Abrir mapa</Link>
        </Card>
      </div>

      <ElevadasCard />

      {paraMi.length > 0 && (
        <Card className="border-l-4 border-sky-500 p-5">
          <h2 className="font-bold">Esperan tu aprobación ({paraMi.length})</h2>
          <p className="text-sm text-slate-500">Licencias que, según las reglas, resuelve Supervisión general.</p>
          <LicenciasSup lista={paraMi} />
        </Card>
      )}

      <GestionRegiones />

      <section>
        <Titulo accion={<Link to="/alertas" className="btn-ghost btn-sm">Ver todas ({alertas.length})</Link>} sub="Las gestionan las coordinadoras; acá ves quién es responsable y en qué están">Alertas en seguimiento</Titulo>
        <ul className="space-y-2">{alertas.filter((a) => a.gestion?.estado !== 'elevada').slice(0, 5).map((a) => <AlertaItem key={a.id} a={a} rol="supervisor" compacta />)}</ul>
      </section>
      <p className="hidden">{turnos.length}{acciones ? '' : ''}</p>
    </div>
  )
}

function LicenciasSup({ lista }) {
  const { maps, acciones, config } = useApp()
  const [rech, setRech] = useState(null)
  const [motivo, setMotivo] = useState('')
  return (
    <>
      <ul className="mt-3 divide-y divide-slate-100">
        {lista.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <Avatar nombre={maps.emp[l.empleadoId].nombre} color={maps.emp[l.empleadoId].avatarColor} size={34} />
            <div className="min-w-0 flex-1"><b>{maps.emp[l.empleadoId].nombre}</b> · {maps.tienda[l.tiendaId].nombre.replace('Pagnifique ', '')}<div className="text-slate-600">{config.tiposLicencia.find((t) => t.id === l.tipo).nombre} · {fmt(l.desde)} al {fmt(l.hasta)} ({l.dias} d){l.comentario && ` · “${l.comentario}”`}</div></div>
            <button className="btn-ok btn-sm" onClick={() => acciones.resolverLicencia(l.id, 'aprobada')}>Aprobar</button>
            <button className="btn-danger btn-sm" onClick={() => { setRech(l); setMotivo('') }}>Rechazar</button>
          </li>
        ))}
      </ul>
      <Modal abierto={!!rech} onCerrar={() => setRech(null)} titulo="Rechazar licencia">
        <div className="space-y-3"><Campo label="Motivo"><textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo><button disabled={!motivo} className="btn-danger w-full" onClick={() => { acciones.resolverLicencia(rech.id, 'rechazada', motivo); setRech(null) }}>Rechazar</button></div>
      </Modal>
    </>
  )
}

// ───────────── Mapa ─────────────
function Mapa() {
  const { tiendas, idx, reintegros, turnos, coberturas, horasExtras, config, empleados } = useApp()
  const [modo, setModo] = useState('cobertura')
  const [sel, setSel] = useState('Montevideo')
  const deptos = [...new Set(tiendas.map((t) => t.departamento))]
  const info = useMemo(() => Object.fromEntries(deptos.map((d) => {
    const ts = tiendas.filter((t) => t.departamento === d)
    const sems = ts.map((t) => semaforoTienda(idx, t, { reintegros }))
    const ids = new Set(ts.map((t) => t.id))
    const n = empleados.filter((e) => ids.has(e.tiendaId)).length
    const m = metricas({ turnos, coberturas, horasExtras, config, desde: addDays(HOY, -27), hasta: HOY, tiendaIds: ids, empleadosCount: n })
    const nivel = modo === 'cobertura' ? peorNivel(sems.map((s) => s.nivel)) : modo === 'ausentismo' ? (m.ausentismo > 6 ? 'rojo' : m.ausentismo > 3.5 ? 'amarillo' : 'verde') : (m.hePorPersona > 5 ? 'rojo' : m.hePorPersona > 3 ? 'amarillo' : 'verde')
    return [d, { ts, sems, m, nivel }]
  })), [tiendas, idx, reintegros, turnos, coberturas, horasExtras, config, empleados, modo])
  const niveles = Object.fromEntries(Object.entries(info).map(([d, v]) => [d, v.nivel]))
  const conteos = Object.fromEntries(Object.entries(info).map(([d, v]) => [d, v.ts.length]))
  const s = info[sel]
  const leyenda = { cobertura: ['Con hueco hoy', 'Huecos próximos 7 días o certificado por vencer', 'Dotación completa'], ausentismo: ['> 6 % de turnos', '3,5 % a 6 %', '< 3,5 %'], extras: ['> 5 h por persona', '3 a 5 h por persona', '< 3 h por persona'] }[modo]
  return (
    <div className="space-y-4">
      <Titulo sub="Tocá un departamento para ver sus tiendas y actuar">Mapa de Uruguay</Titulo>
      <Tabs valor={modo} onChange={setModo} tabs={[{ id: 'cobertura', label: 'Cobertura hoy' }, { id: 'ausentismo', label: 'Ausentismo (4 sem.)' }, { id: 'extras', label: 'Horas extras (4 sem.)' }]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4"><UyMap niveles={niveles} conteos={conteos} seleccionado={sel} onSelect={setSel} />
          <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-700">{['rojo', 'amarillo', 'verde'].map((n, i) => <li key={n} className="flex items-center gap-1.5"><Semaforo nivel={n} conTexto={false} /> {leyenda[i]}</li>)}</ul>
        </Card>
        <Card className="p-5">
          {s ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{sel}</h2><Semaforo nivel={s.nivel} /></div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{pct(s.m.ausentismo)}</div><div className="text-xs text-slate-500">ausentismo</div></div><div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{num(s.m.hePorPersona, 1)} h</div><div className="text-xs text-slate-500">extras/persona</div></div><div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{pct(s.m.cobertura, 0)}</div><div className="text-xs text-slate-500">cobertura</div></div></div>
              <ul className="space-y-2">{s.ts.map((t, i) => <li key={t.id}><Link to={`/tienda/${t.id}`} className="block rounded-xl p-3 ring-1 ring-slate-200 hover:ring-brand-600"><div className="flex items-center justify-between gap-2"><b>{t.nombre.replace('Pagnifique ', '')}</b><Semaforo nivel={s.sems[i].nivel} /></div><div className="mt-1 text-xs text-slate-600">{s.sems[i].motivos.join(' · ') || 'Dotación completa'}</div><div className="mt-1 text-xs text-slate-500">📌 {t.datoRelevante}</div></Link></li>)}</ul>
            </div>
          ) : <Vacio>Elegí un departamento.</Vacio>}
        </Card>
      </div>
    </div>
  )
}

// ───────────── Comparativas ─────────────
function Comparativas() {
  const { tiendas, regiones, empleados, maps } = useApp()
  const { calc } = useMetricas()
  const [sp, setSp] = useSearchParams()
  const regionSel = sp.get('region') || ''
  const [orden, setOrden] = useState('ausentismo')
  const desde = addDays(HOY, -27)
  const regs = regiones.map((r) => { const ids = new Set(tiendas.filter((t) => t.regionId === r.id).map((t) => t.id)); return { r, m: calc(desde, HOY, ids, empleados.filter((e) => e.regionId === r.id && e.tiendaId).length) } })
  const promHE = calc(desde, HOY, null, empleados.filter((e) => e.tiendaId).length).hePorPersona
  const filas = tiendas.filter((t) => !regionSel || t.regionId === regionSel).map((t) => ({ t, m: calc(desde, HOY, new Set([t.id]), empleados.filter((e) => e.tiendaId === t.id).length) }))
  filas.sort((a, b) => (orden === 'nombre' ? a.t.nombre.localeCompare(b.t.nombre) : orden === 'cobertura' ? a.m.cobertura - b.m.cobertura : orden === 'extras' ? b.m.hePorPersona - a.m.hePorPersona : orden === 'costo' ? b.m.costo - a.m.costo : b.m.ausentismo - a.m.ausentismo))
  const th = (id, label, right) => <th className={cx('p-3', right && 'text-right')}><button onClick={() => setOrden(id)} className={cx('font-bold uppercase', orden === id ? 'text-brand-700' : 'text-slate-500')}>{label}{orden === id ? ' ↓' : ''}</button></th>
  return (
    <div className="space-y-6">
      <Titulo sub="Últimas 4 semanas">Comparativas entre regiones y tiendas</Titulo>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><h2 className="mb-3 font-bold">Ausentismo</h2><BarrasH datos={regs.map(({ r, m }) => ({ etiqueta: r.nombre, valor: +m.ausentismo.toFixed(1), color: r.color }))} formato={(v) => `${v} %`} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Horas extras por persona</h2><BarrasH datos={regs.map(({ r, m }) => ({ etiqueta: r.nombre, valor: +m.hePorPersona.toFixed(1), color: m.hePorPersona > promHE * 1.5 ? '#dc2626' : r.color }))} formato={(v) => `${v} h`} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Tasa de cobertura</h2><BarrasH max={100} datos={regs.map(({ r, m }) => ({ etiqueta: r.nombre, valor: Math.round(m.cobertura), color: r.color }))} formato={(v) => `${v} %`} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Costo estimado</h2><BarrasH datos={regs.map(({ r, m }) => ({ etiqueta: r.nombre, valor: Math.round(m.costo), color: r.color }))} formato={pesos} /></Card>
      </div>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Tiendas</h2>
          <select className="input w-auto" aria-label="Filtrar por región" value={regionSel} onChange={(e) => setSp(e.target.value ? { region: e.target.value } : {})}><option value="">Todas las regiones</option>{regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs"><tr>{th('nombre', 'Tienda')}<th className="p-3 text-xs uppercase text-slate-500">Región</th>{th('ausentismo', 'Ausentismo', true)}{th('cobertura', 'Cobertura', true)}{th('extras', 'Extras/persona', true)}{th('costo', 'Costo', true)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(({ t, m }) => <tr key={t.id} className="hover:bg-brand-50/40"><td className="p-3"><Link to={`/tienda/${t.id}`} className="font-semibold text-brand-700">{t.nombre.replace('Pagnifique ', '')}</Link><div className="text-xs text-slate-500">{t.departamento}</div></td><td className="p-3 text-slate-600">{maps.region[t.regionId].nombre}</td>
                <td className="p-3 text-right"><Badge tono={m.ausentismo > 6 ? 'bad' : m.ausentismo > 3.5 ? 'warn' : 'ok'}>{pct(m.ausentismo)}</Badge></td><td className="p-3 text-right"><Badge tono={m.cobertura < 70 ? 'bad' : m.cobertura < 90 ? 'warn' : 'ok'}>{pct(m.cobertura, 0)}</Badge></td><td className="p-3 text-right tabular-nums">{num(m.hePorPersona, 1)} h</td><td className="p-3 text-right tabular-nums">{pesos(m.costo)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  )
}

// ───────────── Alertas ─────────────
function Alertas() {
  const { alertas, licencias, config } = useApp()
  const activas = useAlertasActivas(null)
  const resueltas = alertas.filter((a) => a.resuelta || !activas.includes(a))
  const paraMi = licencias.filter((l) => l.estado === 'pendiente' && config.tiposLicencia.find((t) => t.id === l.tipo).aprobador === 'supervisor')
  const [ver, setVer] = useState(false)
  const grupos = [
    ['elevada', 'Elevadas a vos: requieren tu decisión', 'Las elevó una coordinadora. Desde ahí sos el responsable.'],
    ['sin_gestionar', 'Sin gestionar: nadie se hizo cargo todavía', 'Le corresponden a la coordinadora de la región. Podés recordárselo.'],
    ['en_gestion', 'En gestión: ya las está resolviendo la coordinadora', 'Solo lectura. Si lo necesita, ella las eleva.'],
  ]
  return (
    <div className="space-y-6">
      <Titulo sub="Las resuelven las coordinadoras. Vos decidís lo que te elevan y controlás que no queden sin dueño">Alertas y aprobaciones</Titulo>
      {paraMi.length > 0 && <Card className="border-l-4 border-sky-500 p-5"><h2 className="font-bold">Licencias que requieren tu aprobación</h2><LicenciasSup lista={paraMi} /></Card>}
      {grupos.map(([est, tit, sub]) => { const l = activas.filter((a) => (a.gestion?.estado || 'sin_gestionar') === est); return (
        <section key={est}><h2 className="font-bold">{tit} ({l.length})</h2><p className="mb-2 text-sm text-slate-500">{sub}</p>
          {l.length ? <ul className="space-y-2">{l.map((a) => <AlertaItem key={a.id} a={a} rol="supervisor" />)}</ul> : <Vacio icono="✓">Nada en esta categoría.</Vacio>}</section>) })}
      <button onClick={() => setVer(!ver)} className="btn-ghost btn-sm">{ver ? 'Ocultar' : 'Ver'} alertas resueltas ({resueltas.length})</button>
      {ver && <ul className="space-y-1 text-sm text-slate-500">{resueltas.map((a) => <li key={a.id}><span className="line-through">{a.titulo}</span>{a.decision && <span> · decisión: {a.decision}</span>}</li>)}</ul>}
    </div>
  )
}

// ───────────── Análisis para decidir ─────────────
function Analisis() {
  const { regiones, tiendas, turnos, ausencias, horasExtras, coberturas, licencias, suplentes, idx, maps, config, empleados } = useApp()
  const desde = addDays(HOY, -27)
  const sem = range(addDays(HOY, 1), addDays(HOY, 7))
  const panorama = regiones.map((r) => {
    const ts = tiendas.filter((t) => t.regionId === r.id)
    const huecos = ts.reduce((s, t) => s + sem.reduce((a, d) => a + huecosDia(idx, t, d), 0), 0)
    const bolsa = suplentes.filter((x) => x.regionId === r.id)
    const libres = bolsa.reduce((s, x) => s + sem.reduce((a, d) => a + x.disponibilidad[DIAS_KEY[dow(d)]].filter((f) => !(idx.porSuplente.get(x.id) || []).some((row) => row.fecha === d)).length, 0), 0)
    return { r, huecos, bolsa: bolsa.length, libres, licFut: licencias.filter((l) => l.regionId === r.id && l.estado !== 'rechazada' && l.hasta >= HOY && l.desde <= addDays(HOY, 30)).reduce((s, l) => s + l.dias, 0) }
  })
  const porTipo = Object.entries(TIPOS_AUSENCIA).map(([k, v]) => ({ etiqueta: v, valor: ausencias.filter((a) => a.tipo === k && a.desde >= desde && a.desde <= HOY).length })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor)
  const porCausa = Object.entries(CAUSA_HE).map(([k, v]) => ({ etiqueta: v, valor: horasExtras.filter((h) => h.causa === k && h.fecha >= desde && h.estado !== 'rechazada').reduce((s, h) => s + h.horas, 0) })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor)
  const porTipoSup = Object.entries(TIPO_SUPLENTE).map(([k, v]) => { const cs = coberturas.filter((c) => c.estado === 'aceptada' && c.suplenteId && maps.sup[c.suplenteId].tipo === k); return { k, v, n: cs.length, costo: cs.reduce((s, c) => s + c.pagoEstimado, 0) } })
  const prest = coberturas.filter((c) => c.estado === 'aceptada' && c.empleadoId)
  const reinc = empleados.filter((e) => e.tiendaId).map((e) => { const l = ausencias.filter((a) => a.empleadoId === e.id && a.tipo !== 'licencia' && a.desde >= addDays(HOY, -56)); return { e, n: l.length, lunes: l.filter((a) => dow(a.desde) === 0).length, sinAviso: l.filter((a) => a.tipo === 'falta_sin_aviso').length } }).filter((x) => x.n >= 3).sort((a, b) => b.n - a.n)
  const totalHE = porCausa.reduce((s, x) => s + x.valor, 0)
  void turnos; void config
  return (
    <div className="space-y-6">
      <Titulo sub="Lo que necesitás mirar para decidir refuerzos, contrataciones y presupuesto">Análisis para decidir</Titulo>
      <Card className="overflow-x-auto">
        <div className="p-5 pb-2"><h2 className="font-bold">Próximos 7 días: huecos vs. capacidad de la bolsa</h2><p className="text-sm text-slate-500">Si los huecos superan la disponibilidad de suplentes, hay que reforzar la bolsa o autorizar horas extras. Incluye las licencias ya pedidas para los próximos 30 días.</p></div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Región</th><th className="p-3 text-right">Huecos (7 días)</th><th className="p-3 text-right">Suplentes en la bolsa</th><th className="p-3 text-right">Franjas libres de suplentes</th><th className="p-3 text-right">Días de licencia (30 d)</th><th className="p-3">Lectura</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{panorama.map((p) => (
            <tr key={p.r.id}><td className="p-3 font-semibold">{p.r.nombre}</td><td className="p-3 text-right tabular-nums">{p.huecos}</td><td className="p-3 text-right tabular-nums">{p.bolsa}</td><td className="p-3 text-right tabular-nums">{p.libres}</td><td className="p-3 text-right tabular-nums">{p.licFut}</td>
              <td className="p-3">{p.huecos === 0 ? <Badge tono="ok">Sin huecos</Badge> : p.libres >= p.huecos * 2 ? <Badge tono="ok">Bolsa alcanza</Badge> : <Badge tono="bad">Bolsa justa</Badge>}</td></tr>))}</tbody>
        </table>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-bold">Ausencias por motivo</h2><p className="mb-3 text-sm text-slate-500">Últimas 4 semanas, todo el país</p><BarrasH datos={porTipo} formato={(v) => `${v}`} /></Card>
        <Card className="p-5"><h2 className="font-bold">Horas extras por causa</h2><p className="mb-3 text-sm text-slate-500">Últimas 4 semanas · {num(totalHE)} h en total. Las de “ausencia sin cubrir” se evitan con más suplentes; las de “pico de demanda” piden refuerzo de dotación.</p><BarrasH datos={porCausa} formato={(v) => `${v} h`} /></Card>
      </div>
      <Card className="p-5">
        <h2 className="font-bold">Cómo se cubre: costo por tipo de suplente</h2>
        <p className="mb-3 text-sm text-slate-500">Para decidir si conviene ampliar la bolsa propia o seguir recurriendo a externos y a personal de otras tiendas.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {porTipoSup.map((t) => <div key={t.k} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase text-slate-500">{t.v}</div><div className="text-xl font-bold">{t.n} coberturas</div><div className="text-sm text-slate-600">{pesos(t.costo)} · {t.n ? pesos(t.costo / t.n) : '—'} c/u</div></div>)}
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase text-slate-500">Préstamos entre tiendas</div><div className="text-xl font-bold">{prest.length} coberturas</div><div className="text-sm text-slate-600">{pesos(prest.reduce((s, c) => s + c.pagoEstimado, 0))}</div></div>
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <div className="p-5 pb-2"><h2 className="font-bold">Personas con ausencias reiteradas</h2><p className="text-sm text-slate-500">3 o más ausencias en las últimas 8 semanas. El seguimiento lo hace la coordinadora; acá ves dónde se repite.</p></div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Persona</th><th className="p-3">Tienda</th><th className="p-3 text-right">Ausencias</th><th className="p-3 text-right">Lunes</th><th className="p-3 text-right">Sin aviso</th><th className="p-3">Responsable</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{reinc.map((x) => <tr key={x.e.id}><td className="p-3"><Link className="font-semibold text-brand-700" to={`/equipo/${x.e.id}`}>{x.e.nombre}</Link></td><td className="p-3">{maps.tienda[x.e.tiendaId].nombre.replace('Pagnifique ', '')}</td><td className="p-3 text-right"><Badge tono="bad">{x.n}</Badge></td><td className="p-3 text-right">{x.lunes}</td><td className="p-3 text-right">{x.sinAviso}</td><td className="p-3 text-slate-600">{maps.emp[maps.region[x.e.regionId].coordinadoraId].nombre}</td></tr>)}
            {reinc.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={6}>Nadie supera el umbral.</td></tr>}</tbody>
        </table>
      </Card>
    </div>
  )
}

// ───────────── Reportes ─────────────
function Reportes() {
  const { tiendas, empleados, ausencias, horasExtras, coberturas, licencias, reintegros, maps, turnos, config } = useApp()
  const { calc } = useMetricas()
  const [tipo, setTipo] = useState('ausentismo')
  const [desde, setDesde] = useState(addDays(HOY, -27))
  const [hasta, setHasta] = useState(HOY)
  const rep = useMemo(() => {
    if (tipo === 'ausentismo') return { cols: ['Tienda', 'Departamento', 'Región', 'Turnos', 'Ausentes', 'Ausentismo %', 'Cobertura %'], rows: tiendas.map((t) => { const m = calc(desde, hasta, new Set([t.id]), 1); return [t.nombre, t.departamento, maps.region[t.regionId].nombre, m.programados, m.ausentes, +m.ausentismo.toFixed(2), Math.round(m.cobertura)] }) }
    if (tipo === 'extras') return { cols: ['Fecha', 'Persona', 'Tienda', 'Región', 'Horas', 'Causa', 'Estado', 'Costo $U'], rows: horasExtras.filter((h) => h.fecha >= desde && h.fecha <= hasta).map((h) => [fmt(h.fecha), maps.emp[h.empleadoId].nombre, maps.tienda[h.tiendaId].nombre, maps.region[h.regionId].nombre, h.horas, CAUSA_HE[h.causa], h.estado, h.horas * config.valorHoraExtra]) }
    if (tipo === 'coberturas') return { cols: ['Enviada', 'Tienda', 'Persona', 'Tipo', 'Estado', 'Respuesta (min)', 'Km', 'Pago estimado $U'], rows: coberturas.filter((c) => c.fechaDesde >= desde && c.fechaDesde <= hasta).map((c) => [c.enviadaEn.replace('T', ' ').slice(0, 16), maps.tienda[c.tiendaId].nombre, c.suplenteId ? maps.sup[c.suplenteId].nombre : maps.emp[c.empleadoId].nombre, c.tipoOferta, c.estado, c.tiempoRespuestaMin ?? '', c.distanciaKm, c.pagoEstimado]) }
    if (tipo === 'licencias') return { cols: ['Persona', 'Tienda', 'Tipo', 'Desde', 'Hasta', 'Días', 'Estado', 'Motivo de rechazo'], rows: licencias.filter((l) => l.desde <= hasta && l.hasta >= desde).map((l) => [maps.emp[l.empleadoId].nombre, maps.tienda[l.tiendaId].nombre, l.tipo, fmt(l.desde), fmt(l.hasta), l.dias, l.estado, l.motivoRechazo || '']) }
    if (tipo === 'ausencias') return { cols: ['Fecha', 'Persona', 'Tienda', 'Tipo', 'Estado', 'Comprobante'], rows: ausencias.filter((a) => a.desde >= desde && a.desde <= hasta).map((a) => [fmt(a.desde), maps.emp[a.empleadoId].nombre, maps.tienda[a.tiendaId].nombre, TIPOS_AUSENCIA[a.tipo], a.estado, a.comprobante?.archivo || '']) }
    return { cols: ['Persona', 'Tienda', 'Motivo', 'Desde', 'Estado', 'Alta prevista'], rows: reintegros.map((r) => [maps.emp[r.empleadoId].nombre, maps.tienda[r.tiendaId].nombre, r.motivo, fmt(r.desde), ESTADO_REINTEGRO[r.estado][0], fmt(r.altaPrevista)]) }
  }, [tipo, desde, hasta, tiendas, empleados, ausencias, horasExtras, coberturas, licencias, reintegros, maps, turnos, config])
  const exportar = () => {
    const esc = (v) => `"${String(v).replaceAll('"', '""')}"`
    const csv = '﻿' + [rep.cols, ...rep.rows].map((r) => r.map(esc).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `pagnifique_${tipo}_${HOY}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-4">
      <Titulo sub="Elegí el reporte, el período y exportalo">Reportes y exportación</Titulo>
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Reporte"><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="ausentismo">Ausentismo por tienda</option><option value="ausencias">Detalle de ausencias</option><option value="extras">Horas extras</option><option value="coberturas">Ofertas de cobertura</option><option value="licencias">Licencias</option><option value="reintegros">Reintegros</option></select></Campo>
        <Campo label="Desde"><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
        <Campo label="Hasta"><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
        <button className="btn-primary" onClick={exportar}><Icon n="download" size={16} /> Exportar CSV (Excel)</button>
        <button className="btn-secondary" onClick={() => window.print()}>Imprimir / PDF</button>
      </div>
      <Card className="overflow-x-auto">
        <div className="p-3 text-sm text-slate-600">{rep.rows.length} filas · {fmt(desde)} al {fmt(hasta)}</div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{rep.cols.map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rep.rows.slice(0, 60).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="p-3">{v}</td>)}</tr>)}</tbody>
        </table>
        {rep.rows.length > 60 && <div className="p-3 text-xs text-slate-500">Vista previa de 60 filas. El CSV incluye todas.</div>}
      </Card>
    </div>
  )
}

// ───────────── Configuración ─────────────
function Config() {
  const { config, acciones } = useApp()
  const set = (fn) => acciones.setConfig(fn)
  const Num = ({ valor, onChange, sufijo, ancho = 'w-24', label }) => <label className="inline-flex items-center gap-1"><input aria-label={label} type="number" min="0" className={cx('input !w-auto py-1.5', ancho)} value={valor} onChange={(e) => onChange(Number(e.target.value))} />{sufijo && <span className="text-xs text-slate-500">{sufijo}</span>}</label>
  return (
    <div className="space-y-6">
      <Titulo sub="Los cambios se aplican al instante en toda la demo">Configuración</Titulo>
      <Card className="overflow-x-auto p-0">
        <div className="p-4 pb-2 font-bold">Tipos de licencia</div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Tipo</th><th className="p-3">Días máx.</th><th className="p-3">Aviso previo</th><th className="p-3">Con goce</th><th className="p-3">Comprobante</th><th className="p-3">Aprueba</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {config.tiposLicencia.map((t, i) => (
              <tr key={t.id}>
                <td className="p-3 font-semibold">{t.nombre}</td>
                <td className="p-3"><Num label={`Días máximos ${t.nombre}`} valor={t.diasMax} sufijo="días" onChange={(v) => set((c) => { c.tiposLicencia[i].diasMax = v })} /></td>
                <td className="p-3"><Num label={`Aviso previo ${t.nombre}`} valor={t.avisoDias} sufijo="días" onChange={(v) => set((c) => { c.tiposLicencia[i].avisoDias = v })} /></td>
                <td className="p-3"><input type="checkbox" aria-label={`Con goce ${t.nombre}`} className="h-5 w-5 accent-brand-600" checked={t.goce} onChange={(e) => set((c) => { c.tiposLicencia[i].goce = e.target.checked })} /></td>
                <td className="p-3"><input type="checkbox" aria-label={`Comprobante ${t.nombre}`} className="h-5 w-5 accent-brand-600" checked={t.comprobante} onChange={(e) => set((c) => { c.tiposLicencia[i].comprobante = e.target.checked })} /></td>
                <td className="p-3"><select aria-label={`Aprobador ${t.nombre}`} className="input !w-auto py-1.5" value={t.aprobador} onChange={(e) => set((c) => { c.tiposLicencia[i].aprobador = e.target.value })}><option value="coordinadora">Coordinadora regional</option><option value="supervisor">Supervisión general</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Reglas de aprobación</h2>
          <ul className="space-y-2">{config.reglasAprobacion.map((r, i) => <li key={r.id}><label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-600" checked={r.activa} onChange={(e) => set((c) => { c.reglasAprobacion[i].activa = e.target.checked })} /><span className={r.activa ? '' : 'text-slate-400 line-through'}>{r.regla}</span></label></li>)}</ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Plazos de aviso por ausencia</h2>
          <div className="space-y-2">{Object.entries(config.plazosAviso).filter(([k]) => k !== 'comprobanteHoras').map(([k, v]) => <Campo key={k} label={TIPOS_AUSENCIA[k]}><input className="input" value={v} onChange={(e) => set((c) => { c.plazosAviso[k] = e.target.value })} /></Campo>)}
            <Campo label="Plazo para subir comprobante"><Num label="Horas para comprobante" valor={config.plazosAviso.comprobanteHoras} sufijo="horas" onChange={(v) => set((c) => { c.plazosAviso.comprobanteHoras = v })} /></Campo></div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-bold">Parámetros de costo y jornada</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Tope semanal (horas)"><Num label="Tope semanal" valor={config.horasSemanalesTope} sufijo="h" onChange={(v) => set((c) => { c.horasSemanalesTope = v })} /></Campo>
            <Campo label="Valor hora extra"><Num label="Valor hora extra" valor={config.valorHoraExtra} sufijo="$U" onChange={(v) => set((c) => { c.valorHoraExtra = v })} /></Campo>
            {Object.entries(config.tarifaSuplenteHora).map(([k, v]) => <Campo key={k} label={`Tarifa hora · ${TIPO_SUPLENTE[k]}`}><Num label={`Tarifa ${TIPO_SUPLENTE[k]}`} valor={v} sufijo="$U" onChange={(nv) => set((c) => { c.tarifaSuplenteHora[k] = nv })} /></Campo>)}
          </div>
        </Card>
      </div>
    </div>
  )
}
