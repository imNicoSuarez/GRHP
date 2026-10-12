import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Icon, Toast, cx, Avatar } from './ui.jsx'
import { useApp } from '../lib/store.jsx'

// Marco de teléfono para Empleado y Suplente. En pantallas chicas ocupa todo el ancho.
export function PhoneFrame({ children, tabs, titulo, atras, derecha, centro }) {
  const { toast } = useApp()
  const nav = useNavigate()
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-start justify-center px-0 py-0 sm:items-center sm:px-3 sm:py-4">
      <div className="h-[calc(100vh-56px)] w-full max-w-[400px] bg-slate-900 p-0 shadow-2xl sm:h-[800px] sm:max-h-[calc(100vh-72px)] sm:rounded-[46px] sm:p-2.5">
        <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 sm:rounded-[36px]" style={{ transform: 'translateZ(0)' }}>
          <div className="hidden items-center justify-between bg-white px-6 pb-1 pt-2.5 text-[11px] font-semibold text-slate-800 sm:flex" aria-hidden="true">
            <span>07:50</span><span className="h-4 w-20 rounded-full bg-slate-900" /><span>5G ▮▮▮</span>
          </div>
          <header className="flex items-center gap-2 bg-white px-4 pb-3 pt-3 shadow-sm">
            {atras ? <button onClick={() => nav(atras === true ? -1 : atras)} aria-label="Volver" className="-ml-2 rounded-full p-2 text-slate-700 hover:bg-slate-100"><Icon n="left" /></button> : null}
            <h1 className="flex-1 truncate text-lg font-bold">{titulo}</h1>
            {derecha}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">{children}</div>
          <nav aria-label="Navegación principal" className="relative grid border-t border-slate-200 bg-white pb-2 pt-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
            {tabs.map((t) =>
              t.principal ? (
                <NavLink key={t.to} to={t.to} className="-mt-6 flex flex-col items-center gap-0.5 text-[11px] font-bold text-brand-700">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white"><Icon n={t.icono} size={26} /></span>
                  {t.label}
                </NavLink>
              ) : (
                <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-slate-500')}>
                  <Icon n={t.icono} />
                  {t.label}
                  {t.n > 0 && <span className="absolute right-[22%] top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{t.n}</span>}
                </NavLink>
              ),
            )}
          </nav>
          {centro}
          <Toast toast={toast} />
        </div>
      </div>
    </div>
  )
}

// Layout web (Coordinadora / Supervisor): barra lateral en escritorio, barra inferior deslizable en celular.
export function WebLayout({ items, titulo, subtitulo, children }) {
  const { toast } = useApp()
  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1500px] flex-col md:flex-row">
      <aside className="shrink-0 border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="hidden p-4 md:block">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{subtitulo}</div>
          <div className="text-base font-bold">{titulo}</div>
        </div>
        <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:px-3">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => cx('flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon n={i.icono} size={18} />
              <span className="flex-1">{i.label}</span>
              {i.n > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{i.n}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      <Toast toast={toast} />
    </div>
  )
}

export function TopBar() {
  const { usuarios, usuario, setUsuarioId, reiniciar } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const grupos = [['empleado', 'Empleado (celular)'], ['suplente', 'Suplente (celular)'], ['coordinadora', 'Coordinadora (web)'], ['supervisor', 'Supervisor general (web)']]
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-slate-900 px-3 text-white sm:px-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-black">P</span>
        <div className="hidden leading-tight sm:block"><div className="text-sm font-bold">Pagnific · RRHH y tiendas</div><div className="text-[11px] text-slate-400">Prototipo navegable · datos mock</div></div>
      </div>
      <span className="ml-auto hidden rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 md:inline">Hoy: lunes 12/10/2026</span>
      <label className="flex items-center gap-2 text-sm">
        <span className="hidden font-semibold text-slate-300 sm:inline">Ver como…</span>
        <select aria-label="Ver como" value={usuario.id} onChange={(e) => { setUsuarioId(e.target.value); nav('/', { replace: true }) }} className="max-w-[210px] rounded-lg border-0 bg-slate-800 py-1.5 pl-2 pr-7 text-sm font-semibold text-white ring-1 ring-slate-600 focus:ring-2 focus:ring-brand-500">
          {grupos.map(([rol, et]) => (
            <optgroup key={rol} label={et}>
              {usuarios.filter((u) => u.rol === rol).map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.detalle}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <button onClick={() => { if (confirm('¿Reiniciar todos los datos de la demo?')) { reiniciar(); nav('/', { replace: true }) } }} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-600 hover:bg-slate-700" title="Reiniciar datos demo">
        <Icon n="refresh" size={14} /><span className="hidden sm:inline">Reiniciar datos demo</span>
      </button>
      <span className="hidden" aria-hidden="true">{loc.pathname}</span>
    </header>
  )
}
export { Avatar }
