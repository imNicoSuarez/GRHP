import { useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { PhoneFrame } from '../../components/Layouts.jsx'
import { Avatar, Badge, Campo, Card, Estado, Icon, Modal, Titulo, Vacio, Barra, cx } from '../../components/ui.jsx'
import { useApp } from '../../lib/store.jsx'
import { HOY, addDays, diffDays, dow, fmt, fmtDia, fmtDiaLargo, fmtFechaHora, hace, range, startOfWeek, fmtCorto, minDiff, AHORA } from '../../lib/dates.js'
import { ESTADO_AUSENCIA, ESTADO_CAMBIO, ESTADO_LICENCIA, ESTADO_REINTEGRO, TIPOS_AUSENCIA, primerNombre } from '../../lib/labels.js'
import { NO_TRABAJA } from '../../lib/selectors.js'

const useYo = () => {
  const app = useApp()
  const emp = app.maps.emp[app.usuario.empleadoId]
  const misTurnos = useMemo(() => (app.idx.porEmpleado.get(emp.id) || []).filter((t) => t.tipo === 'normal').sort((a, b) => a.fecha.localeCompare(b.fecha) || a.franja.localeCompare(b.franja)), [app.idx, emp.id])
  const miReintegro = app.reintegros.find((r) => r.empleadoId === emp.id)
  const noLeidas = app.notificaciones.filter((n) => n.usuarioId === app.usuario.id && !n.leida).length
  return { ...app, emp, misTurnos, miReintegro, noLeidas, tienda: app.maps.tienda[emp.tiendaId] }
}
const horario = (empresa, f) => `${empresa.franjas[f].inicio} a ${empresa.franjas[f].fin}`

export default function EmpleadoApp() {
  const { noLeidas } = useYo()
  const tabs = [
    { to: '/', label: 'Inicio', icono: 'home' },
    { to: '/turnos', label: 'Turnos', icono: 'calendar' },
    { to: '/avisar', label: 'Avisar', icono: 'plus', principal: true },
    { to: '/licencias', label: 'Licencias', icono: 'file' },
    { to: '/legajo', label: 'Legajo', icono: 'user' },
  ]
  const Bell = ({ n }) => <Link to="/notificaciones" aria-label={`Notificaciones${n ? `, ${n} sin leer` : ''}`} className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100"><Icon n="bell" />{n > 0 && <span className="absolute right-0.5 top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{n}</span>}</Link>
  return (
    <Routes>
      <Route path="/" element={<PhoneFrame tabs={tabs} titulo="Inicio" derecha={<Bell n={noLeidas} />}><Inicio /></PhoneFrame>} />
      <Route path="/avisar" element={<PhoneFrame tabs={tabs} titulo="Avisar ausencia" atras="/"><Avisar /></PhoneFrame>} />
      <Route path="/turnos" element={<PhoneFrame tabs={tabs} titulo="Mis turnos" derecha={<Bell n={noLeidas} />}><Turnos /></PhoneFrame>} />
      <Route path="/licencias" element={<PhoneFrame tabs={tabs} titulo="Licencias" derecha={<Bell n={noLeidas} />}><Licencias /></PhoneFrame>} />
      <Route path="/legajo" element={<PhoneFrame tabs={tabs} titulo="Mi legajo" derecha={<Bell n={noLeidas} />}><Legajo /></PhoneFrame>} />
      <Route path="/reintegro" element={<PhoneFrame tabs={tabs} titulo="Mi reintegro" atras="/legajo"><Reintegro /></PhoneFrame>} />
      <Route path="/notificaciones" element={<PhoneFrame tabs={tabs} titulo="Notificaciones" atras="/"><Notificaciones /></PhoneFrame>} />
      <Route path="*" element={<PhoneFrame tabs={tabs} titulo="Inicio" derecha={<Bell n={noLeidas} />}><Inicio /></PhoneFrame>} />
    </Routes>
  )
}

function TurnoCard({ t, empresa, tienda, grande }) {
  const f = empresa.franjas[t.franja]
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl p-4 ring-1', t.estado === 'ausente' ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-slate-200')}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700"><span className="text-[10px] font-bold uppercase">{fmtDia(t.fecha).split(' ')[0]}</span><span className="text-lg font-bold leading-none">{t.fecha.slice(8)}</span></div>
      <div className="min-w-0 flex-1">
        <div className={cx('font-bold', grande && 'text-lg')}>{f.nombre} · {f.inicio} a {f.fin}</div>
        <div className="truncate text-sm text-slate-600">{tienda.nombre}</div>
      </div>
      {t.estado === 'ausente' && <Badge tono="warn">Ausencia avisada</Badge>}
      {t.estado === 'licencia' && <Badge tono="info">Licencia</Badge>}
    </div>
  )
}

function Inicio() {
  const { emp, misTurnos, empresa, tienda, ausencias, licencias, miReintegro, maps, regiones, acciones } = useYo()
  const nav = useNavigate()
  const hoy = misTurnos.find((t) => t.fecha === HOY)
  const prox = misTurnos.filter((t) => t.fecha > HOY && t.estado === 'programado').slice(0, 3)
  const misAus = ausencias.filter((a) => a.empleadoId === emp.id)
  const pendComp = misAus.filter((a) => a.estado === 'pendiente_comprobante')
  const abiertas = misAus.filter((a) => a.hasta >= HOY && !pendComp.includes(a))
  const licPend = licencias.filter((l) => l.empleadoId === emp.id && l.estado === 'pendiente')
  const coord = maps.emp[regiones.find((r) => r.id === emp.regionId).coordinadoraId]
  const [subir, setSubir] = useState(null)
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Avatar nombre={emp.nombre} color={emp.avatarColor} size={48} />
        <div><div className="text-xl font-bold">Hola, {primerNombre(emp.nombre)} 👋</div><div className="text-sm text-slate-600">{emp.cargo} · {tienda.nombre}</div></div>
      </div>
      <section aria-label="Turno de hoy">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tu turno de hoy · {fmtDiaLargo(HOY)}</div>
        {hoy ? <TurnoCard t={hoy} empresa={empresa} tienda={tienda} grande /> : <Card className="p-4 text-slate-600">Hoy tenés franco. ¡Disfrutalo!</Card>}
        {hoy && hoy.estado !== 'ausente' && hoy.estado !== 'licencia' && (
          <button onClick={() => nav('/avisar')} className="btn-danger mt-3 w-full py-4 text-base"><Icon n="alert" /> Avisar ausencia</button>
        )}
        {hoy?.estado === 'ausente' && (() => { const a = ausencias.find((x) => x.id === hoy.ausenciaId); return a && <Card className="mt-3 p-3 text-sm"><div className="mb-1 flex items-center justify-between"><b>Tu aviso</b><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></div><p className="text-slate-600">{a.estado === 'avisada' ? `${primerNombre(coord.nombre)} lo va a revisar en breve.` : a.comentarioCoordinadora || ''}</p></Card> })()}
      </section>

      {pendComp.map((a) => (
        <Card key={a.id} className="border-l-4 border-amber-500 p-4">
          <div className="flex items-center gap-2 font-bold"><Icon n="alert" className="text-amber-600" /> Falta tu comprobante</div>
          <p className="mt-1 text-sm text-slate-600">{TIPOS_AUSENCIA[a.tipo]} del {fmt(a.desde)}. Tenés 48 h para subirlo.</p>
          <button onClick={() => setSubir(a)} className="btn-primary btn-sm mt-3"><Icon n="upload" size={14} /> Subir comprobante</button>
        </Card>
      ))}
      {abiertas.map((a) => (
        <Card key={a.id} className="p-3 text-sm"><div className="flex items-center justify-between gap-2"><span><b>{TIPOS_AUSENCIA[a.tipo]}</b> · {fmt(a.desde)}{a.hasta !== a.desde && ` al ${fmt(a.hasta)}`}</span><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></div></Card>
      ))}
      {licPend.map((l) => <Link key={l.id} to="/licencias" className="block"><Card className="flex items-center justify-between p-3 text-sm"><span>Licencia {fmt(l.desde)} al {fmt(l.hasta)}</span><Estado mapa={ESTADO_LICENCIA} valor="pendiente" /></Card></Link>)}
      {miReintegro && (
        <Link to="/reintegro" className="block"><Card className="flex items-center justify-between p-3 text-sm"><span className="flex items-center gap-2 font-semibold"><Icon n="heart" size={18} className="text-rose-600" /> Mi reintegro</span><Estado mapa={ESTADO_REINTEGRO} valor={miReintegro.estado} /></Card></Link>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Próximos turnos</h2><Link to="/turnos" className="text-sm font-semibold text-brand-700">Ver todos</Link></div>
        <div className="space-y-2">{prox.length ? prox.map((t) => <TurnoCard key={t.id} t={t} empresa={empresa} tienda={tienda} />) : <Vacio>No tenés turnos próximos cargados.</Vacio>}</div>
      </section>
      <SubirModal aus={subir} onCerrar={() => setSubir(null)} onOk={(archivo) => { acciones.subirComprobante(subir.id, archivo); setSubir(null) }} />
    </div>
  )
}

export function SubirComprobante({ onArchivo, archivo }) {
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-6 text-center text-sm font-semibold text-brand-700 focus-within:ring-2 focus-within:ring-brand-600">
        <Icon n="upload" size={28} />
        {archivo ? <span className="break-all text-slate-800">{archivo}</span> : 'Sacar foto o elegir un archivo'}
        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => e.target.files[0] && onArchivo(e.target.files[0].name)} />
      </label>
      {!archivo && <button type="button" onClick={() => onArchivo('certificado_medico_ejemplo.jpg')} className="w-full text-center text-xs font-semibold text-slate-500 underline">Usar una foto de ejemplo (demo)</button>}
      {archivo && <img src="/img/comprobante-medico.svg" alt="Vista previa del comprobante" className="mx-auto h-40 rounded-xl ring-1 ring-slate-200" />}
    </div>
  )
}
function SubirModal({ aus, onCerrar, onOk }) {
  const [archivo, setArchivo] = useState(null)
  return (
    <Modal abierto={!!aus} onCerrar={onCerrar} titulo="Subir comprobante">
      <SubirComprobante archivo={archivo} onArchivo={setArchivo} />
      <button disabled={!archivo} onClick={() => { onOk(archivo); setArchivo(null) }} className="btn-primary mt-4 w-full">Enviar comprobante</button>
    </Modal>
  )
}

const TIPOS_AVISO = [
  ['enfermedad', 'Estoy enfermo/a', '🤒', true], ['familiar_enfermo', 'Familiar enfermo', '🏠', true], ['tramite_personal', 'Trámite personal', '📄', false], ['estudio', 'Estudio / examen', '📚', true], ['duelo', 'Duelo', '🕊️', true],
]
function Avisar() {
  const { emp, misTurnos, empresa, acciones, maps, regiones, tienda, ausencias } = useYo()
  const nav = useNavigate()
  const [paso, setPaso] = useState(1)
  const [tipo, setTipo] = useState('enfermedad')
  const [cuando, setCuando] = useState('hoy')
  const [hasta, setHasta] = useState(addDays(HOY, 2))
  const [archivo, setArchivo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [resultado, setResultado] = useState(null)
  const desde = cuando === 'manana' ? addDays(HOY, 1) : HOY
  const fin = cuando === 'rango' ? hasta : desde
  const afectados = misTurnos.filter((t) => t.fecha >= desde && t.fecha <= fin && !NO_TRABAJA.includes(t.estado))
  const t0 = afectados[0]
  const minutosAntes = t0 && t0.fecha === HOY ? minDiff(AHORA, `${HOY}T${empresa.franjas[t0.franja].inicio}:00`) : null
  const coord = maps.emp[regiones.find((r) => r.id === emp.regionId).coordinadoraId]
  const requiere = TIPOS_AVISO.find((t) => t[0] === tipo)[3]
  const etiquetaTipo = TIPOS_AVISO.find((t) => t[0] === tipo)[1]
  const enviar = () => {
    const id = acciones.avisarAusencia({ empleadoId: emp.id, tipo, desde, hasta: fin, motivo: motivo || etiquetaTipo, comprobante: archivo ? { archivo, imagen: '/img/comprobante-medico.svg', etiqueta: 'Comprobante' } : null })
    setResultado(id)
  }
  if (resultado) {
    const a = ausencias.find((x) => x.id === resultado)
    return (
      <div className="space-y-4 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon n="check" size={32} /></div>
        <h2 className="text-xl font-bold">¡Aviso enviado!</h2>
        <p className="text-slate-600">Le avisamos a <b>{coord.nombre}</b>, tu coordinadora regional, y a la encargada de {tienda.nombre}.</p>
        {a && <Card className="p-4 text-left text-sm"><div className="mb-2 flex items-center justify-between"><b>{TIPOS_AUSENCIA[a.tipo]}</b><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></div><div className="text-slate-600">{fmt(a.desde)}{a.hasta !== a.desde && ` al ${fmt(a.hasta)}`} · {a.turnoIds.length} turno(s)</div>{a.comprobante ? <div className="mt-2 flex items-center gap-2 text-slate-700"><Icon n="file" size={16} /> {a.comprobante.archivo}</div> : <div className="mt-2 text-amber-800">Todavía falta el comprobante: podés subirlo desde Inicio.</div>}</Card>}
        <p className="text-sm text-slate-500">Vas a recibir una notificación cuando tu coordinadora valide el aviso.</p>
        <button onClick={() => nav('/')} className="btn-primary w-full">Volver al inicio</button>
      </div>
    )
  }
  return (
    <div className="space-y-4 p-4">
      <div aria-label={`Paso ${paso} de 3`}>
        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500"><span>Paso {paso} de 3</span><span>{['¿Qué pasó?', 'Comprobante', 'Confirmar'][paso - 1]}</span></div>
        <Barra valor={paso} max={3} />
      </div>
      {paso === 1 && (
        <>
          <fieldset><legend className="mb-2 text-base font-bold">¿Cuál es el motivo?</legend>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_AVISO.map(([id, et, em]) => (
                <label key={id} className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-3 text-center text-sm font-semibold ring-1', tipo === id ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-800' : 'bg-white ring-slate-200')}>
                  <input type="radio" name="tipo" className="sr-only" checked={tipo === id} onChange={() => setTipo(id)} /><span className="text-2xl" aria-hidden="true">{em}</span>{et}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset><legend className="mb-2 text-base font-bold">¿Cuándo?</legend>
            <div className="grid grid-cols-3 gap-2">
              {[['hoy', 'Hoy'], ['manana', 'Mañana'], ['rango', 'Varios días']].map(([id, et]) => (
                <label key={id} className={cx('cursor-pointer rounded-xl p-3 text-center text-sm font-semibold ring-1', cuando === id ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-800' : 'bg-white ring-slate-200')}>
                  <input type="radio" name="cuando" className="sr-only" checked={cuando === id} onChange={() => setCuando(id)} />{et}
                </label>
              ))}
            </div>
            {cuando === 'rango' && <div className="mt-3"><Campo label="Hasta el día"><input type="date" className="input" min={HOY} max={addDays(HOY, 14)} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo></div>}
          </fieldset>
          <Card className="p-3 text-sm">
            {afectados.length ? <><b>{afectados.length} turno{afectados.length > 1 ? 's' : ''} afectado{afectados.length > 1 ? 's' : ''}:</b><ul className="mt-1 list-inside list-disc text-slate-600">{afectados.slice(0, 5).map((t) => <li key={t.id}>{fmtDia(t.fecha)} · {horario(empresa, t.franja)}</li>)}</ul></> : <span className="text-amber-800">No tenés turnos asignados en esa fecha. Elegí otro día.</span>}
            {minutosAntes !== null && <p className={cx('mt-2 font-semibold', minutosAntes < 60 ? 'text-amber-700' : 'text-emerald-700')}>{minutosAntes >= 60 ? `✓ Avisás con ${Math.floor(minutosAntes / 60)} h ${minutosAntes % 60} min de anticipación (plazo: hasta 1 h antes).` : `! Avisás con solo ${minutosAntes} min de anticipación (el plazo es 1 h antes).`}</p>}
          </Card>
          <Campo label="Comentario para tu coordinadora (opcional)"><textarea className="input" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: fiebre desde anoche" /></Campo>
          <button disabled={!afectados.length} onClick={() => setPaso(2)} className="btn-primary w-full">Siguiente</button>
        </>
      )}
      {paso === 2 && (
        <>
          <h2 className="text-base font-bold">{requiere ? 'Subí tu comprobante' : 'Comprobante (opcional)'}</h2>
          <p className="text-sm text-slate-600">{requiere ? 'Certificado médico, constancia o similar. Tu coordinadora lo valida.' : 'Para trámites, el comprobante es opcional.'}</p>
          <SubirComprobante archivo={archivo} onArchivo={setArchivo} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaso(1)} className="btn-secondary">Atrás</button>
            <button onClick={() => setPaso(3)} className="btn-primary">{archivo ? 'Siguiente' : 'Lo subo después'}</button>
          </div>
          {!archivo && requiere && <p className="text-center text-xs text-slate-500">Tenés 48 h para subirlo. La ausencia queda “Falta comprobante”.</p>}
        </>
      )}
      {paso === 3 && (
        <>
          <h2 className="text-base font-bold">Revisá y confirmá</h2>
          <Card className="divide-y divide-slate-100 text-sm">
            {[['Motivo', etiquetaTipo], ['Fecha', `${fmt(desde)}${fin !== desde ? ` al ${fmt(fin)}` : ''}`], ['Turnos', `${afectados.length}`], ['Comprobante', archivo || 'Pendiente'], ['Se avisa a', coord.nombre]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 p-3"><span className="text-slate-500">{k}</span><span className="text-right font-semibold">{v}</span></div>
            ))}
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaso(2)} className="btn-secondary">Atrás</button>
            <button onClick={enviar} className="btn-danger">Enviar aviso</button>
          </div>
        </>
      )}
    </div>
  )
}

function Turnos() {
  const { emp, misTurnos, empresa, tienda, cambios, empleados, acciones, idx, maps } = useYo()
  const [semana, setSemana] = useState(startOfWeek(HOY))
  const [cambiando, setCambiando] = useState(null)
  const dias = range(semana, addDays(semana, 6))
  const porFecha = (f) => misTurnos.filter((t) => t.fecha === f)
  const misCambios = cambios.filter((c) => c.solicitanteId === emp.id)
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-2 ring-1 ring-slate-200">
        <button aria-label="Semana anterior" onClick={() => setSemana(addDays(semana, -7))} className="rounded-xl p-2 hover:bg-slate-100"><Icon n="left" /></button>
        <div className="text-center text-sm"><div className="font-bold">{fmtCorto(semana)} al {fmtCorto(addDays(semana, 6))}</div><div className="text-xs text-slate-500">{semana === startOfWeek(HOY) ? 'Esta semana' : semana < HOY ? 'Semana pasada' : 'Semana próxima'}</div></div>
        <button aria-label="Semana siguiente" onClick={() => setSemana(addDays(semana, 7))} className="rounded-xl p-2 hover:bg-slate-100"><Icon n="right" /></button>
      </div>
      <ul className="space-y-2">
        {dias.map((f) => {
          const ts = porFecha(f)
          return (
            <li key={f} className={cx('rounded-2xl bg-white p-3 ring-1', f === HOY ? 'ring-2 ring-brand-600' : 'ring-slate-200')}>
              <div className="flex items-center justify-between"><span className="text-sm font-bold">{fmtDia(f)}{f === HOY && <span className="ml-2 text-xs text-brand-700">HOY</span>}</span>
                {ts.length === 0 && <span className="text-sm text-slate-500">Franco</span>}</div>
              {ts.map((t) => (
                <div key={t.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <div><b>{empresa.franjas[t.franja].nombre}</b> · {horario(empresa, t.franja)}<div className="text-xs text-slate-500">{tienda.nombre}</div></div>
                  <div className="flex items-center gap-2">
                    {t.estado === 'ausente' && <Badge tono="warn">Ausencia</Badge>}
                    {t.estado === 'licencia' && <Badge tono="info">Licencia</Badge>}
                    {t.fecha > HOY && t.estado === 'programado' && <button onClick={() => setCambiando(t)} className="btn-secondary btn-sm"><Icon n="swap" size={14} /> Cambio</button>}
                  </div>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
      <section>
        <Titulo>Mis pedidos de cambio</Titulo>
        {misCambios.length === 0 ? <Vacio>No pediste cambios todavía.</Vacio> : (
          <ul className="space-y-2">
            {misCambios.map((c) => { const a = idx.porId.get(c.turnoId), b = idx.porId.get(c.turnoDestinoId); return (
              <Card as="li" key={c.id} className="p-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{a && fmtDia(a.fecha)} {a && empresa.franjas[a.franja].nombre} ⇄ {maps.emp[c.companeroId].nombre.split(' ')[0]} {b && fmtDia(b.fecha)}</b><Estado mapa={ESTADO_CAMBIO} valor={c.estado} /></div><div className="mt-1 text-slate-600">{c.motivo}</div>{c.motivoRechazo && <div className="mt-1 rounded-lg bg-red-50 p-2 text-red-800">{c.motivoRechazo}</div>}</Card>) })}
          </ul>
        )}
      </section>
      <CambioModal turno={cambiando} onCerrar={() => setCambiando(null)} yo={emp} empleados={empleados} idx={idx} empresa={empresa} onOk={(d) => { acciones.crearCambio({ solicitanteId: emp.id, turnoId: cambiando.id, ...d }); setCambiando(null) }} />
    </div>
  )
}
function CambioModal({ turno, onCerrar, yo, empleados, idx, empresa, onOk }) {
  const [destino, setDestino] = useState('')
  const [motivo, setMotivo] = useState('')
  const opciones = useMemo(() => {
    if (!turno) return []
    return empleados.filter((e) => e.tiendaId === yo.tiendaId && e.id !== yo.id).flatMap((e) => (idx.porEmpleado.get(e.id) || []).filter((t) => t.tipo === 'normal' && t.estado === 'programado' && t.fecha > HOY && t.fecha <= addDays(HOY, 14)).map((t) => ({ t, e })))
  }, [turno, empleados, idx, yo])
  const sel = opciones.find((o) => o.t.id === destino)
  return (
    <Modal abierto={!!turno} onCerrar={onCerrar} titulo="Pedir cambio de turno">
      {turno && <>
        <p className="mb-3 text-sm text-slate-600">Cambiás tu turno del <b>{fmtDia(turno.fecha)} ({empresa.franjas[turno.franja].nombre})</b> por el de un compañero. Lo aprueba tu coordinadora.</p>
        <div className="space-y-3">
          <Campo label="Turno del compañero/a"><select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}><option value="">Elegí…</option>{opciones.map(({ t, e }) => <option key={t.id} value={t.id}>{e.nombre} — {fmtDia(t.fecha)} {empresa.franjas[t.franja].nombre}</option>)}</select></Campo>
          <Campo label="Motivo"><input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: cita médica" /></Campo>
          <button disabled={!sel || !motivo} onClick={() => onOk({ companeroId: sel.e.id, turnoDestinoId: sel.t.id, motivo })} className="btn-primary w-full">Enviar pedido</button>
        </div></>}
    </Modal>
  )
}

function Licencias() {
  const { emp, licencias, config, acciones } = useYo()
  const [abrir, setAbrir] = useState(false)
  const mias = licencias.filter((l) => l.empleadoId === emp.id).sort((a, b) => b.solicitadaEn.localeCompare(a.solicitadaEn))
  const [f, setF] = useState({ tipo: 'anual', desde: addDays(HOY, 30), hasta: addDays(HOY, 34), comentario: '' })
  const tl = config.tiposLicencia.find((t) => t.id === f.tipo)
  const dias = f.hasta >= f.desde ? range(f.desde, f.hasta).length : 0
  const aviso = diffDays(HOY, f.desde)
  const sobra = f.tipo === 'anual' && dias > emp.saldoLicenciaDias
  return (
    <div className="space-y-4 p-4">
      <Card className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white ring-0">
        <div><div className="text-xs font-semibold uppercase tracking-wide text-brand-100">Saldo de licencia anual</div><div className="text-4xl font-bold">{emp.saldoLicenciaDias}<span className="ml-1 text-base font-semibold text-brand-100">días</span></div></div>
        <button onClick={() => setAbrir(true)} className="btn bg-white text-brand-800"><Icon n="plus" size={16} /> Solicitar</button>
      </Card>
      <Titulo>Mis solicitudes</Titulo>
      {mias.length === 0 && <Vacio>Todavía no pediste licencias.</Vacio>}
      <ul className="space-y-2">
        {mias.map((l) => (
          <Card as="li" key={l.id} className="p-4">
            <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{config.tiposLicencia.find((t) => t.id === l.tipo).nombre}</div><div className="text-sm text-slate-600">{fmt(l.desde)} al {fmt(l.hasta)} · {l.dias} día(s)</div></div><Estado mapa={ESTADO_LICENCIA} valor={l.estado} /></div>
            {l.comentario && <p className="mt-1 text-sm text-slate-500">“{l.comentario}”</p>}
            {l.estado === 'rechazada' && <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-900"><b>Motivo del rechazo:</b> {l.motivoRechazo}</div>}
            {l.estado === 'pendiente' && <p className="mt-2 text-xs text-slate-500">Enviada {hace(l.solicitadaEn)}. Aprueba: {config.tiposLicencia.find((t) => t.id === l.tipo).aprobador === 'supervisor' ? 'Supervisión general' : 'tu coordinadora'}.</p>}
          </Card>
        ))}
      </ul>
      <Modal abierto={abrir} onCerrar={() => setAbrir(false)} titulo="Solicitar licencia">
        <div className="space-y-3">
          <Campo label="Tipo de licencia"><select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{config.tiposLicencia.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Desde"><input type="date" className="input" value={f.desde} min={HOY} onChange={(e) => setF({ ...f, desde: e.target.value, hasta: e.target.value > f.hasta ? e.target.value : f.hasta })} /></Campo>
            <Campo label="Hasta"><input type="date" className="input" value={f.hasta} min={f.desde} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></Campo>
          </div>
          <Campo label="Comentario (opcional)"><input className="input" value={f.comentario} onChange={(e) => setF({ ...f, comentario: e.target.value })} /></Campo>
          <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
            <div><b>{dias}</b> día(s) solicitados{f.tipo === 'anual' && <> · saldo restante {Math.max(0, emp.saldoLicenciaDias - dias)}</>}</div>
            {sobra && <div className="font-semibold text-red-700">✕ Superás tu saldo disponible.</div>}
            {aviso < tl.avisoDias && <div className="font-semibold text-amber-800">! Se piden {tl.avisoDias} días de aviso; podés enviarla igual pero puede ser rechazada.</div>}
            {tl.comprobante && <div className="text-slate-600">Requiere comprobante (lo adjuntás después).</div>}
            <div className="text-slate-600">Aprueba: {tl.aprobador === 'supervisor' ? 'Supervisión general' : 'tu coordinadora regional'}.</div>
          </div>
          <button disabled={!dias || sobra} onClick={() => { acciones.solicitarLicencia({ empleadoId: emp.id, ...f }); setAbrir(false) }} className="btn-primary w-full">Enviar solicitud</button>
        </div>
      </Modal>
    </div>
  )
}

function Legajo() {
  const { emp, tienda, ausencias, miReintegro, acciones, maps, regiones, horasExtras } = useYo()
  const mias = ausencias.filter((a) => a.empleadoId === emp.id).sort((a, b) => b.desde.localeCompare(a.desde))
  const [subir, setSubir] = useState(null)
  const [ver, setVer] = useState(null)
  const coord = maps.emp[regiones.find((r) => r.id === emp.regionId).coordinadoraId]
  const he = horasExtras.filter((h) => h.empleadoId === emp.id && h.estado !== 'rechazada').reduce((s, h) => s + h.horas, 0)
  const Fila = ({ k, v }) => <div className="flex justify-between gap-3 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-semibold">{v}</span></div>
  return (
    <div className="space-y-4 p-4">
      <Card className="flex items-center gap-4 p-4"><Avatar nombre={emp.nombre} color={emp.avatarColor} size={60} /><div><div className="text-lg font-bold">{emp.nombre}</div><div className="text-sm text-slate-600">{emp.cargo}</div><div className="text-sm text-slate-600">{tienda.nombre}, {tienda.departamento}</div></div></Card>
      {miReintegro && <Link to="/reintegro" className="block"><Card className="flex items-center justify-between p-4"><span className="flex items-center gap-2 font-semibold"><Icon n="heart" className="text-rose-600" /> Mi reintegro</span><Estado mapa={ESTADO_REINTEGRO} valor={miReintegro.estado} /></Card></Link>}
      <Card className="divide-y divide-slate-100 px-4"><Fila k="Cédula" v={emp.cedula} /><Fila k="Teléfono" v={emp.telefono} /><Fila k="Email" v={emp.email} /><Fila k="Domicilio" v={emp.domicilio} /><Fila k="Nacimiento" v={fmt(emp.fechaNacimiento)} /><Fila k="Contacto de emergencia" v={`${emp.contactoEmergencia.nombre} (${emp.contactoEmergencia.parentesco})`} /></Card>
      <Card className="divide-y divide-slate-100 px-4"><Fila k="Contrato" v={emp.contrato} /><Fila k="Ingreso" v={fmt(emp.ingreso)} /><Fila k="Horas semanales" v={`${emp.horasSemanales} h`} /><Fila k="Saldo de licencia" v={`${emp.saldoLicenciaDias} días`} /><Fila k="Horas extras (5 sem.)" v={`${he} h`} /><Fila k="Coordinadora" v={coord.nombre} /></Card>
      <section><Titulo>Documentos</Titulo><Card className="divide-y divide-slate-100 px-4">{emp.documentos.map((d) => <div key={d.nombre} className="flex items-center justify-between py-2.5 text-sm"><span>{d.nombre}{d.vence && <span className="text-slate-500"> · vence {fmt(d.vence)}</span>}</span><Badge tono={d.estado === 'vigente' ? 'ok' : 'warn'}>{d.estado === 'vigente' ? 'Vigente' : 'Por vencer'}</Badge></div>)}</Card></section>
      <section><Titulo>Mis ausencias</Titulo>
        {mias.length === 0 ? <Vacio>Sin ausencias registradas.</Vacio> : <ul className="space-y-2">{mias.map((a) => (
          <Card as="li" key={a.id} className="p-3 text-sm"><div className="flex items-center justify-between gap-2"><div><b>{TIPOS_AUSENCIA[a.tipo]}</b> · {fmt(a.desde)}{a.hasta !== a.desde && ` al ${fmt(a.hasta)}`}</div><Estado mapa={ESTADO_AUSENCIA} valor={a.estado} /></div>
            {a.comentarioCoordinadora && <p className="mt-1 text-slate-600">{a.comentarioCoordinadora}</p>}
            <div className="mt-2 flex gap-2">{a.comprobante && <button onClick={() => setVer(a)} className="btn-secondary btn-sm"><Icon n="file" size={14} /> {a.comprobante.archivo.slice(0, 22)}…</button>}{a.estado === 'pendiente_comprobante' && <button onClick={() => setSubir(a)} className="btn-primary btn-sm">Subir comprobante</button>}</div>
          </Card>))}</ul>}
      </section>
      <SubirModal aus={subir} onCerrar={() => setSubir(null)} onOk={(archivo) => { acciones.subirComprobante(subir.id, archivo); setSubir(null) }} />
      <Modal abierto={!!ver} onCerrar={() => setVer(null)} titulo="Comprobante">{ver && <><img src={ver.comprobante.imagen} alt={`Comprobante ${ver.comprobante.archivo}`} className="mx-auto max-h-80 rounded-xl ring-1 ring-slate-200" /><p className="mt-2 text-center text-sm text-slate-500">{ver.comprobante.archivo}</p></>}</Modal>
    </div>
  )
}

function Reintegro() {
  const { miReintegro: r, acciones, maps } = useYo()
  const [archivo, setArchivo] = useState(null)
  const [hasta, setHasta] = useState(addDays(HOY, 14))
  const [abrir, setAbrir] = useState(false)
  if (!r) return <div className="p-4"><Vacio icono="🌿">No tenés un caso de reintegro abierto.</Vacio></div>
  const dias = r.certificado ? diffDays(HOY, r.certificado.vigenteHasta) : null
  return (
    <div className="space-y-4 p-4">
      <Card className="p-4"><div className="flex items-start justify-between gap-2"><div><div className="font-bold">{r.motivo}</div><div className="text-sm text-slate-600">Desde {fmt(r.desde)}</div></div><Estado mapa={ESTADO_REINTEGRO} valor={r.estado} /></div></Card>
      {r.certificado && (r.estado === 'certificado_por_vencer' || r.estado === 'en_licencia') && (
        <Card className={cx('p-4', r.estado === 'certificado_por_vencer' && 'border-l-4 border-red-500')}>
          <div className="font-bold">Certificado médico</div>
          <p className="text-sm text-slate-600">{r.certificado.archivo}</p>
          <p className={cx('mt-1 text-sm font-semibold', dias <= 3 ? 'text-red-700' : 'text-slate-700')}>Vence el {fmt(r.certificado.vigenteHasta)} {dias >= 0 && `(en ${dias} día${dias !== 1 ? 's' : ''})`}</p>
          <button onClick={() => setAbrir(true)} className="btn-primary btn-sm mt-3"><Icon n="upload" size={14} /> Subir certificado actualizado</button>
        </Card>
      )}
      {r.altaPrevista && <Card className="p-4 text-sm"><b>Alta prevista:</b> {fmt(r.altaPrevista)}</Card>}
      {r.ajusteTareas && <Card className="border-l-4 border-emerald-500 p-4 text-sm"><div className="font-bold">Ajuste de tareas vigente</div><p className="mt-1 text-slate-700">{r.ajusteTareas}</p></Card>}
      <section><Titulo>Pendientes del seguimiento</Titulo><ul className="space-y-2">{r.tareasPendientes.map((t) => <li key={t.id} className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200"><span className={cx('mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs', t.hecho ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500')}>{t.hecho ? '✓' : ''}</span><div><div className={t.hecho ? 'text-slate-500 line-through' : ''}>{t.texto}</div><div className="text-xs text-slate-500">Vence {fmt(t.vence)}</div></div></li>)}</ul></section>
      <Modal abierto={abrir} onCerrar={() => setAbrir(false)} titulo="Nuevo certificado">
        <SubirComprobante archivo={archivo} onArchivo={setArchivo} />
        <div className="mt-3"><Campo label="Vigente hasta"><input type="date" className="input" min={HOY} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo></div>
        <button disabled={!archivo} onClick={() => { acciones.certificadoNuevo(r.id, archivo, hasta); setAbrir(false); setArchivo(null) }} className="btn-primary mt-4 w-full">Enviar</button>
      </Modal>
    </div>
  )
}

function Notificaciones() {
  const { usuario, notificaciones, acciones } = useApp()
  const nav = useNavigate()
  const mias = notificaciones.filter((n) => n.usuarioId === usuario.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  return (
    <div className="space-y-2 p-4">
      {mias.some((n) => !n.leida) && <button onClick={() => acciones.leerNotificaciones(usuario.id)} className="btn-ghost btn-sm">Marcar todas como leídas</button>}
      {mias.length === 0 && <Vacio>No tenés notificaciones.</Vacio>}
      {mias.map((n) => (
        <button key={n.id} onClick={() => n.ruta && nav(n.ruta)} className={cx('block w-full rounded-2xl p-3 text-left ring-1', n.leida ? 'bg-white ring-slate-200' : 'bg-brand-50 ring-brand-200')}>
          <div className="flex items-center justify-between gap-2"><b className="text-sm">{!n.leida && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand-600" aria-label="sin leer" />}{n.titulo}</b><span className="text-xs text-slate-500">{hace(n.fecha)}</span></div>
          <p className="mt-0.5 text-sm text-slate-600">{n.texto}</p>
        </button>
      ))}
    </div>
  )
}
export { Notificaciones }
