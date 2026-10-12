import { useEffect, useRef } from 'react'
import { TONOS, ICONO_TONO, SEMAFORO, iniciales } from '../lib/labels.js'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function Badge({ tono = 'neutral', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', TONOS[tono], className)}>
      <span aria-hidden="true" className="font-bold">{ICONO_TONO[tono]}</span>
      {children}
    </span>
  )
}
export const Estado = ({ mapa, valor }) => (mapa[valor] ? <Badge tono={mapa[valor][1]}>{mapa[valor][0]}</Badge> : <Badge>{valor}</Badge>)

export function Semaforo({ nivel, conTexto = true, size = 12 }) {
  const [txt, tono, color] = SEMAFORO[nivel]
  return (
    <span className="inline-flex items-center gap-1.5" title={txt}>
      <span aria-hidden="true" style={{ width: size, height: size, background: color }} className="inline-block rounded-full ring-2 ring-white" />
      {conTexto ? <Badge tono={tono}>{txt}</Badge> : <span className="sr-only">{txt}</span>}
    </span>
  )
}

export function Avatar({ nombre, color = '#4f46e5', size = 40 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {iniciales(nombre)}
    </span>
  )
}

export const Card = ({ as: Tag = 'div', className, children, ...p }) => <Tag className={cx('card', className)} {...p}>{children}</Tag>

export function Stat({ label, value, sub, tono, className }) {
  const col = { ok: 'text-emerald-700', warn: 'text-amber-700', bad: 'text-red-700' }[tono] || 'text-slate-900'
  return (
    <div className={cx('card p-4', className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx('mt-1 text-2xl font-bold tabular-nums', col)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Titulo({ children, accion, sub }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{children}</h2>
        {sub && <p className="text-sm text-slate-500">{sub}</p>}
      </div>
      {accion}
    </div>
  )
}

export function Vacio({ children, icono = '📭' }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500"><div className="mb-1 text-2xl" aria-hidden="true">{icono}</div>{children}</div>
}

export function Campo({ label, children, ayuda }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  )
}

export function Tabs({ tabs, valor, onChange, className }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1', className)}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={valor === t.id} onClick={() => onChange(t.id)} className={cx('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition', valor === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
          {t.label}
          {t.n > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{t.n}</span>}
        </button>
      ))}
    </div>
  )
}

// Modal accesible (cierra con Esc). En el celular se muestra como "bottom sheet".
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const h = (e) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', h)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', h)
  }, [abierto, onCerrar])
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl outline-none sm:rounded-3xl', ancho)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{titulo}</h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  const col = toast.tono === 'warn' ? 'bg-amber-600' : 'bg-slate-900'
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 sm:bottom-6">
      <div className={cx('rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg', col)}>{toast.msg}</div>
    </div>
  )
}

export function Barra({ valor, max = 100, color = '#4f46e5', alto = 8 }) {
  return (
    <div className="w-full rounded-full bg-slate-200" style={{ height: alto }} role="img" aria-label={`${Math.round((valor / max) * 100)}%`}>
      <div className="rounded-full" style={{ width: `${Math.min(100, (valor / (max || 1)) * 100)}%`, height: alto, background: color }} />
    </div>
  )
}

// Gráfico de barras vertical simple (SVG)
export function BarrasV({ datos, alto = 140, formato = (v) => v, color = '#4f46e5', marcaMax }) {
  const max = Math.max(...datos.map((d) => d.valor), marcaMax || 0, 0.0001)
  const w = 100 / datos.length
  return (
    <svg viewBox={`0 0 100 ${alto / 2.2 + 18}`} className="w-full" role="img" aria-label="Gráfico de barras">
      {datos.map((d, i) => {
        const h = (d.valor / max) * (alto / 2.2 - 12)
        return (
          <g key={i}>
            <rect x={i * w + w * 0.18} y={alto / 2.2 - h} width={w * 0.64} height={h} rx="1.2" fill={d.color || color} opacity={d.actual ? 1 : 0.75} />
            <text x={i * w + w / 2} y={alto / 2.2 - h - 1.5} textAnchor="middle" fontSize="3.4" fill="#0f172a" fontWeight="700">{formato(d.valor)}</text>
            <text x={i * w + w / 2} y={alto / 2.2 + 6} textAnchor="middle" fontSize="3.2" fill="#475569">{d.etiqueta}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function BarrasH({ datos, formato = (v) => v, max }) {
  const m = max || Math.max(...datos.map((d) => d.valor), 0.0001)
  return (
    <ul className="space-y-2">
      {datos.map((d) => (
        <li key={d.etiqueta} className="text-sm">
          <div className="mb-0.5 flex justify-between gap-2"><span className="truncate font-medium">{d.etiqueta}</span><span className="tabular-nums text-slate-600">{formato(d.valor)}</span></div>
          <Barra valor={d.valor} max={m} color={d.color || '#4f46e5'} />
        </li>
      ))}
    </ul>
  )
}

const ICONOS = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  plus: 'M12 5v14 M5 12h14',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z M8 2v16 M16 6v16',
  chart: 'M18 20V10 M12 20V4 M6 20v-6',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  check: 'M20 6L9 17l-5-5',
  right: 'M9 18l6-6-6-6',
  left: 'M19 12H5 M12 19l-7-7 7-7',
  money: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  swap: 'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  menu: 'M3 12h18 M3 6h18 M3 18h18',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
}
export function Icon({ n, size = 20, className }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)}>
      {ICONOS[n].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
    </svg>
  )
}
