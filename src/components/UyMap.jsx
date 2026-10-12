import { UY_MAP } from '../lib/uyMap.js'
import { SEMAFORO } from '../lib/labels.js'

const FILL = { verde: '#6ee7b7', amarillo: '#fcd34d', rojo: '#fca5a5', sin: '#e2e8f0' }
const STROKE = { verde: '#047857', amarillo: '#b45309', rojo: '#b91c1c', sin: '#94a3b8' }
const SIMBOLO = { verde: '✓', amarillo: '!', rojo: '✕', sin: '' }
const CORTO = { 'Treinta y Tres': 'T. y Tres', 'Río Negro': 'R. Negro', 'Cerro Largo': 'C. Largo', 'San José': 'S. José' }

// Mapa de Uruguay por departamento, coloreado por semáforo. Accesible por teclado.
export default function UyMap({ niveles, conteos = {}, seleccionado, onSelect }) {
  const [, , w, h] = UY_MAP.viewBox.split(' ').map(Number)
  return (
    <svg viewBox={`0 0 ${w} ${h + 34}`} className="mx-auto h-auto w-full max-w-[520px]" role="group" aria-label="Mapa de Uruguay por departamento">
      {Object.entries(UY_MAP.deptos).map(([nombre, d]) => {
        const n = niveles[nombre] || 'sin'
        const sel = seleccionado === nombre
        return (
          <g key={nombre} role="button" tabIndex={0} aria-pressed={sel} aria-label={`${nombre}: ${n === 'sin' ? 'sin tiendas' : SEMAFORO[n][0]}`} onClick={() => onSelect?.(nombre)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect?.(nombre))} className="cursor-pointer outline-none focus-visible:[&>path]:stroke-[4]">
            <path d={d.d} fill={FILL[n]} stroke={sel ? '#1e1b4b' : STROKE[n]} strokeWidth={sel ? 2.6 : 1.2} strokeLinejoin="round" className="transition hover:brightness-95" />
            {nombre === 'Montevideo' ? (
              <>
                <line x1={d.c[0]} y1={d.c[1]} x2={d.c[0] - 34} y2={d.c[1] + 30} stroke="#475569" strokeWidth="1" pointerEvents="none" />
                <text x={d.c[0] - 34} y={d.c[1] + 40} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" pointerEvents="none">Montevideo {SIMBOLO[n]} {conteos[nombre] ?? ''}</text>
              </>
            ) : (
              <>
                <text x={d.c[0]} y={d.c[1] - 2} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" pointerEvents="none">{CORTO[nombre] || nombre}</text>
                <text x={d.c[0]} y={d.c[1] + 11} textAnchor="middle" fontSize="10" fontWeight="800" fill={STROKE[n]} pointerEvents="none">{SIMBOLO[n]} {conteos[nombre] ?? ''}</text>
              </>
            )}
          </g>
        )
      })}
      <title>Mapa de Uruguay ({w}×{h})</title>
    </svg>
  )
}
