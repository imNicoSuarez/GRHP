import { useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { PhoneFrame } from '../../components/Layouts.jsx'
import { Badge, Card, Estado, Icon, Modal, Titulo, Vacio, Avatar, BarrasV, cx } from '../../components/ui.jsx'
import { useApp } from '../../lib/store.jsx'
import { HOY, DIAS, DIAS_CORTO, DIAS_KEY, addDays, fmt, fmtDia, hace, startOfWeek, fmtCorto } from '../../lib/dates.js'
import { ESTADO_OFERTA, TIPO_SUPLENTE, pesos } from '../../lib/labels.js'
import { Notificaciones } from '../empleado/EmpleadoApp.jsx'

const useYo = () => {
  const app = useApp()
  const yo = app.maps.sup[app.usuario.suplenteId]
  const ofertas = app.coberturas.filter((c) => c.suplenteId === yo.id && c.estado === 'pendiente')
  const noLeidas = app.notificaciones.filter((n) => n.usuarioId === app.usuario.id && !n.leida).length
  return { ...app, yo, ofertas, noLeidas }
}
const horarioDe = (empresa, c) => (c.franja === 'MT' ? 'Turnos varios' : `${empresa.franjas[c.franja].inicio} a ${empresa.franjas[c.franja].fin}`)
const fechaDe = (c) => (c.fechaDesde === c.fechaHasta ? fmtDia(c.fechaDesde) : `${fmtDia(c.fechaDesde)} al ${fmtDia(c.fechaHasta)}`)

export default function SuplenteApp() {
  const { ofertas, noLeidas } = useYo()
  const tabs = [
    { to: '/', label: 'Ofertas', icono: 'inbox', n: ofertas.length },
    { to: '/disponibilidad', label: 'Disponibilidad', icono: 'calendar' },
    { to: '/coberturas', label: 'Coberturas', icono: 'check' },
    { to: '/horas', label: 'Mis horas', icono: 'clock' },
  ]
  const Bell = <Link to="/notificaciones" aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`} className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100"><Icon n="bell" />{noLeidas > 0 && <span className="absolute right-0.5 top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{noLeidas}</span>}</Link>
  const P = (titulo, el, extra = {}) => <PhoneFrame tabs={tabs} titulo={titulo} derecha={Bell} {...extra}>{el}</PhoneFrame>
  return (
    <Routes>
      <Route path="/" element={P('Ofertas de cobertura', <Ofertas />)} />
      <Route path="/ofertas" element={P('Ofertas de cobertura', <Ofertas />)} />
      <Route path="/disponibilidad" element={P('Mi disponibilidad', <Disponibilidad />)} />
      <Route path="/coberturas" element={P('Mis coberturas', <Coberturas />)} />
      <Route path="/horas" element={P('Mis horas', <Horas />)} />
      <Route path="/notificaciones" element={P('Notificaciones', <Notificaciones />, { atras: '/' })} />
      <Route path="*" element={P('Ofertas de cobertura', <Ofertas />)} />
    </Routes>
  )
}

function Ofertas() {
  const { yo, ofertas, coberturas, maps, empresa, acciones } = useYo()
  const nav = useNavigate()
  const [rechazar, setRechazar] = useState(null)
  const hist = coberturas.filter((c) => c.suplenteId === yo.id && c.estado !== 'pendiente').sort((a, b) => b.enviadaEn.localeCompare(a.enviadaEn)).slice(0, 8)
  const motivos = ['No tengo disponibilidad', 'Me queda lejos', 'Ya tengo otro compromiso', 'Prefiero no cubrir esa tienda']
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3"><Avatar nombre={yo.nombre} color={yo.avatarColor} size={44} /><div><div className="font-bold">Hola, {yo.nombre.split(' ')[0]}</div><div className="text-sm text-slate-600">⭐ {yo.calificacion.toFixed(1)} · {yo.coberturasRealizadas} coberturas</div></div></div>
      <Titulo sub={ofertas.length ? 'Respondé rápido: se asigna a quien acepta primero' : undefined}>{ofertas.length ? `Tenés ${ofertas.length} oferta${ofertas.length > 1 ? 's' : ''} nueva${ofertas.length > 1 ? 's' : ''}` : 'Sin ofertas por ahora'}</Titulo>
      {ofertas.length === 0 && <Vacio icono="☕">Cuando una tienda necesite cobertura en tu zona, te llega acá.</Vacio>}
      {ofertas.map((c) => {
        const t = maps.tienda[c.tiendaId]
        const urgente = c.fechaDesde === HOY
        return (
          <Card key={c.id} className={cx('overflow-hidden', urgente && 'ring-2 ring-red-500')}>
            {urgente && <div className="bg-red-600 px-4 py-1 text-xs font-bold text-white">URGENTE · HOY</div>}
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2"><div><div className="text-lg font-bold">{t.nombre}</div><div className="text-sm text-slate-600">{t.ciudad}, {t.departamento}</div></div><span className="text-xs text-slate-500">{hace(c.enviadaEn)}</span></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="label">Cuándo</dt><dd className="font-semibold">{fechaDe(c)}</dd></div>
                <div><dt className="label">Horario</dt><dd className="font-semibold">{horarioDe(empresa, c)}</dd></div>
                <div><dt className="label">Distancia</dt><dd className="font-semibold">{c.distanciaKm} km desde tu base</dd></div>
                <div><dt className="label">Pago estimado</dt><dd className="text-lg font-bold text-emerald-700">{pesos(c.pagoEstimado)}</dd></div>
              </dl>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setRechazar(c)} className="btn-secondary py-3">Rechazar</button>
                <button onClick={() => { acciones.responderOferta(c.id, 'aceptada'); nav('/coberturas') }} className="btn-ok py-3">Aceptar</button>
              </div>
            </div>
          </Card>
        )
      })}
      {hist.length > 0 && <section><Titulo>Ofertas anteriores</Titulo><ul className="space-y-2">{hist.map((c) => <Card as="li" key={c.id} className="flex items-center justify-between gap-2 p-3 text-sm"><div><b>{maps.tienda[c.tiendaId].nombre}</b><div className="text-slate-500">{fechaDe(c)}{c.tiempoRespuestaMin ? ` · respondiste en ${c.tiempoRespuestaMin} min` : ''}</div></div><Estado mapa={ESTADO_OFERTA} valor={c.estado} /></Card>)}</ul></section>}
      <Modal abierto={!!rechazar} onCerrar={() => setRechazar(null)} titulo="¿Por qué la rechazás?">
        <p className="mb-3 text-sm text-slate-600">Le sirve a tu coordinadora para ofrecerla a otra persona.</p>
        <div className="space-y-2">{motivos.map((m) => <button key={m} onClick={() => { acciones.responderOferta(rechazar.id, 'rechazada', m); setRechazar(null) }} className="btn-secondary w-full justify-start">{m}</button>)}</div>
      </Modal>
    </div>
  )
}

function Disponibilidad() {
  const { yo, acciones, empresa } = useYo()
  const total = DIAS_KEY.reduce((s, k) => s + yo.disponibilidad[k].length, 0)
  return (
    <div className="space-y-4 p-4">
      <Card className="p-4 text-sm"><div className="font-bold">Tocá para marcar cuándo podés cubrir</div><p className="mt-1 text-slate-600">Solo te ofrecemos coberturas en los horarios y zonas que marques. Los cambios se guardan al instante.</p></Card>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-slate-200 text-center text-xs font-bold uppercase text-slate-500">
          <div className="bg-slate-50 p-2 text-left">Día</div><div className="bg-slate-50 p-2">Mañana<br /><span className="font-medium normal-case">{empresa.franjas.M.inicio}–{empresa.franjas.M.fin}</span></div><div className="bg-slate-50 p-2">Tarde<br /><span className="font-medium normal-case">{empresa.franjas.T.inicio}–{empresa.franjas.T.fin}</span></div>
          {DIAS_KEY.map((k, i) => (
            <div key={k} className="contents">
              <div className="flex items-center bg-white p-2 text-left text-sm font-semibold normal-case text-slate-800">{DIAS[i]}</div>
              {['M', 'T'].map((f) => {
                const on = yo.disponibilidad[k].includes(f)
                return <div key={f} className="bg-white p-1.5"><button role="switch" aria-checked={on} aria-label={`${DIAS[i]} ${f === 'M' ? 'mañana' : 'tarde'}`} onClick={() => acciones.toggleDisponibilidad(yo.id, k, f)} className={cx('h-11 w-full rounded-xl text-sm font-bold', on ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>{on ? '✓ Disponible' : 'No'}</button></div>
              })}
            </div>
          ))}
        </div>
      </Card>
      <div className="text-center text-sm text-slate-600"><b>{total}</b> franjas disponibles por semana</div>
      <Card className="space-y-2 p-4 text-sm"><div className="label">Mi perfil</div><div><b>Tipo:</b> {TIPO_SUPLENTE[yo.tipo]}</div><div><b>Base:</b> {yo.base.ciudad}, {yo.base.departamento}</div><div><b>Zonas que cubro:</b> {yo.zonas.join(', ')}</div><div className="flex flex-wrap gap-1"><b>Habilitaciones:</b> {yo.habilitaciones.map((h) => <Badge key={h} tono="info">{h}</Badge>)}</div></Card>
    </div>
  )
}

function misFilas(app, yo) { return (app.idx.porSuplente.get(yo.id) || []).filter((r) => r.estado !== 'cancelado').sort((a, b) => a.fecha.localeCompare(b.fecha)) }

function Coberturas() {
  const app = useYo()
  const { yo, maps, empresa, config } = app
  const filas = misFilas(app, yo)
  const pago = (r) => 8 * config.tarifaSuplenteHora[yo.tipo]
  const prox = filas.filter((r) => r.fecha >= HOY)
  const pasadas = filas.filter((r) => r.fecha < HOY).reverse()
  const Fila = ({ r }) => <Card as="li" className="flex items-center gap-3 p-3"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><span className="text-[10px] font-bold uppercase">{fmtDia(r.fecha).split(' ')[0]}</span><span className="text-lg font-bold leading-none">{r.fecha.slice(8)}</span></div><div className="min-w-0 flex-1 text-sm"><div className="truncate font-bold">{maps.tienda[r.tiendaId].nombre}</div><div className="text-slate-600">{empresa.franjas[r.franja].inicio} a {empresa.franjas[r.franja].fin}</div></div><div className="text-right text-sm font-bold text-emerald-700">{pesos(pago(r))}</div></Card>
  return (
    <div className="space-y-4 p-4">
      <section><Titulo>Próximas</Titulo>{prox.length ? <ul className="space-y-2">{prox.map((r) => <Fila key={r.id} r={r} />)}</ul> : <Vacio icono="🗓️">No tenés coberturas confirmadas. Revisá tus ofertas.</Vacio>}</section>
      <section><Titulo>Realizadas</Titulo>{pasadas.length ? <ul className="space-y-2">{pasadas.slice(0, 12).map((r) => <Fila key={r.id} r={r} />)}</ul> : <Vacio>Sin historial reciente.</Vacio>}</section>
    </div>
  )
}

function Horas() {
  const app = useYo()
  const { yo, config } = app
  const filas = misFilas(app, yo).filter((r) => r.fecha <= addDays(HOY, 6))
  const sem0 = startOfWeek(addDays(HOY, -21))
  const semanas = Array.from({ length: 4 }, (_, i) => { const d = addDays(sem0, i * 7); const hs = filas.filter((r) => r.fecha >= d && r.fecha < addDays(d, 7) && r.fecha < HOY).length * 8; return { etiqueta: fmtCorto(d), valor: hs, actual: i === 3 } })
  const hechas = filas.filter((r) => r.fecha < HOY)
  const tarifa = config.tarifaSuplenteHora[yo.tipo]
  const aceptadas = app.coberturas.filter((c) => c.suplenteId === yo.id && c.estado === 'aceptada')
  const tmed = aceptadas.length ? Math.round(aceptadas.reduce((s, c) => s + (c.tiempoRespuestaMin || 0), 0) / aceptadas.length) : 0
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="label">Horas (últ. 4 sem.)</div><div className="text-3xl font-bold">{hechas.length * 8} h</div></Card>
        <Card className="p-4"><div className="label">Ganado estimado</div><div className="text-3xl font-bold text-emerald-700">{pesos(hechas.length * 8 * tarifa)}</div></Card>
        <Card className="p-4"><div className="label">Tarifa por hora</div><div className="text-2xl font-bold">{pesos(tarifa)}</div></Card>
        <Card className="p-4"><div className="label">Respondés en</div><div className="text-2xl font-bold">{tmed || '—'} min</div></Card>
      </div>
      <Card className="p-4"><div className="mb-2 font-bold">Horas por semana</div><BarrasV datos={semanas} formato={(v) => `${v}h`} /></Card>
      <Card className="p-4 text-sm"><div className="label">Historial</div><div><b>{yo.coberturasRealizadas}</b> coberturas realizadas desde {fmt(yo.desde)}</div><div className="mt-1">Calificación promedio: <b>⭐ {yo.calificacion.toFixed(1)}</b></div></Card>
    </div>
  )
}
