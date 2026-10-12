// Generador determinístico de los datos mock de Pagnifique → public/data/*.json
// Uso: npm run datos     (los JSON ya vienen generados en el repo)
import fs from 'node:fs'
import { HOY, addDays, dow, range, startOfWeek, addMin, minDiff, diffDays, DIAS_KEY } from '../src/lib/dates.js'
import { kmRuta } from '../src/lib/geo.js'

// ───────────────────────── PRNG ─────────────────────────
let seed = 20261012
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (a) => a[Math.floor(rnd() * a.length)]
const wpick = (pairs) => { const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot; for (const [v, w] of pairs) { if ((r -= w) < 0) return v } return pairs.at(-1)[0] }
const pad = (n, l = 3) => String(n).padStart(l, '0')
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

const START = addDays(startOfWeek(HOY), -28) // 14/09/2026
const END = addDays(startOfWeek(HOY), 34) // 15/11/2026
const AHORA = HOY + 'T07:50:00'
const dt = (f, h, m = 0) => `${f}T${pad(h, 2)}:${pad(m, 2)}:00`

// ───────────────────────── Empresa / regiones ─────────────────────────
const empresa = {
  nombre: 'Pagnifique',
  razonSocial: 'Pagnifique S.A.',
  casaMatriz: { ciudad: 'Montevideo', direccion: 'Av. Italia 3456', lat: -34.8856, lon: -56.1315 },
  moneda: '$U',
  hoyDemo: HOY,
  franjas: { M: { nombre: 'Mañana', inicio: '09:00', fin: '17:00', horas: 8 }, T: { nombre: 'Tarde', inicio: '13:00', fin: '21:00', horas: 8 } },
  config: {
    horasSemanalesTope: 44,
    valorHoraExtra: 520,
    recargoHoraExtra: 2.0,
    tarifaSuplenteHora: { propio_part_time: 250, de_otra_tienda: 270, externo: 330 },
    viaticoPorKm: 14,
    umbralViaticoKm: 50,
    plazosAviso: { enfermedad: 'Hasta 1 h antes del turno', tramite_personal: '48 h de anticipación', estudio: '72 h de anticipación', duelo: 'Lo antes posible', comprobanteHoras: 48 },
    tiposLicencia: [
      { id: 'anual', nombre: 'Licencia anual', goce: true, comprobante: false, avisoDias: 30, aprobador: 'coordinadora', diasMax: 20 },
      { id: 'medica', nombre: 'Licencia médica', goce: true, comprobante: true, avisoDias: 0, aprobador: 'coordinadora', diasMax: 180 },
      { id: 'maternidad', nombre: 'Maternidad', goce: true, comprobante: true, avisoDias: 30, aprobador: 'supervisor', diasMax: 98 },
      { id: 'paternidad', nombre: 'Paternidad', goce: true, comprobante: true, avisoDias: 15, aprobador: 'coordinadora', diasMax: 13 },
      { id: 'estudio', nombre: 'Licencia por estudio', goce: true, comprobante: true, avisoDias: 15, aprobador: 'coordinadora', diasMax: 20 },
      { id: 'sin_goce', nombre: 'Licencia sin goce de sueldo', goce: false, comprobante: false, avisoDias: 30, aprobador: 'supervisor', diasMax: 60 },
    ],
    reglasAprobacion: [
      { id: 'r1', regla: 'Licencias de hasta 5 días: aprueba la coordinadora regional', activa: true },
      { id: 'r2', regla: 'Licencias de más de 15 días o sin goce: requieren aprobación de Supervisión', activa: true },
      { id: 'r3', regla: 'No se aprueba si la tienda queda por debajo de la dotación mínima y no hay suplente', activa: true },
      { id: 'r4', regla: 'Horas extras sobre el tope semanal requieren autorización de la coordinadora', activa: true },
    ],
  },
}

const regiones = [
  { id: 'met', nombre: 'Metropolitana', color: '#2563eb', departamentos: ['Montevideo', 'Canelones', 'San José'], coordinadoraId: 'E002' },
  { id: 'este', nombre: 'Este', color: '#0891b2', departamentos: ['Maldonado', 'Rocha', 'Treinta y Tres', 'Cerro Largo', 'Lavalleja'], coordinadoraId: 'E003' },
  { id: 'ls', nombre: 'Litoral Sur', color: '#7c3aed', departamentos: ['Colonia', 'Soriano', 'Río Negro', 'Flores'], coordinadoraId: 'E004' },
  { id: 'ln', nombre: 'Litoral Norte', color: '#c2410c', departamentos: ['Paysandú', 'Salto', 'Artigas'], coordinadoraId: 'E005' },
  { id: 'cn', nombre: 'Centro-Norte', color: '#4d7c0f', departamentos: ['Durazno', 'Florida', 'Tacuarembó', 'Rivera'], coordinadoraId: 'E006' },
]
const regionDeDepto = Object.fromEntries(regiones.flatMap((r) => r.departamentos.map((d) => [d, r.id])))

// ───────────────────────── Tiendas ─────────────────────────
// [id, nombre, depto, ciudad, lat, lon, dotación/turno, personal total, días abierto (7|6), dato relevante]
const T = [
  ['T01', 'Pagnifique 18 de Julio', 'Montevideo', 'Montevideo', -34.905, -56.191, 2, 6, 7, 'Tienda insignia: mayor facturación del país'],
  ['T02', 'Pagnifique Pocitos', 'Montevideo', 'Montevideo', -34.912, -56.152, 2, 6, 7, 'Pico de demanda de jueves a sábado'],
  ['T03', 'Pagnifique Tres Cruces', 'Montevideo', 'Montevideo', -34.894, -56.166, 2, 6, 7, 'Shopping: horario extendido los fines de semana'],
  ['T04', 'Pagnifique Unión', 'Montevideo', 'Montevideo', -34.875, -56.135, 2, 6, 7, 'Alta rotación de personal en el último trimestre'],
  ['T05', 'Pagnifique Cerro', 'Montevideo', 'Montevideo', -34.887, -56.255, 1, 4, 6, 'Zona con transporte limitado después de las 21 h'],
  ['T06', 'Pagnifique Ciudad Vieja', 'Montevideo', 'Montevideo', -34.907, -56.204, 1, 3, 6, 'Flujo de turistas de cruceros los lunes y martes'],
  ['T07', 'Pagnifique Las Piedras', 'Canelones', 'Las Piedras', -34.730, -56.219, 1, 4, 6, 'Sin cobertura frecuente: depende de suplentes de Montevideo'],
  ['T08', 'Pagnifique Ciudad de la Costa', 'Canelones', 'Ciudad de la Costa', -34.815, -56.020, 2, 6, 7, 'Crecimiento sostenido de ventas (+12 % interanual)'],
  ['T09', 'Pagnifique Pando', 'Canelones', 'Pando', -34.717, -55.958, 1, 3, 6, 'Tienda chica, un solo encargado con apertura y cierre'],
  ['T10', 'Pagnifique San José', 'San José', 'San José de Mayo', -34.337, -56.713, 1, 4, 6, 'Feria agropecuaria en noviembre: refuerzo de dotación'],
  ['T11', 'Pagnifique Punta del Este', 'Maldonado', 'Punta del Este', -34.963, -54.946, 2, 6, 7, 'Temporada alta: se prepara refuerzo desde noviembre'],
  ['T12', 'Pagnifique Maldonado Centro', 'Maldonado', 'Maldonado', -34.909, -54.958, 1, 4, 6, 'Caso de reintegro con certificado por vencer'],
  ['T13', 'Pagnifique Rocha', 'Rocha', 'Rocha', -34.483, -54.336, 1, 3, 6, 'Demanda estacional por turismo en La Paloma'],
  ['T14', 'Pagnifique Treinta y Tres', 'Treinta y Tres', 'Treinta y Tres', -33.233, -54.383, 1, 3, 6, 'Reintegro con alta próxima'],
  ['T15', 'Pagnifique Melo', 'Cerro Largo', 'Melo', -32.370, -54.167, 1, 4, 6, 'Compras de frontera con Brasil: picos de fin de mes'],
  ['T16', 'Pagnifique Minas', 'Lavalleja', 'Minas', -34.376, -55.238, 1, 3, 6, 'Una sola suplente cubre toda la zona'],
  ['T17', 'Pagnifique Colonia', 'Colonia', 'Colonia del Sacramento', -34.471, -57.844, 1, 4, 6, 'Turismo receptivo; ausencia futura sin cubrir'],
  ['T18', 'Pagnifique Carmelo', 'Colonia', 'Carmelo', -33.998, -58.285, 1, 3, 6, 'Depende de suplentes que viajan desde Colonia'],
  ['T19', 'Pagnifique Mercedes', 'Soriano', 'Mercedes', -33.252, -58.030, 1, 4, 6, 'Patrón de faltas los lunes detectado en un legajo'],
  ['T20', 'Pagnifique Fray Bentos', 'Río Negro', 'Fray Bentos', -33.116, -58.311, 1, 3, 6, 'Buen desempeño: cero horas extras en el mes'],
  ['T21', 'Pagnifique Trinidad', 'Flores', 'Trinidad', -33.517, -56.900, 1, 3, 6, 'Departamento con una única tienda y un solo suplente'],
  ['T22', 'Pagnifique Paysandú', 'Paysandú', 'Paysandú', -32.321, -58.075, 1, 4, 6, 'Reintegro prolongado con cobertura temporal'],
  ['T23', 'Pagnifique Salto', 'Salto', 'Salto', -31.383, -57.961, 1, 4, 6, 'Caso de reintegro con ajuste de tareas'],
  ['T24', 'Pagnifique Salto Costanera', 'Salto', 'Salto', -31.390, -57.955, 1, 3, 6, 'Prestadora de personal a Artigas ante faltantes'],
  ['T25', 'Pagnifique Artigas', 'Artigas', 'Artigas', -30.400, -56.468, 1, 3, 6, 'Sin suplentes en la zona: se escala a otras tiendas o externos'],
  ['T26', 'Pagnifique Durazno', 'Durazno', 'Durazno', -33.381, -56.523, 1, 3, 6, 'Ausencia prolongada por enfermedad en seguimiento'],
  ['T27', 'Pagnifique Florida', 'Florida', 'Florida', -34.099, -56.214, 1, 3, 6, 'Obras en la calle: baja afluencia hasta fin de mes'],
  ['T28', 'Pagnifique Tacuarembó', 'Tacuarembó', 'Tacuarembó', -31.711, -55.981, 1, 4, 6, 'Certificado médico próximo a vencer'],
  ['T29', 'Pagnifique Rivera', 'Rivera', 'Rivera', -30.905, -55.551, 1, 4, 6, 'Frontera seca con Livramento: picos los fines de semana'],
  ['T30', 'Pagnifique Rivera Frontera', 'Rivera', 'Rivera', -30.898, -55.540, 1, 3, 6, 'Free shop vecino: competencia directa'],
]
const tiendas = T.map(([id, nombre, departamento, ciudad, lat, lon, dotacion, personal, dias, nota]) => ({
  id, nombre, departamento, ciudad, regionId: regionDeDepto[departamento], lat, lon,
  dotacionPorTurno: dotacion, personal, apertura: { horario: '09:00–21:00', dias: dias === 7 ? 'Lunes a domingo' : 'Lunes a sábado' },
  diasAbierto: dias === 7 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5], dotacionMinima: dotacion, datoRelevante: nota,
}))
const tiendaById = Object.fromEntries(tiendas.map((t) => [t.id, t]))

// ───────────────────────── Empleados ─────────────────────────
const NF = ['Lucía', 'Camila', 'Valentina', 'Sofía', 'Martina', 'Agustina', 'Florencia', 'Micaela', 'Antonella', 'Bianca', 'Carolina', 'Daniela', 'Romina', 'Natalia', 'Paula', 'Rosana', 'Sandra', 'Silvana', 'Gabriela', 'Mariana', 'Andrea', 'Karina', 'Verónica', 'Noelia', 'Ana', 'Laura', 'Stefanía', 'Yamila', 'Jimena', 'Belén', 'Candela', 'Milagros', 'Leticia', 'Fabiana', 'Mónica', 'Claudia', 'Cecilia', 'Patricia', 'Ximena', 'Josefina', 'Lorena', 'Paola', 'Giuliana', 'Rocío']
const NM = ['Mateo', 'Santiago', 'Joaquín', 'Matías', 'Nicolás', 'Facundo', 'Agustín', 'Martín', 'Federico', 'Diego', 'Sebastián', 'Maximiliano', 'Gonzalo', 'Emiliano', 'Leandro', 'Mauricio', 'Rodrigo', 'Gastón', 'Ignacio', 'Bruno', 'Franco', 'Lucas', 'Daniel', 'Fernando', 'Álvaro', 'Pablo', 'Ricardo', 'Alejandro', 'Hernán', 'Cristian', 'Marcelo', 'Walter', 'Richard', 'Washington', 'Rubén', 'Gerardo', 'Julio', 'Ezequiel']
const AP = ['Rodríguez', 'González', 'Pérez', 'Fernández', 'García', 'Martínez', 'Silva', 'López', 'Díaz', 'Sosa', 'Techera', 'Cabrera', 'Suárez', 'Acosta', 'Núñez', 'Pereira', 'Rivero', 'Cardozo', 'Olivera', 'Píriz', 'Ferreira', 'Barboza', 'Machado', 'Bentancor', 'Rocha', 'Latorre', 'Benítez', 'Correa', 'Viera', 'Gómez', 'Alonso', 'Cáceres', 'Méndez', 'Ramos', 'Ledesma', 'Fagúndez', 'Britos', 'Umpiérrez', 'Pintos', 'Quintana', 'Zeballos', 'Lacuesta', 'Delgado', 'Maidana', 'Amorín', 'Cuello', 'Ibarra', 'Giménez', 'Texeira', 'Duarte', 'Izquierdo', 'Moreira', 'Burgueño', 'Echeverría', 'Etcheverry', 'Perdomo', 'Sellanes', 'Camejo', 'Ifrán', 'Ortiz', 'Medina', 'Castro', 'Vega', 'Morales', 'Ruiz']
const CALLES = ['Av. 18 de Julio', 'Bulevar Artigas', 'Gral. Flores', 'Rivera', 'Colón', 'Sarandí', 'Treinta y Tres', 'Ituzaingó', 'Av. Italia', 'Dr. Luis Alberto de Herrera', 'Lavalleja', 'Artigas', 'Rincón', 'Agraciada', 'Brasil', 'Uruguay']
const usedNames = new Set(['Camila Acosta', 'Rosana Núñez', 'Daniel Cardozo', 'Valentina Techera', 'Federico Sosa', 'Alejandro Bentancor', 'Lucía Ferreira', 'Mariana Olivera', 'Gabriela Píriz', 'Silvana Techera', 'Andrea Rodríguez', 'Gastón Pintos'])
const genName = (g) => { for (;;) { const n = `${pick(g === 'F' ? NF : NM)} ${pick(AP)}`; if (!usedNames.has(n)) { usedNames.add(n); return n } } }
const cargoDe = (base, g) => ({ vendedor: g === 'F' ? 'Vendedora' : 'Vendedor', repositor: g === 'F' ? 'Repositora' : 'Repositor', encargado: g === 'F' ? 'Encargada de tienda' : 'Encargado de tienda' }[base])
const COLORES = ['#2563eb', '#0891b2', '#7c3aed', '#c2410c', '#4d7c0f', '#be185d', '#0f766e', '#b45309', '#4338ca', '#9f1239']
const empleados = []
function nuevoEmpleado(o) {
  const id = 'E' + pad(empleados.length + 1)
  const g = o.genero || (rnd() < 0.58 ? 'F' : 'M')
  const nombre = o.nombre || genName(g)
  const ingreso = o.ingreso || addDays('2026-08-30', -ri(30, 365 * 11))
  const ciudad = o.tiendaId ? tiendaById[o.tiendaId].ciudad : 'Montevideo'
  const e = {
    id, nombre, genero: g, cargo: o.cargo, tiendaId: o.tiendaId || null, regionId: o.regionId || null,
    contrato: o.contrato || 'Efectivo', ingreso, saldoLicenciaDias: ri(3, 20),
    telefono: `09${ri(1, 9)} ${pad(ri(0, 999))} ${pad(ri(0, 999))}`, foto: 'placeholder', avatarColor: pick(COLORES),
    email: nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.') + '@pagnifique.com.uy',
    cedula: `${ri(1, 5)}.${pad(ri(0, 999))}.${pad(ri(0, 999))}-${ri(0, 9)}`,
    fechaNacimiento: addDays('2005-01-01', -ri(0, 365 * 38)), domicilio: `${pick(CALLES)} ${ri(100, 3999)}, ${ciudad}`,
    contactoEmergencia: { nombre: genName(rnd() < 0.5 ? 'F' : 'M'), parentesco: pick(['Madre', 'Pareja', 'Hermano/a', 'Padre']), telefono: `09${ri(1, 9)} ${pad(ri(0, 999))} ${pad(ri(0, 999))}` },
    salarioNominal: o.salario || ri(31, 44) * 1000, horasSemanales: 40, maxDias: o.maxDias || 5, pref: o.pref || (rnd() < 0.5 ? 'M' : 'T'),
    documentos: [
      { nombre: 'Contrato de trabajo', estado: 'vigente' },
      { nombre: 'Cédula de identidad', estado: 'vigente' },
      { nombre: 'Carné de salud', estado: rnd() < 0.9 ? 'vigente' : 'por vencer', vence: addDays(HOY, ri(15, 400)) },
    ],
  }
  empleados.push(e)
  return e
}
nuevoEmpleado({ nombre: 'Alejandro Bentancor', genero: 'M', cargo: 'Supervisor general', ingreso: '2012-03-05', salario: 118000 })
const coordNombres = ['Lucía Ferreira', 'Mariana Olivera', 'Gabriela Píriz', 'Silvana Techera', 'Andrea Rodríguez']
regiones.forEach((r, i) => nuevoEmpleado({ nombre: coordNombres[i], genero: 'F', cargo: 'Coordinadora regional', regionId: r.id, ingreso: addDays('2019-01-01', i * 160), salario: 82000 }))
const ciclo = ['vendedor', 'repositor', 'vendedor', 'vendedor', 'repositor']
for (const t of tiendas) {
  for (let k = 0; k < t.personal; k++) {
    const base = k === 0 ? 'encargado' : ciclo[(k - 1) % ciclo.length]
    const g = rnd() < 0.58 ? 'F' : 'M'
    const pt = k > 1 && t.personal === 4 && rnd() < 0.2 && t.diasAbierto.length === 6
    const contrato = k === 0 ? 'Efectivo' : pt ? 'Part-time' : wpick([['Efectivo', 72], ['Zafral', 12], ['A prueba', 8], ['Efectivo', 8]])
    nuevoEmpleado({ cargo: cargoDe(base, g), genero: g, tiendaId: t.id, regionId: t.regionId, contrato: t.personal === 3 && contrato === 'Part-time' ? 'Efectivo' : contrato, maxDias: pt ? 4 : 5, pref: k === 0 ? 'M' : undefined, salario: k === 0 ? ri(52, 64) * 1000 : undefined })
  }
}
const empById = Object.fromEntries(empleados.map((e) => [e.id, e]))
const porTienda = (tid) => empleados.filter((e) => e.tiendaId === tid)

// ───────────────────────── Turnos base ─────────────────────────
const turnos = []
let nTurno = 0
let huecosBase = 0
for (const t of tiendas) {
  const emps = porTienda(t.id)
  for (let w = 0; w < 9; w++) {
    const ws = addDays(START, w * 7)
    const cnt = Object.fromEntries(emps.map((e) => [e.id, 0]))
    for (let d = 0; d < 7; d++) {
      if (!t.diasAbierto.includes(d)) continue
      const fecha = addDays(ws, d)
      const usados = new Set()
      for (const fr of ['M', 'T']) {
        for (let k = 0; k < t.dotacionPorTurno; k++) {
          let c = emps.filter((e) => !usados.has(e.id) && cnt[e.id] < e.maxDias)
          if (!c.length) c = emps.filter((e) => !usados.has(e.id) && cnt[e.id] < 6)
          if (!c.length) { huecosBase++; continue }
          c.sort((a, b) => cnt[a.id] * 10 + (a.pref !== fr ? 4 : 0) + ((emps.indexOf(a) + w + d) % 3) * 0.1 - (cnt[b.id] * 10 + (b.pref !== fr ? 4 : 0) + ((emps.indexOf(b) + w + d) % 3) * 0.1))
          const e = c[0]
          usados.add(e.id); cnt[e.id]++
          turnos.push({ id: 'TU' + pad(++nTurno, 5), tipo: 'normal', empleadoId: e.id, tiendaId: t.id, fecha, franja: fr, estado: fecha < HOY ? 'cumplido' : 'programado' })
        }
      }
    }
  }
}
if (huecosBase) console.warn('⚠ huecos base de programación:', huecosBase)

// ───────────────────────── Suplentes ─────────────────────────
const BASES = Object.fromEntries(tiendas.map((t) => [t.id, t]))
const D_FULL = Object.fromEntries(DIAS_KEY.map((k) => [k, ['M', 'T']]))
const dispAleatoria = () => Object.fromEntries(DIAS_KEY.map((k) => [k, wpick([[[], 22], [['M'], 22], [['T'], 22], [['M', 'T'], 34]])]))
// [id, nombre, regionId, baseTienda, zonas, tipo, habilitaciones, coberturas, calificación, tiendaOrigen]
const SU = [
  ['S01', 'Valentina Techera', 'met', 'T07', ['Canelones', 'Montevideo', 'San José'], 'propio_part_time', ['venta', 'reposicion'], 48, 4.9],
  ['S02', 'Nicolás Barboza', 'met', 'T05', ['Montevideo', 'Canelones'], 'propio_part_time', ['venta', 'reposicion'], 31, 4.5],
  ['S03', 'Florencia Machado', 'met', 'T06', ['Montevideo'], 'de_otra_tienda', ['venta', 'reposicion'], 22, 4.7, 'T06'],
  ['S04', 'Santiago Latorre', 'met', 'T09', ['Canelones', 'Montevideo'], 'propio_part_time', ['venta', 'apertura'], 37, 4.3],
  ['S05', 'Bianca Correa', 'met', 'T04', ['Montevideo'], 'propio_part_time', ['venta', 'apertura', 'encargado'], 54, 4.8],
  ['S06', 'Mauricio Viera', 'met', 'T10', ['San José', 'Canelones'], 'propio_part_time', ['venta', 'reposicion'], 19, 4.1],
  ['S07', 'Lorena Benítez', 'met', 'T08', ['Canelones', 'Montevideo'], 'de_otra_tienda', ['venta', 'reposicion'], 27, 4.4, 'T08'],
  ['S08', 'Federico Sosa', 'este', 'T12', ['Maldonado', 'Rocha'], 'propio_part_time', ['venta', 'apertura'], 41, 4.7],
  ['S09', 'Carolina Fagúndez', 'este', 'T16', ['Lavalleja', 'Maldonado'], 'propio_part_time', ['venta', 'reposicion'], 24, 4.6],
  ['S10', 'Rodrigo Britos', 'este', 'T13', ['Rocha', 'Maldonado', 'Treinta y Tres'], 'de_otra_tienda', ['venta', 'reposicion'], 30, 4.2, 'T13'],
  ['S11', 'Leticia Umpiérrez', 'este', 'T14', ['Treinta y Tres', 'Cerro Largo'], 'propio_part_time', ['venta', 'reposicion'], 17, 4.0],
  ['S12', 'Hernán Pintos', 'este', 'T15', ['Cerro Largo', 'Treinta y Tres'], 'propio_part_time', ['venta', 'reposicion', 'apertura'], 26, 4.5],
  ['S13', 'Ximena Quintana', 'ls', 'T17', ['Colonia', 'Soriano'], 'propio_part_time', ['venta', 'apertura'], 33, 4.6],
  ['S14', 'Gonzalo Zeballos', 'ls', 'T19', ['Soriano', 'Río Negro'], 'de_otra_tienda', ['venta', 'reposicion'], 21, 4.3, 'T19'],
  ['S15', 'Paula Lacuesta', 'ls', 'T20', ['Río Negro', 'Soriano'], 'propio_part_time', ['venta', 'reposicion'], 15, 4.4],
  ['S16', 'Cristian Delgado', 'ls', 'T21', ['Flores'], 'propio_part_time', ['venta', 'reposicion'], 12, 4.0],
  ['S17', 'Daniela Maidana', 'ln', 'T22', ['Paysandú'], 'propio_part_time', ['venta', 'apertura'], 29, 4.6],
  ['S18', 'Marcelo Cuello', 'ln', 'T24', ['Salto', 'Paysandú'], 'de_otra_tienda', ['venta', 'reposicion'], 18, 4.2, 'T24'],
  ['S19', 'Natalia Amorín', 'ln', 'T23', ['Salto'], 'propio_part_time', ['venta', 'reposicion'], 20, 4.5],
  ['S20', 'Walter Ibarra', 'cn', 'T29', ['Rivera', 'Tacuarembó'], 'propio_part_time', ['venta', 'apertura'], 35, 4.4],
  ['S21', 'Silvia Giménez', 'cn', 'T28', ['Tacuarembó', 'Durazno'], 'propio_part_time', ['venta', 'reposicion'], 16, 4.1],
  ['S22', 'Álvaro Texeira', 'cn', 'T26', ['Durazno', 'Florida'], 'propio_part_time', ['venta', 'reposicion'], 23, 4.3],
  ['S23', 'Gerardo Duarte', 'cn', 'T30', ['Rivera', 'Tacuarembó', 'Artigas', 'Salto'], 'externo', ['venta', 'reposicion'], 44, 4.6],
  ['S24', 'Ignacio Moreira', 'met', 'T01', ['Montevideo', 'Canelones', 'Maldonado'], 'externo', ['venta', 'reposicion', 'apertura'], 63, 4.5],
  ['S25', 'Camila Izquierdo', 'este', 'T11', ['Maldonado', 'Rocha'], 'externo', ['venta', 'reposicion'], 28, 4.2],
]
const suplentes = SU.map(([id, nombre, regionId, baseT, zonas, tipo, hab, cob, cal, origen], i) => {
  const b = BASES[baseT]
  let empleadoId = null
  if (origen) { const e = pick(porTienda(origen).filter((x) => !x.cargo.startsWith('Encargad'))); e.__suplente = id; empleadoId = e.id }
  const disp = dispAleatoria()
  if (id === 'S01' || id === 'S08') Object.assign(disp, D_FULL)
  if (id === 'S23') { disp.lun = ['M', 'T']; disp.mar = ['M', 'T'] }
  return {
    id, nombre, regionId, tipo, empleadoId, tiendaOrigenId: origen || null,
    base: { ciudad: b.ciudad, departamento: b.departamento, lat: +(b.lat + (rnd() - 0.5) * 0.02).toFixed(4), lon: +(b.lon + (rnd() - 0.5) * 0.02).toFixed(4) },
    zonas, disponibilidad: disp, habilitaciones: hab, coberturasRealizadas: cob, calificacion: cal,
    telefono: `09${ri(1, 9)} ${pad(ri(0, 999))} ${pad(ri(0, 999))}`, foto: 'placeholder', avatarColor: COLORES[i % COLORES.length],
    desde: addDays('2026-08-01', -ri(60, 900)),
  }
})
for (const s of suplentes) { if (s.empleadoId) s.nombre = empById[s.empleadoId].nombre; else usedNames.add(s.nombre) }
const supById = Object.fromEntries(suplentes.map((s) => [s.id, s]))

// ───────────────────────── Helpers de escenarios ─────────────────────────
const protegidos = new Set()
const turnoDe = (empId, fecha) => turnos.find((t) => t.tipo === 'normal' && t.empleadoId === empId && t.fecha === fecha)
function asegurarTurno(empId, fecha, franja) {
  const e = empById[empId]
  const ex = turnoDe(empId, fecha)
  if (ex && (!franja || ex.franja === franja)) return ex
  const cand = turnos.filter((t) => t.tipo === 'normal' && t.tiendaId === e.tiendaId && t.fecha === fecha && (!franja || t.franja === franja) && t.empleadoId !== empId && !protegidos.has(t.empleadoId) && !t.ausenciaId)
  const tgt = cand[0]
  if (!tgt) throw new Error(`no se pudo asegurar turno ${empId} ${fecha}`)
  if (ex) { ex.empleadoId = tgt.empleadoId }
  tgt.empleadoId = empId
  return tgt
}
function renombrar(emp, nombre, extra = {}) {
  usedNames.add(nombre)
  emp.nombre = nombre
  emp.email = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.') + '@pagnifique.com.uy'
  Object.assign(emp, extra)
  protegidos.add(emp.id)
}
const noEnc = (tid) => porTienda(tid).filter((e) => !e.cargo.startsWith('Encargad') && !protegidos.has(e.id))

// ───────────────────────── Ausencias + coberturas ─────────────────────────
const ausencias = []
const coberturas = []
const coverRows = []
let nAus = 0, nCob = 0, nCov = 0
const ocupado = new Set() // suplente|fecha
const TIPOS_AUS = ['enfermedad', 'falta_sin_aviso', 'tramite_personal', 'duelo', 'estudio', 'familiar_enfermo', 'licencia']
const NEEDS_COMP = { enfermedad: ['certificado_medico', 'Certificado médico'], duelo: ['partida_defuncion', 'Partida de defunción'], estudio: ['constancia_estudio', 'Constancia de estudio'], familiar_enfermo: ['certificado_familiar', 'Certificado médico de familiar'], tramite_personal: ['constancia_tramite', 'Constancia del trámite'] }
const IMG = { certificado_medico: 'img/comprobante-medico.svg', partida_defuncion: 'img/comprobante-constancia.svg', constancia_estudio: 'img/comprobante-constancia.svg', certificado_familiar: 'img/comprobante-medico.svg', constancia_tramite: 'img/comprobante-constancia.svg' }
const MOTIVOS = {
  enfermedad: ['Cuadro gripal con fiebre', 'Gastroenteritis', 'Dolor de espalda, consulta con traumatólogo', 'Migraña', 'Control médico programado', 'Infección de garganta'],
  falta_sin_aviso: ['No se presentó al turno ni avisó', 'Sin aviso, no atiende el teléfono'],
  tramite_personal: ['Trámite en el BPS', 'Renovación de cédula', 'Trámite bancario', 'Gestión en la intendencia'],
  duelo: ['Fallecimiento de familiar directo'],
  estudio: ['Parcial en la facultad', 'Examen en UTU', 'Entrega de trabajo final'],
  familiar_enfermo: ['Hijo/a con fiebre, sin cuidado', 'Acompaña a familiar internado'],
  licencia: ['Licencia aprobada'],
}
const ofertaPago = (s, tienda, nTurnos) => {
  const km = kmRuta(s.base.lat, s.base.lon, tienda.lat, tienda.lon)
  const tarifa = empresa.config.tarifaSuplenteHora[s.tipo]
  const viatico = km > empresa.config.umbralViaticoKm ? km * empresa.config.viaticoPorKm : 0
  return { km, pago: nTurnos * 8 * tarifa + viatico }
}
function elegibles(tienda, filas, { permitirOtraRegion = false } = {}) {
  return suplentes.filter((s) => (permitirOtraRegion || s.regionId === tienda.regionId) && s.zonas.includes(tienda.departamento)).filter((s) => filas.every((f) => !ocupado.has(s.id + '|' + f.fecha)) || filas.length > 3)
}
function disponibleSup(s, f) { return s.disponibilidad[DIAS_KEY[dow(f.fecha)]].includes(f.franja) }
function crearCobertura({ aus, filas, suplente, estado, enviadaEn, respondidaEn, motivoRechazo }) {
  const tienda = tiendaById[aus.tiendaId]
  const { km, pago } = ofertaPago(suplente, tienda, filas.length)
  const c = {
    id: 'CB' + pad(++nCob), ausenciaId: aus.id, tiendaId: tienda.id, regionId: tienda.regionId, tipoOferta: suplente.tipo === 'externo' ? 'externo' : 'suplente', suplenteId: suplente.id, empleadoId: null,
    turnoIds: filas.map((f) => f.id), fechaDesde: filas[0].fecha, fechaHasta: filas.at(-1).fecha, franja: filas.every((f) => f.franja === filas[0].franja) ? filas[0].franja : 'MT',
    estado, enviadaEn, respondidaEn: respondidaEn || null, tiempoRespuestaMin: respondidaEn ? minDiff(enviadaEn, respondidaEn) : null, distanciaKm: km, pagoEstimado: pago, motivoRechazo: motivoRechazo || null,
  }
  coberturas.push(c)
  return c
}
function aplicarCobertura(c, filas) {
  c.turnoIds.forEach((tid, i) => {
    const f = filas[i]
    const row = { id: 'CT' + pad(++nCov, 4), tipo: 'cobertura', suplenteId: c.suplenteId, tiendaId: f.tiendaId, fecha: f.fecha, franja: f.franja, cubreTurnoId: f.id, coberturaId: c.id, estado: f.fecha < HOY ? 'cumplido' : 'programado' }
    coverRows.push(row)
    f.cubiertoPor = row.id
    ocupado.add(c.suplenteId + '|' + f.fecha)
  })
}
// Genera ofertas previas (rechazadas / sin respuesta) y una aceptada. Devuelve true si logró cubrir.
function cubrir(aus, filas, { previas = true, forzado = null } = {}) {
  const tienda = tiendaById[aus.tiendaId]
  const cand = forzado ? [forzado] : shuffle(elegibles(tienda, filas)).sort((a, b) => (filas.length === 1 ? disponibleSup(b, filas[0]) - disponibleSup(a, filas[0]) : 0))
  if (!cand.length) return false
  const base = aus.avisadoEn
  let t0 = addMin(base, ri(8, 50))
  const ganador = cand[0]
  if (previas && cand.length > 1 && filas.length <= 3 && rnd() < 0.35) {
    const otro = cand[1]
    const rech = rnd() < 0.6
    const r = crearCobertura({ aus, filas, suplente: otro, estado: rech ? 'rechazada' : 'sin_respuesta', enviadaEn: t0, respondidaEn: rech ? addMin(t0, ri(4, 40)) : null, motivoRechazo: rech ? pick(['No tengo disponibilidad ese día', 'Estoy con otro turno', 'Me queda lejos para llegar a horario']) : null })
    t0 = addMin(t0, ri(25, 50))
    void r
  }
  const c = crearCobertura({ aus, filas, suplente: ganador, estado: 'aceptada', enviadaEn: t0, respondidaEn: addMin(t0, ri(3, 70)) })
  aplicarCobertura(c, filas)
  return true
}
function nuevaAusencia(o) {
  const emp = empById[o.empleadoId]
  const hasta = o.hasta || o.desde
  const filas = turnos.filter((t) => t.tipo === 'normal' && t.empleadoId === emp.id && t.fecha >= o.desde && t.fecha <= hasta && !t.ausenciaId)
  const id = 'A' + pad(++nAus)
  const tipo = o.tipo
  let estado = o.estado
  const necesita = NEEDS_COMP[tipo]
  const sinComp = o.sinComprobante || ['pendiente_comprobante', 'rechazada'].includes(estado) && o.sinComprobante !== false || tipo === 'falta_sin_aviso' || tipo === 'licencia' || !necesita
  const avisadoEn = o.avisadoEn || (tipo === 'falta_sin_aviso' ? dt(o.desde, 9, ri(20, 50)) : dt(addDays(o.desde, rnd() < 0.5 ? -1 : 0), rnd() < 0.5 ? 19 : 7, ri(0, 40)))
  const a = {
    id, empleadoId: emp.id, tiendaId: emp.tiendaId, regionId: emp.regionId, tipo, desde: o.desde, hasta, turnoIds: filas.map((f) => f.id), estado,
    avisadoEn, motivo: o.motivo || pick(MOTIVOS[tipo]), prolongada: hasta > o.desde && diffDays(o.desde, hasta) >= 7,
    comprobante: sinComp ? null : { archivo: `${necesita[0]}_${emp.nombre.split(' ')[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}_${o.desde.replaceAll('-', '')}.${rnd() < 0.7 ? 'jpg' : 'pdf'}`, etiqueta: necesita[1], imagen: IMG[necesita[0]], subidoEn: addMin(avisadoEn, ri(20, 600)) },
    comentarioCoordinadora: o.comentario || null, resueltaPor: null, resueltaEn: null, licenciaId: o.licenciaId || null,
  }
  if (['validada', 'cubierta', 'rechazada', 'sin_cubrir'].includes(estado)) { a.resueltaPor = regiones.find((r) => r.id === emp.regionId).coordinadoraId; a.resueltaEn = addMin(avisadoEn, ri(60, 600)) }
  if (estado === 'rechazada') a.comentarioCoordinadora = o.comentario || (tipo === 'falta_sin_aviso' ? 'Falta injustificada. Se registra en el legajo.' : 'El comprobante no corresponde a la fecha de la ausencia.')
  if (estado === 'validada') a.comentarioCoordinadora = o.comentario || 'Comprobante validado.'
  filas.forEach((f) => { f.estado = tipo === 'licencia' ? 'licencia' : 'ausente'; f.ausenciaId = id })
  ausencias.push(a)
  if (o.cubrir && filas.length) {
    const ok = cubrir(a, filas, { forzado: o.forzado, previas: o.previas !== false })
    if (!ok && a.estado === 'cubierta') a.estado = 'sin_cubrir'
  } else if (a.estado === 'cubierta') a.estado = 'sin_cubrir'
  return a
}
const nombreCorto = (e) => e.nombre

// ───────────────────────── Escenarios ─────────────────────────
// 1) Camila Acosta (Pocitos): turno de mañana hoy, sin ausencia. Es el "empleado" para avisar ausencia.
const camila = noEnc('T02')[0]
renombrar(camila, 'Camila Acosta', { genero: 'F', cargo: 'Vendedora', contrato: 'Efectivo', saldoLicenciaDias: 14, ingreso: '2022-03-14', pref: 'M' })
asegurarTurno(camila.id, HOY, 'M')

// 2) Pocitos, turno tarde de hoy: otra persona enferma, sin cobertura ni ofertas (la coordinadora busca suplente)
const pocitosY = noEnc('T02').find((e) => e.id !== camila.id)
protegidos.add(pocitosY.id)
asegurarTurno(pocitosY.id, HOY, 'T')
const A_pocitos = nuevaAusencia({ empleadoId: pocitosY.id, desde: HOY, tipo: 'enfermedad', estado: 'sin_cubrir', avisadoEn: dt(HOY, 6, 40), motivo: 'Cuadro gripal con fiebre, no puede asistir', cubrir: false })

// 3) Las Piedras: hoy turno de mañana sin cobertura; un suplente rechazó, otro no respondió y Valentina Techera tiene la oferta pendiente
const lpX = noEnc('T07')[0]
protegidos.add(lpX.id)
asegurarTurno(lpX.id, HOY, 'M')
const A_lp = nuevaAusencia({ empleadoId: lpX.id, desde: HOY, tipo: 'enfermedad', estado: 'sin_cubrir', avisadoEn: dt(HOY, 6, 15), motivo: 'Gastroenteritis, avisa a primera hora', cubrir: false })
const lpFilas = turnos.filter((t) => A_lp.turnoIds.includes(t.id))
crearCobertura({ aus: A_lp, filas: lpFilas, suplente: supById.S02, estado: 'rechazada', enviadaEn: dt(HOY, 6, 30), respondidaEn: dt(HOY, 6, 52), motivoRechazo: 'Tengo otro compromiso esa mañana' })
crearCobertura({ aus: A_lp, filas: lpFilas, suplente: supById.S04, estado: 'sin_respuesta', enviadaEn: dt(HOY, 6, 30) })
crearCobertura({ aus: A_lp, filas: lpFilas, suplente: supById.S01, estado: 'pendiente', enviadaEn: dt(HOY, 7, 20) })

// 4) Artigas: sin suplentes en la zona → hoy y mañana sin cubrir
const arZ = noEnc('T25')[0]
protegidos.add(arZ.id)
asegurarTurno(arZ.id, HOY, 'T'); asegurarTurno(arZ.id, addDays(HOY, 1), 'T')
const A_art = nuevaAusencia({ empleadoId: arZ.id, desde: HOY, hasta: addDays(HOY, 1), tipo: 'enfermedad', estado: 'sin_cubrir', avisadoEn: dt(HOY, 6, 50), motivo: 'Reposo médico por 48 h (esguince)', cubrir: false })
// historial: la última vez que faltó alguien en Artigas se cubrió con prestado de Salto
// 5) Futuras sin cubrir (Rivera, Colonia)
const rvE = noEnc('T29')[1]; protegidos.add(rvE.id)
asegurarTurno(rvE.id, addDays(HOY, 2), 'M')
const A_rv = nuevaAusencia({ empleadoId: rvE.id, desde: addDays(HOY, 2), tipo: 'estudio', estado: 'sin_cubrir', avisadoEn: dt(addDays(HOY, -3), 12, 10), motivo: 'Examen final en UTU', cubrir: false })
const coE = noEnc('T17')[1]; protegidos.add(coE.id)
asegurarTurno(coE.id, addDays(HOY, 3), 'T')
const A_co = nuevaAusencia({ empleadoId: coE.id, desde: addDays(HOY, 3), tipo: 'tramite_personal', estado: 'sin_cubrir', avisadoEn: dt(addDays(HOY, -2), 17, 30), motivo: 'Trámite en el BPS', cubrir: false })

// 6) Patrón de faltas los lunes (Mercedes)
const mercP = noEnc('T19')[0]
renombrar(mercP, 'Gastón Pintos', { genero: 'M', cargo: 'Vendedor', ingreso: '2023-05-22', contrato: 'Efectivo' })
const lunes = [-28, -21, -14, -7, 0].map((d) => addDays(HOY, d))
lunes.forEach((f) => asegurarTurno(mercP.id, f))
const patron = [
  ['falta_sin_aviso', 'rechazada', 'No se presentó al turno ni avisó'],
  ['enfermedad', 'cubierta', 'Dolor de cabeza, presenta certificado'],
  ['falta_sin_aviso', 'rechazada', 'Sin aviso, no atiende el teléfono'],
  ['tramite_personal', 'cubierta', 'Trámite personal'],
  ['tramite_personal', 'pendiente_comprobante', 'Avisa a las 7:40 que tiene un trámite'],
]
const A_mer = []
lunes.forEach((f, i) => {
  const [tipo, estado, motivo] = patron[i]
  A_mer.push(nuevaAusencia({ empleadoId: mercP.id, desde: f, tipo, estado, motivo, cubrir: i < 4 || true, avisadoEn: tipo === 'falta_sin_aviso' ? dt(f, 9, 35) : dt(f, 7, ri(20, 45)), sinComprobante: tipo !== 'enfermedad' ? true : false }))
})

// 7) Ausencias prolongadas → reintegros
const reint = []
const nuevaRe = (o) => { const r = { id: 'RE' + pad(reint.length + 1, 2), ...o }; reint.push(r); return r }
const licencias = []
let nLic = 0
const nuevaLic = (o) => { const l = { id: 'L' + pad(++nLic), dias: Math.max(1, diffDays(o.desde, o.hasta) + 1), comentario: null, motivoRechazo: null, resueltaPor: null, resueltaEn: null, adjunto: null, ...o }; l.tiendaId = empById[l.empleadoId].tiendaId; l.regionId = empById[l.empleadoId].regionId; licencias.push(l); return l }
const coordDe = (rid) => regiones.find((r) => r.id === rid).coordinadoraId

function prolongada(tid, nombre, desde, hasta, extra, cubrirLargo = true) {
  let e = nombre ? noEnc(tid).find((x) => !x.__ocupadoRe) : null
  if (!e) e = noEnc(tid).find((x) => !x.__ocupadoRe)
  if (nombre) renombrar(e, nombre); else protegidos.add(e.id)
  e.__ocupadoRe = true
  const a = nuevaAusencia({ empleadoId: e.id, desde, hasta, tipo: 'enfermedad', estado: 'validada', motivo: extra.motivo, avisadoEn: dt(desde, 8, 5), cubrir: cubrirLargo, previas: false, comentario: 'Certificado validado. Seguimiento en reintegros.' })
  if (a.estado === 'validada' && coberturas.some((c) => c.ausenciaId === a.id && c.estado === 'aceptada')) a.estado = 'cubierta'
  return [e, a]
}
const nota = (fecha, autor, texto) => ({ fecha, autor, texto })
// RE01 Daniel Cardozo (Maldonado): certificado vence en 2 días
{
  const [e, a] = prolongada('T12', 'Daniel Cardozo', '2026-09-28', addDays(HOY, 2), { motivo: 'Fractura de muñeca, reposo' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Fractura de muñeca (accidente doméstico)', desde: '2026-09-28', certificado: { archivo: 'certificado_cardozo_20260928.pdf', vigenteHasta: addDays(HOY, 2) }, altaPrevista: addDays(HOY, 9), estado: 'certificado_por_vencer', ajusteTareas: null,
    notas: [nota('2026-09-29', 'Mariana Olivera', 'Se contactó al empleado. Control con traumatólogo el 14/10.'), nota('2026-10-08', 'Mariana Olivera', 'Informa que probablemente extienden el certificado una semana más.')],
    tareasPendientes: [{ id: 't1', texto: 'Pedir certificado de renovación antes del vencimiento', hecho: false, vence: addDays(HOY, 2) }, { id: 't2', texto: 'Coordinar cobertura temporal con Federico Sosa', hecho: true, vence: '2026-10-01' }, { id: 't3', texto: 'Evaluar alta con ajuste de tareas (sin carga)', hecho: false, vence: addDays(HOY, 9) }] })
}
// RE02 Rosana Núñez (Salto): reintegrada con ajuste de tareas
{
  const [e, a] = prolongada('T23', 'Rosana Núñez', '2026-07-27', '2026-09-20', { motivo: 'Cirugía de columna y rehabilitación' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Cirugía de columna y rehabilitación', desde: '2026-07-27', certificado: { archivo: 'certificado_nunez_alta_20260920.pdf', vigenteHasta: '2026-09-20' }, altaPrevista: '2026-09-21', reintegradoEn: '2026-09-21', estado: 'reintegrado_con_ajuste',
    ajusteTareas: 'Sin cargar ni mover cajas de más de 5 kg. Prioriza la atención en el salón. Turno de mañana fijo durante 60 días.',
    notas: [nota('2026-09-18', 'Silvana Techera', 'Alta médica con restricciones. Se acuerda plan de reintegro gradual.'), nota('2026-09-28', 'Silvana Techera', 'Primera semana sin inconvenientes. Se mantiene el ajuste.')],
    tareasPendientes: [{ id: 't1', texto: 'Control médico a los 30 días del reintegro', hecho: false, vence: '2026-10-21' }, { id: 't2', texto: 'Reunión de seguimiento con la encargada', hecho: true, vence: '2026-09-28' }, { id: 't3', texto: 'Revisar si se levanta la restricción de cargas', hecho: false, vence: '2026-11-20' }] })
  e.saldoLicenciaDias = 9
}
// RE03 Maternidad (Colonia) — licencia + ausencia
{
  const e = noEnc('T18')[0]; protegidos.add(e.id); e.__ocupadoRe = true
  const l = nuevaLic({ empleadoId: e.id, tipo: 'maternidad', desde: '2026-08-31', hasta: '2026-12-06', estado: 'aprobada', solicitadaEn: '2026-07-15T10:00:00', resueltaPor: 'E001', resueltaEn: '2026-07-17T09:00:00', comentario: 'Licencia por maternidad (14 semanas)' })
  const a = nuevaAusencia({ empleadoId: e.id, desde: '2026-08-31', hasta: '2026-12-06', tipo: 'licencia', estado: 'validada', motivo: 'Licencia por maternidad', avisadoEn: '2026-07-15T10:00:00', cubrir: true, previas: false, licenciaId: l.id })
  if (a.estado === 'validada' && coberturas.some((c) => c.ausenciaId === a.id && c.estado === 'aceptada')) a.estado = 'cubierta'
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, licenciaId: l.id, motivo: 'Licencia por maternidad', desde: '2026-08-31', certificado: { archivo: 'certificado_maternidad_bps.pdf', vigenteHasta: '2026-12-06' }, altaPrevista: '2026-12-07', estado: 'en_licencia', ajusteTareas: null,
    notas: [nota('2026-08-25', 'Gabriela Píriz', 'Se coordina cobertura temporal por 14 semanas.')], tareasPendientes: [{ id: 't1', texto: 'Contactar a la empleada 30 días antes del retorno', hecho: false, vence: '2026-11-06' }, { id: 't2', texto: 'Informar opciones de horario de lactancia (medio horario)', hecho: false, vence: '2026-11-20' }] })
}
// RE04 Alta próxima (Treinta y Tres)
{
  const [e, a] = prolongada('T14', null, '2026-09-21', addDays(HOY, 3), { motivo: 'Cirugía de rodilla (menor)' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Cirugía de rodilla (menor)', desde: '2026-09-21', certificado: { archivo: 'certificado_rodilla_alta.pdf', vigenteHasta: addDays(HOY, 3) }, altaPrevista: addDays(HOY, 4), estado: 'alta_proxima', ajusteTareas: null,
    notas: [nota('2026-10-09', 'Mariana Olivera', 'El médico confirma alta para el viernes 16/10.')], tareasPendientes: [{ id: 't1', texto: 'Confirmar fecha y horario de reintegro con el empleado', hecho: false, vence: addDays(HOY, 3) }, { id: 't2', texto: 'Avisar a Leticia Umpiérrez que finaliza la cobertura', hecho: false, vence: addDays(HOY, 3) }] })
}
// RE05 Reintegrado (Pando)
{
  const [e, a] = prolongada('T09', null, '2026-09-14', '2026-09-30', { motivo: 'Neumonía' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Neumonía', desde: '2026-09-14', certificado: { archivo: 'certificado_neumonia_alta.pdf', vigenteHasta: '2026-09-30' }, altaPrevista: '2026-10-01', reintegradoEn: '2026-10-01', estado: 'reintegrado', ajusteTareas: null,
    notas: [nota('2026-10-01', 'Lucía Ferreira', 'Se reintegra sin restricciones. Bienvenido/a de vuelta.')], tareasPendientes: [{ id: 't1', texto: 'Cerrar legajo del caso', hecho: true, vence: '2026-10-05' }] })
}
// RE06 En licencia (Paysandú) accidente laboral
{
  const [e, a] = prolongada('T22', null, '2026-09-10', '2026-10-30', { motivo: 'Accidente laboral (BSE)' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Accidente laboral (BSE)', desde: '2026-09-10', certificado: { archivo: 'certificado_bse_accidente.pdf', vigenteHasta: '2026-10-30' }, altaPrevista: '2026-11-02', estado: 'en_licencia', ajusteTareas: null,
    notas: [nota('2026-09-11', 'Silvana Techera', 'Denuncia presentada ante el BSE. Cobertura asignada a Daniela Maidana.')], tareasPendientes: [{ id: 't1', texto: 'Seguimiento del tratamiento con el BSE', hecho: false, vence: '2026-10-20' }] })
}
// RE07 Certificado por vencer (Tacuarembó)
{
  const [e, a] = prolongada('T28', null, '2026-10-01', addDays(HOY, 3), { motivo: 'Lumbalgia aguda, reposo' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Lumbalgia aguda', desde: '2026-10-01', certificado: { archivo: 'certificado_lumbalgia_20261001.pdf', vigenteHasta: addDays(HOY, 3) }, altaPrevista: addDays(HOY, 4), estado: 'certificado_por_vencer', ajusteTareas: null,
    notas: [nota('2026-10-07', 'Andrea Rodríguez', 'Pendiente nueva consulta el 15/10 para definir alta o extensión.')], tareasPendientes: [{ id: 't1', texto: 'Solicitar certificado actualizado', hecho: false, vence: addDays(HOY, 3) }] })
}
// RE08 Alta próxima (Colonia/Carmelo no, Soriano no) → Rocha reintegrado con ajuste
{
  const [e, a] = prolongada('T13', null, '2026-08-17', '2026-10-04', { motivo: 'Hernia de disco' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Hernia de disco', desde: '2026-08-17', certificado: { archivo: 'certificado_hernia_alta.pdf', vigenteHasta: '2026-10-04' }, altaPrevista: '2026-10-05', reintegradoEn: '2026-10-05', estado: 'reintegrado_con_ajuste',
    ajusteTareas: 'Horario reducido a 6 h diarias las dos primeras semanas; sin tareas de reposición en altura.',
    notas: [nota('2026-10-05', 'Mariana Olivera', 'Reintegro gradual acordado con el empleado.')], tareasPendientes: [{ id: 't1', texto: 'Volver al horario completo (evaluar el 19/10)', hecho: false, vence: '2026-10-19' }] })
}
// RE09 Durazno: en licencia (enfermedad prolongada)
{
  const [e, a] = prolongada('T26', null, '2026-09-07', '2026-10-23', { motivo: 'Tratamiento oncológico' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Tratamiento médico prolongado', desde: '2026-09-07', certificado: { archivo: 'certificado_tratamiento_20260907.pdf', vigenteHasta: '2026-10-23' }, altaPrevista: null, estado: 'en_licencia', ajusteTareas: null,
    notas: [nota('2026-09-08', 'Andrea Rodríguez', 'Caso sensible. Contacto quincenal con el empleado, sin presión de fechas.')], tareasPendientes: [{ id: 't1', texto: 'Llamado de seguimiento quincenal', hecho: false, vence: addDays(HOY, 5) }, { id: 't2', texto: 'Gestionar subsidio por enfermedad del BPS', hecho: true, vence: '2026-09-20' }] })
}
// RE10 Alta próxima Cerro Largo
{
  const [e, a] = prolongada('T15', null, '2026-09-24', addDays(HOY, 6), { motivo: 'Cirugía de vesícula' })
  nuevaRe({ empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, ausenciaId: a.id, motivo: 'Cirugía de vesícula', desde: '2026-09-24', certificado: { archivo: 'certificado_vesicula.pdf', vigenteHasta: addDays(HOY, 6) }, altaPrevista: addDays(HOY, 7), estado: 'alta_proxima', ajusteTareas: null,
    notas: [nota('2026-10-10', 'Mariana Olivera', 'Recuperación según lo previsto.')], tareasPendientes: [{ id: 't1', texto: 'Confirmar alta médica el 19/10', hecho: false, vence: addDays(HOY, 5) }] })
}

// 7b) Ausencias recién avisadas, por validar (para que cada bandeja tenga trabajo desde el inicio)
for (const [tid, tipo, estado, motivo, h] of [['T01', 'enfermedad', 'avisada', 'Dolor de muelas, va a la guardia', 6], ['T08', 'estudio', 'avisada', 'Parcial de la facultad', 7], ['T11', 'familiar_enfermo', 'avisada', 'Hija con fiebre', 7], ['T12', 'enfermedad', 'pendiente_comprobante', 'Gripe fuerte, vio al médico y le falta el certificado', 8], ['T16', 'enfermedad', 'avisada', 'Cuadro gastrointestinal', 6], ['T19', 'estudio', 'avisada', 'Examen en UTU', 7], ['T10', 'enfermedad', 'avisada', 'Contractura lumbar', 7], ['T28', 'tramite_personal', 'avisada', 'Renovación de cédula', 7], ['T23', 'enfermedad', 'avisada', 'Cuadro gripal', 6]]) {
  const e = noEnc(tid).find((x) => !protegidos.has(x.id) && turnoDe(x.id, HOY) && !turnoDe(x.id, HOY).ausenciaId)
  if (!e) continue
  protegidos.add(e.id)
  nuevaAusencia({ empleadoId: e.id, desde: HOY, tipo, estado, motivo, avisadoEn: dt(HOY, h, ri(0, 40)), cubrir: true, previas: false })
}

// 8) Ausencias aleatorias (hasta ~62 en total, al menos una por tienda)
function ausenciaAleatoria(tid) {
  const t = tiendaById[tid]
  for (let intento = 0; intento < 200; intento++) {
    const futuro = rnd() < 0.15
    const desde = futuro ? addDays(HOY, ri(4, 14)) : addDays(HOY, -ri(1, 27))
    const e = pick(noEnc(tid).filter((x) => !x.__ocupadoRe))
    if (!e) return null
    const f = turnoDe(e.id, desde)
    if (!f || f.ausenciaId) continue
    const reciente = diffDays(desde, HOY) <= 4 && !futuro
    let tipo = wpick([['enfermedad', 40], ['falta_sin_aviso', 14], ['tramite_personal', 14], ['duelo', 4], ['estudio', 12], ['familiar_enfermo', 10]])
    if (futuro) tipo = pick(['estudio', 'tramite_personal', 'enfermedad'])
    let estado
    if (futuro) estado = pick(['validada', 'validada', 'avisada'])
    else if (reciente) estado = wpick([['avisada', 3], ['pendiente_comprobante', 3], ['validada', 3], ['cubierta', 2]])
    else estado = wpick([['validada', 36], ['cubierta', 28], ['sin_cubrir', 10], ['rechazada', 12]])
    if (tipo === 'falta_sin_aviso' && (estado === 'validada' || estado === 'avisada')) estado = 'rechazada'
    if (tipo === 'falta_sin_aviso' && estado === 'pendiente_comprobante') estado = 'rechazada'
    const dias = tipo === 'duelo' ? 2 : tipo === 'enfermedad' && rnd() < 0.3 ? ri(2, 3) : 1
    let hasta = desde
    for (let k = 1; k < dias; k++) { if (turnoDe(e.id, addDays(desde, k))) hasta = addDays(desde, k); else break }
    const cubrirIt = estado === 'cubierta' || (estado === 'validada' && rnd() < 0.55) || (estado === 'rechazada' && rnd() < 0.5) || (['avisada', 'pendiente_comprobante'].includes(estado) && rnd() < 0.5)
    return nuevaAusencia({ empleadoId: e.id, desde, hasta, tipo, estado, cubrir: cubrirIt, sinComprobante: estado === 'rechazada' && rnd() < 0.6 ? true : undefined })
  }
  return null
}
for (const t of tiendas) if (!ausencias.some((a) => a.tiendaId === t.id)) ausenciaAleatoria(t.id)
const pesoTienda = tiendas.flatMap((t) => Array(t.personal > 4 ? 3 : t.personal === 4 ? 2 : 1).fill(t.id))
let guard = 0
while (ausencias.length < 64 && guard++ < 500) ausenciaAleatoria(pick(pesoTienda))

// 9) Licencias
const LIC = [
  // Camila: pendiente, aprobada (pasada) y rechazada
  [camila.id, 'anual', '2026-10-26', '2026-10-30', 'pendiente', { solicitadaEn: '2026-10-08T16:20:00', comentario: 'Viaje familiar' }],
  [camila.id, 'anual', '2026-08-10', '2026-08-14', 'aprobada', { solicitadaEn: '2026-07-06T11:00:00', resueltaPor: 'E002', resueltaEn: '2026-07-07T09:30:00' }],
  [camila.id, 'estudio', '2026-09-22', '2026-09-23', 'rechazada', { solicitadaEn: '2026-09-18T10:15:00', resueltaPor: 'E002', resueltaEn: '2026-09-18T15:40:00', motivoRechazo: 'Solicitud fuera de plazo (se requieren 15 días de aviso) y la tienda no alcanzaba la dotación mínima esos días. Podés volver a pedirla con constancia de la facultad.' }],
]
for (const l of LIC) nuevaLic({ empleadoId: l[0], tipo: l[1], desde: l[2], hasta: l[3], estado: l[4], ...l[5] })
// Otras licencias distribuidas por región
const motivosRech = ['No se alcanza la dotación mínima en esas fechas y no hay suplentes disponibles.', 'Coincide con el inventario anual: fechas bloqueadas para toda la tienda.', 'Faltan comprobantes: adjuntá la constancia y volvé a enviarla.']
for (const r of regiones) {
  const tn = tiendas.filter((t) => t.regionId === r.id)
  const mk = (tipo, estado, desdeOffset, dias, extra = {}) => {
    const t = pick(tn)
    const e = pick(noEnc(t.id).filter((x) => !x.__ocupadoRe))
    const desde = addDays(HOY, desdeOffset)
    const hasta = addDays(desde, dias - 1)
    return nuevaLic({ empleadoId: e.id, tipo, desde, hasta, estado, solicitadaEn: dt(addDays(HOY, estado === 'pendiente' ? -ri(1, 4) : Math.min(desdeOffset, 0) - ri(3, 25)), ri(8, 18), ri(0, 59)), ...extra })
  }
  mk('anual', 'pendiente', 20, 5)
  mk('estudio', 'pendiente', 9, 2, { comentario: 'Examen final' })
  const a = mk('anual', 'aprobada', -45, 7, { resueltaPor: r.coordinadoraId, resueltaEn: dt(addDays(HOY, -60), 10, 0) })
  void a
  if (r.id !== 'ln') mk(pick(['estudio', 'sin_goce', 'anual']), 'rechazada', -20, 3, { resueltaPor: r.coordinadoraId, resueltaEn: dt(addDays(HOY, -30), 12, 0), motivoRechazo: pick(motivosRech) })
}
nuevaLic({ empleadoId: noEnc('T10')[0].id, tipo: 'paternidad', desde: addDays(HOY, 12), hasta: addDays(HOY, 24), estado: 'pendiente', solicitadaEn: dt(addDays(HOY, -2), 15, 0), comentario: 'Nacimiento previsto para fin de mes' })
nuevaLic({ empleadoId: noEnc('T01')[0].id, tipo: 'sin_goce', desde: addDays(HOY, 30), hasta: addDays(HOY, 59), estado: 'pendiente', solicitadaEn: dt(addDays(HOY, -1), 9, 30), comentario: 'Motivos personales (viaje al exterior)' })
// licencia aprobada dentro del período, con cobertura (ausencia tipo licencia)
{
  const e = noEnc('T11')[0]
  const l = nuevaLic({ empleadoId: e.id, tipo: 'anual', desde: addDays(HOY, 7), hasta: addDays(HOY, 11), estado: 'aprobada', solicitadaEn: dt(addDays(HOY, -40), 10, 0), resueltaPor: 'E003', resueltaEn: dt(addDays(HOY, -38), 10, 0) })
  e.__ocupadoRe = true
  nuevaAusencia({ empleadoId: e.id, desde: l.desde, hasta: l.hasta, tipo: 'licencia', estado: 'cubierta', motivo: 'Licencia anual aprobada', avisadoEn: l.solicitadaEn, cubrir: true, previas: false, licenciaId: l.id })
}

// 10) Cambios de turno
const cambios = []
const turnoFut = (empId, min = 1) => turnos.find((t) => t.tipo === 'normal' && t.empleadoId === empId && t.fecha >= addDays(HOY, min) && !t.ausenciaId)
function nuevoCambio(o) { const c = { id: 'CM' + pad(cambios.length + 1, 2), ...o }; cambios.push(c); return c }
{
  const comp = noEnc('T02').find((e) => e.id !== camila.id && e.id !== pocitosY.id) || pocitosY
  const t1 = turnoFut(camila.id, 2), t2 = turnoFut(comp.id, 2)
  nuevoCambio({ solicitanteId: camila.id, companeroId: comp.id, tiendaId: 'T02', turnoId: t1.id, turnoDestinoId: t2.id, tipo: 'con_companero', motivo: 'Turno médico de mi hijo', estado: 'aprobado', creadaEn: dt(addDays(HOY, -9), 18, 5), resueltaPor: 'E002' })
  for (const [tid, k] of [['T02', 1], ['T08', 0], ['T11', 0], ['T22', 0], ['T29', 0], ['T19', 1]]) {
    const es = noEnc(tid).filter((e) => !e.__ocupadoRe && e.id !== camila.id)
    if (es.length < 2) continue
    const [a, b] = es
    const ta = turnoFut(a.id, 2 + k), tb = turnoFut(b.id, 2 + k)
    if (!ta || !tb) continue
    nuevoCambio({ solicitanteId: a.id, companeroId: b.id, tiendaId: tid, turnoId: ta.id, turnoDestinoId: tb.id, tipo: 'con_companero', motivo: pick(['Cumpleaños familiar', 'Trámite en el banco', 'Clase en la facultad', 'Cita médica']), estado: k === 1 && tid === 'T19' ? 'rechazado' : 'pendiente_coordinadora', motivoRechazo: k === 1 && tid === 'T19' ? 'Ambos turnos quedan con la misma persona en la franja de mayor demanda.' : null, creadaEn: dt(addDays(HOY, -1), ri(9, 19), ri(0, 59)) })
  }
}

// 11) Horas extras (últimas 5 semanas, incl. la actual)
const horasExtras = []
const probHE = { met: 0.2, este: 0.3, ls: 0.14, ln: 0.2, cn: 0.17 }
const horasHE = { met: [1, 3], este: [2, 4], ls: [1, 3], ln: [1, 3], cn: [1, 3] }
const sinCubrirTiendas = new Set(ausencias.filter((a) => a.estado === 'sin_cubrir').map((a) => a.tiendaId))
for (const e of empleados.filter((x) => x.tiendaId)) {
  for (let w = 4; w >= 0; w--) {
    const ws = addDays(startOfWeek(HOY), -w * 7)
    if (e.tiendaId === 'T20') continue // Fray Bentos: cero horas extras
    if (rnd() < probHE[e.regionId] * (e.tiendaId === 'T11' ? 1.3 : 1)) {
      const dias = ri(1, 2)
      for (let k = 0; k < dias; k++) {
        const fecha = addDays(ws, ri(0, 6))
        if (fecha > HOY) continue
        const causa = e.regionId === 'este' ? wpick([['pico_demanda', 55], ['ausencia_sin_cubrir', 25], ['inventario', 10], ['cierre_tardio', 10]]) : wpick([['ausencia_sin_cubrir', 35], ['pico_demanda', 30], ['inventario', 15], ['cierre_tardio', 12], ['evento_promocional', 8]])
        const [h0, h1] = horasHE[e.regionId]
        horasExtras.push({ id: 'HE' + pad(horasExtras.length + 1), empleadoId: e.id, tiendaId: e.tiendaId, regionId: e.regionId, fecha, horas: ri(h0, h1), causa, estado: diffDays(fecha, HOY) <= 6 && rnd() < 0.3 ? 'pendiente' : 'aprobada' })
      }
    }
  }
}
void sinCubrirTiendas
horasExtras.sort((a, b) => a.fecha.localeCompare(b.fecha))
horasExtras.forEach((h, i) => (h.id = 'HE' + pad(i + 1)))
// Aseguro al menos una entrada de horas extras por tienda (excepto T20, la tienda modelo)
for (const t of tiendas) if (t.id !== 'T20' && !horasExtras.some((h) => h.tiendaId === t.id)) {
  const e = pick(porTienda(t.id))
  horasExtras.push({ id: 'HE' + pad(horasExtras.length + 1), empleadoId: e.id, tiendaId: t.id, regionId: t.regionId, fecha: addDays(HOY, -ri(2, 20)), horas: 2, causa: 'pico_demanda', estado: 'aprobada' })
}
const hePorRegion = Object.fromEntries(regiones.map((r) => [r.id, horasExtras.filter((h) => h.regionId === r.id).reduce((s, h) => s + h.horas, 0)]))
const empPorRegion = Object.fromEntries(regiones.map((r) => [r.id, empleados.filter((e) => e.regionId === r.id && e.tiendaId).length]))
const heProm = Object.fromEntries(regiones.map((r) => [r.id, hePorRegion[r.id] / empPorRegion[r.id]]))
const promNac = horasExtras.reduce((s, h) => s + h.horas, 0) / empleados.filter((e) => e.tiendaId).length
const pctEste = Math.round((heProm.este / promNac - 1) * 100)

// 12) Notificaciones y usuarios
const rosana = empById[reint.find((r) => r.estado === 'reintegrado_con_ajuste' && r.regionId === 'ln').empleadoId]
const daniel = empById[reint[0].empleadoId]
const usuarios = [
  { id: 'U-SUP', rol: 'supervisor', empleadoId: 'E001', nombre: 'Alejandro Bentancor', detalle: 'Supervisor general · Casa matriz' },
  ...regiones.map((r) => ({ id: 'U-COORD-' + r.id, rol: 'coordinadora', empleadoId: r.coordinadoraId, regionId: r.id, nombre: empById[r.coordinadoraId].nombre, detalle: 'Coordinadora · ' + r.nombre })),
  { id: 'U-EMP-1', rol: 'empleado', empleadoId: camila.id, nombre: camila.nombre, detalle: 'Vendedora · Pocitos' },
  { id: 'U-EMP-2', rol: 'empleado', empleadoId: rosana.id, nombre: rosana.nombre, detalle: 'Reintegrada con ajuste de tareas · Salto' },
  { id: 'U-EMP-3', rol: 'empleado', empleadoId: daniel.id, nombre: daniel.nombre, detalle: 'En licencia, certificado por vencer · Maldonado' },
  { id: 'U-SUPL-1', rol: 'suplente', suplenteId: 'S01', nombre: 'Valentina Techera', detalle: 'Suplente · Metropolitana (tiene una oferta pendiente)' },
  { id: 'U-SUPL-2', rol: 'suplente', suplenteId: 'S08', nombre: 'Federico Sosa', detalle: 'Suplente · Este' },
]
const notificaciones = []
const notif = (usuarioId, f, titulo, texto, ruta, leida = false) => notificaciones.push({ id: 'N' + pad(notificaciones.length + 1), usuarioId, fecha: f, titulo, texto, ruta: ruta || null, leida })
notif('U-EMP-1', dt(HOY, 7, 5), 'Tu turno de hoy', 'Hoy trabajás de 09:00 a 17:00 en Pagnifique Pocitos.', '/')
notif('U-EMP-1', dt('2026-10-08', 16, 40), 'Licencia en revisión', 'Tu solicitud de licencia anual (26/10 al 30/10) está pendiente de aprobación.', '/licencias')
notif('U-EMP-1', dt('2026-09-18', 15, 41), 'Licencia rechazada', 'Tu licencia por estudio fue rechazada. Tocá para ver el motivo.', '/licencias', true)
notif('U-EMP-1', dt('2026-10-03', 18, 10), 'Cambio de turno aprobado', 'Tu cambio de turno fue aprobado por la coordinadora.', '/turnos', true)
notif('U-EMP-2', dt('2026-10-09', 10, 0), 'Seguimiento de tu reintegro', 'Recordá el control médico del 21/10. Tu ajuste de tareas continúa vigente.', '/reintegro')
notif('U-EMP-3', dt(HOY, 8, 0), 'Tu certificado está por vencer', `Tu certificado médico vence el ${addDays(HOY, 2).split('-').reverse().join('/')}. Subí el certificado actualizado.`, '/reintegro')
notif('U-SUPL-1', dt(HOY, 7, 20), 'Nueva oferta de cobertura', 'Pagnifique Las Piedras · hoy 09:00–17:00. Respondé lo antes posible.', '/ofertas')
notif('U-SUPL-1', dt('2026-10-02', 18, 0), 'Cobertura confirmada', 'Quedó confirmada tu cobertura del 03/10 en Ciudad de la Costa.', '/coberturas', true)
notif('U-SUPL-2', dt(HOY, 7, 0), 'Completá tu disponibilidad', 'Actualizá tu disponibilidad de la próxima semana para recibir más ofertas.', '/disponibilidad')

// 13) Alertas precalculadas
const al = []
const alerta = (o) => al.push({ id: 'AL' + pad(al.length + 1, 2), creadaEn: AHORA, resuelta: false, responsable: { rol: 'coordinadora', empleadoId: coordDe(o.regionId) }, gestion: { estado: 'sin_gestionar' }, ...o })
const tn = (id) => tiendaById[id].nombre
alerta({ tipo: 'sin_cobertura', severidad: 'alta', regionId: 'met', tiendaId: A_pocitos.tiendaId, ausenciaId: A_pocitos.id, titulo: `${tn(A_pocitos.tiendaId)} sin cobertura hoy`, detalle: 'Turno tarde 13:00–21:00: falta 1 persona y no hay ofertas enviadas.' })
alerta({ tipo: 'sin_cobertura', severidad: 'alta', regionId: 'met', tiendaId: 'T07', ausenciaId: A_lp.id, titulo: 'Las Piedras sin cobertura hoy', detalle: 'Turno mañana 09:00–17:00: 1 suplente rechazó, 1 no respondió y 1 oferta sigue pendiente.' })
alerta({ tipo: 'sin_cobertura', severidad: 'alta', regionId: 'ln', tiendaId: 'T25', ausenciaId: A_art.id, titulo: 'Artigas sin cobertura (hoy y mañana)', detalle: 'No hay suplentes en la zona. Hay que escalar a otras tiendas o externos.' })
alerta({ tipo: 'sin_cobertura', severidad: 'media', regionId: 'cn', tiendaId: 'T29', ausenciaId: A_rv.id, titulo: `Rivera: hueco el ${A_rv.desde.split('-').reverse().join('/')}`, detalle: 'Ausencia programada por estudio sin cobertura asignada.' })
alerta({ tipo: 'sin_cobertura', severidad: 'media', regionId: 'ls', tiendaId: 'T17', ausenciaId: A_co.id, titulo: `Colonia: hueco el ${A_co.desde.split('-').reverse().join('/')}`, detalle: 'Trámite personal aprobado sin cobertura asignada.' })
alerta({ tipo: 'patron_faltas', severidad: 'media', regionId: 'ls', tiendaId: 'T19', empleadoId: mercP.id, titulo: `Patrón de faltas los lunes: ${mercP.nombre}`, detalle: '5 de las últimas 5 semanas faltó los lunes (2 sin aviso). Convendría una conversación de seguimiento.' })
alerta({ tipo: 'horas_extras_region', severidad: 'alta', regionId: 'este', titulo: `Región Este: horas extras ${pctEste}% por encima del promedio nacional`, detalle: `Punta del Este y Maldonado concentran el pico por temporada. ${hePorRegion.este} h en las últimas 5 semanas.` })
alerta({ tipo: 'certificado_por_vencer', severidad: 'alta', regionId: 'este', tiendaId: 'T12', empleadoId: daniel.id, reintegroId: 'RE01', titulo: 'Certificado por vencer: Daniel Cardozo', detalle: `Vence el ${addDays(HOY, 2).split('-').reverse().join('/')}. Falta definir alta o extensión.` })
alerta({ tipo: 'certificado_por_vencer', severidad: 'media', regionId: 'cn', tiendaId: 'T28', empleadoId: reint[6].empleadoId, reintegroId: 'RE07', titulo: 'Certificado por vencer en Tacuarembó', detalle: `Vence el ${addDays(HOY, 3).split('-').reverse().join('/')}. Consulta médica el 15/10.` })
alerta({ tipo: 'alta_proxima', severidad: 'baja', regionId: 'este', tiendaId: 'T14', reintegroId: 'RE04', empleadoId: reint[3].empleadoId, titulo: 'Reintegro próximo en Treinta y Tres', detalle: `Alta prevista el ${addDays(HOY, 4).split('-').reverse().join('/')}. Avisar a la suplente.` })
alerta({ tipo: 'licencias_pendientes', severidad: 'media', regionId: 'met', titulo: 'Licencias pendientes hace más de 3 días en Metropolitana', detalle: 'Hay solicitudes esperando respuesta. Revisalas en la bandeja.' })

// Quién gestiona cada alerta: por defecto la coordinadora de la región; solo pasa a Supervisión si ella la eleva.
const setAl = (id, patch) => Object.assign(al.find((a) => a.id === id), patch)
setAl('AL02', { gestion: { estado: 'en_gestion', porId: 'E002', desde: dt(HOY, 7, 20), nota: 'Ofertas enviadas a 3 suplentes; esperando respuesta.' } })
setAl('AL03', { creadaEn: dt(HOY, 6, 52) })
setAl('AL06', { creadaEn: dt(addDays(HOY, -3), 10, 0) })
setAl('AL07', { creadaEn: dt(addDays(HOY, -2), 9, 0), responsable: { rol: 'supervisor', empleadoId: 'E001' }, gestion: { estado: 'elevada', porId: 'E003', desde: dt(addDays(HOY, -1), 16, 30), nota: 'El pico de temporada en Punta del Este supera la dotación. Solicito autorizar un refuerzo de 2 personas desde noviembre y subir el tope de horas extras de la región.' } })
setAl('AL08', { creadaEn: dt(addDays(HOY, -1), 9, 0), gestion: { estado: 'en_gestion', porId: 'E003', desde: dt(addDays(HOY, -1), 11, 0), nota: 'Se pidió certificado de renovación al empleado; control médico el 14/10.' } })
setAl('AL10', { creadaEn: dt(addDays(HOY, -2), 9, 0), gestion: { estado: 'en_gestion', porId: 'E003', desde: dt(addDays(HOY, -1), 10, 0), nota: 'Se coordina el fin de la cobertura con la suplente.' } })
setAl('AL11', { creadaEn: dt(addDays(HOY, -4), 9, 0) })

// ───────────────────────── Escritura ─────────────────────────
const strip = (e) => { const { __ocupadoRe, __suplente, maxDias, pref, ...r } = e; return { ...r, maxDias, pref } }
const turnosAll = [...turnos, ...coverRows].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tiendaId.localeCompare(b.tiendaId) || a.franja.localeCompare(b.franja))
const out = {
  empresa, regiones,
  tiendas: tiendas.map(({ diasAbierto, ...t }) => ({ ...t, diasAbierto })),
  empleados: empleados.map(strip), suplentes,
  turnos: turnosAll, ausencias, licencias, coberturas: coberturas.map((c) => c), reintegros: reint, horas_extras: horasExtras,
  alertas: al, usuarios, notificaciones, cambios_turno: cambios,
}
fs.mkdirSync('public/data', { recursive: true })
for (const [k, v] of Object.entries(out)) {
  const txt = Array.isArray(v) ? '[\n' + v.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n' : JSON.stringify(v, null, 2) + '\n'
  fs.writeFileSync(`public/data/${k}.json`, txt)
}

// ───────────────────────── Verificación ─────────────────────────
const cnt = (a, f) => a.filter(f).length
console.log('empleados', empleados.length, '| tiendas', tiendas.length, '| suplentes', suplentes.length)
console.log('turnos', turnos.length, '+ cobertura', coverRows.length, '| ausencias', ausencias.length, '| licencias', licencias.length, '| coberturas', coberturas.length, '| reintegros', reint.length, '| horas extra', horasExtras.length, '| cambios', cambios.length)
console.log('estados ausencia', Object.fromEntries(['avisada', 'pendiente_comprobante', 'validada', 'rechazada', 'cubierta', 'sin_cubrir'].map((s) => [s, cnt(ausencias, (a) => a.estado === s)])))
console.log('tiendas sin ausencias:', tiendas.filter((t) => !ausencias.some((a) => a.tiendaId === t.id)).map((t) => t.id).join(',') || 'ninguna')
console.log('deptos con tienda:', new Set(tiendas.map((t) => t.departamento)).size)
console.log('HE por persona/región', Object.fromEntries(Object.entries(heProm).map(([k, v]) => [k, +v.toFixed(2)])), 'prom nac', promNac.toFixed(2), '→ Este +' + pctEste + '%')
console.log('lunes de Gastón:', lunes.map((f) => !!turnoDe(mercP.id, f)?.ausenciaId).join(','))
console.log('ESCENARIOS', JSON.stringify({ pocitos: empById[pocitosY.id].nombre, lasPiedras: empById[lpX.id].nombre, artigas: empById[arZ.id].nombre, lunes: mercP.nombre }))
