// Genera src/lib/uyMap.js (paths SVG simplificados) desde un GeoJSON de GADM (nivel 1) de Uruguay.
// Uso: node scripts/build-map.mjs ruta/gadm41_URY_1.json
import fs from 'node:fs'
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const NAMES = { CerroLargo: 'Cerro Largo', RíoNegro: 'Río Negro', SanJosé: 'San José', TreintayTres: 'Treinta y Tres' }
const K = Math.cos((33 * Math.PI) / 180)
const proj = ([lon, lat]) => [lon * K, -lat]
function dp(pts, eps) {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let idx = 0, dmax = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1e-9)
    if (d > dmax) { dmax = d; idx = i }
  }
  if (dmax > eps) return [...dp(pts.slice(0, idx + 1), eps).slice(0, -1), ...dp(pts.slice(idx), eps)]
  return [a, b]
}
const simp = (r, eps) => { const m = r.length >> 1; return [...dp(r.slice(0, m + 1), eps).slice(0, -1), ...dp(r.slice(m), eps)] }
const feats = src.features.map((f) => {
  const name = NAMES[f.properties.NAME_1] || f.properties.NAME_1
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const eps = name === 'Montevideo' ? 0.004 : 0.012
  const rings = polys.map((p) => simp(p[0].map(proj), eps)).filter((r) => r.length > 3)
  return { name, rings }
})
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
feats.forEach((f) => f.rings.forEach((r) => r.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y) })))
const S = 100, W = Math.round((maxX - minX) * S), H = Math.round((maxY - minY) * S)
const t = ([x, y]) => [((x - minX) * S).toFixed(1), ((y - minY) * S).toFixed(1)]
const out = { viewBox: `0 0 ${W} ${H}`, deptos: {} }
for (const f of feats) {
  let area = 0, cx = 0, cy = 0
  const d = f.rings.map((r) => 'M' + r.map((p) => t(p).join(',')).join('L') + 'Z').join('')
  // centroide del anillo más grande
  const ring = f.rings.slice().sort((a, b) => b.length - a.length)[0].map((p) => t(p).map(Number))
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1]
    const c = x0 * y1 - x1 * y0
    area += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
  }
  area /= 2
  out.deptos[f.name] = { d, c: [Math.round(cx / (6 * area)), Math.round(cy / (6 * area))] }
}
fs.writeFileSync('src/lib/uyMap.js', '// Generado por scripts/build-map.mjs (fuente: GADM 4.1, simplificado)\nexport const UY_MAP = ' + JSON.stringify(out) + '\n')
console.log('ok', W, H, Object.keys(out.deptos).length)
