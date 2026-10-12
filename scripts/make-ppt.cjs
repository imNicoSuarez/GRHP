// Genera docs/Pagnifique_presentacion.pptx con las capturas de docs/capturas
const fs = require('fs')
const path = require('path')
const pptxgen = require('pptxgenjs')
// react y react-icons deben salir de la misma carpeta de dependencias
const R = (m) => require(require.resolve(m, { paths: (process.env.NODE_PATH || '').split(path.delimiter).concat([__dirname]) }))
const React = R('react')
const ReactDOMServer = R('react-dom/server')
const sharp = require('sharp')
const fa = require('react-icons/fa')
const SKILL = '/root/.claude/skills/synced/cff6dd3b-e91b-4c27-9db9-6efad5b771c7_df50722d-8d1b-423a-af03-33c4100e7458/pptx'
const { applyTheme } = require(path.join(SKILL, 'scripts/apply_theme.js'))

const CAP = path.join(__dirname, '..', 'docs', 'capturas')
const OUT = path.join(__dirname, '..', 'docs', 'Pagnifique_presentacion.pptx')
const THEME = {
  name: 'Pagnifique', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
  colors: { dk1: '111827', lt1: 'FFFFFF', dk2: '1E1B4B', lt2: 'EEF2FF', accent1: '4F46E5', accent2: '059669', accent3: 'D97706', accent4: 'DC2626', accent5: '0891B2', accent6: '7C3AED', hlink: '4338CA', folHlink: '6D28D9' },
}
const HEX = { dk2: '1E1B4B', lt2: 'EEF2FF', a1: '4F46E5', white: 'FFFFFF', gris: '475569' }

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
pres.title = 'Pagnifique · RRHH y personal de tiendas'
pres.author = 'Pagnifique'
const C = pres.SchemeColor

pres.defineSlideMaster({
  title: 'CONTENIDO', background: { color: 'FFFFFF' },
  objects: [{ text: { text: 'Pagnifique · RRHH y personal de tiendas · prototipo', options: { x: 0.5, y: 5.2, w: 6, h: 0.25, fontSize: 10, color: '64748B', margin: 0, isTextBox: true } } }],
  slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.25, fontSize: 10, color: '64748B', align: 'right' },
})
pres.defineSlideMaster({ title: 'OSCURA', background: { color: '1E1B4B' }, objects: [] })

const mk = async (name, color) => {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size: 256 }))
  const buf = await sharp(Buffer.from(svg)).png().toBuffer()
  return 'image/png;base64,' + buf.toString('base64')
}
const dims = (f) => { const b = fs.readFileSync(path.join(CAP, f + '.png')); return [b.readUInt32BE(16), b.readUInt32BE(20)] }
const imgPath = (f) => path.join(CAP, f + '.png')
// imagen por ancho, devuelve alto
function foto(slide, f, x, y, w, name, capt) {
  const [pw, ph] = dims(f); const h = (ph / pw) * w
  slide.addImage({ path: imgPath(f), x, y, w, h, altText: name || f, objectName: name || f, shadow: { type: 'outer', color: '000000', opacity: 0.18, blur: 8, offset: 2, angle: 90 } })
  if (capt) cap(slide, capt, x, y + h + 0.05, w)
  return h
}
const titulo = (slide, t) => slide.addText(t, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontFace: 'Cambria', fontSize: 32, bold: true, color: C.text2, align: 'left', valign: 'middle', margin: 0, isTextBox: true })
const cap = (slide, t, x, y, w) => slide.addText(t, { x, y, w, h: 0.28, fontSize: 11, color: HEX.gris, italic: true, margin: 0, isTextBox: true, align: 'center' })
function bullets(slide, items, x, y, w, h, size = 16) {
  slide.addText(items.map((t, i) => (Array.isArray(t)
    ? [{ text: t[0] + ' ', options: { bold: true, bullet: true, breakLine: false } }, { text: t[1], options: { breakLine: i < items.length - 1 } }]
    : [{ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }])).flat(), { x, y, w, h, fontSize: size, color: C.text1, paraSpaceAfter: 8, valign: 'top', margin: 0, isTextBox: true })
}

;(async () => {
  const ic = {}
  for (const [k, n, c] of [['user', 'FaUser', 'FFFFFF'], ['swap', 'FaExchangeAlt', 'FFFFFF'], ['users', 'FaUsers', 'FFFFFF'], ['globe', 'FaGlobeAmericas', 'FFFFFF'], ['check', 'FaCheck', 'FFFFFF'], ['bell', 'FaBell', 'FFFFFF'], ['arrowUp', 'FaArrowUp', 'FFFFFF'], ['shield', 'FaUserShield', 'FFFFFF'], ['eye', 'FaEye', 'FFFFFF']]) ic[k] = await mk(n, c)
  const circ = (s, k, x, y, d, color) => { s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 }, objectName: 'circulo-' + k }); s.addImage({ data: ic[k], x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5, altText: k }) }
  const sec = (t) => pres.addSection({ title: t })

  // 1. Portada
  sec('Presentación')
  let s = pres.addSlide({ masterName: 'OSCURA', sectionTitle: 'Presentación' })
  s.addText('Pagnifique', { x: 0.7, y: 1.5, w: 8.6, h: 1.1, fontFace: 'Cambria', fontSize: 60, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
  s.addText('RRHH y gestión del personal de tiendas', { x: 0.7, y: 2.65, w: 8.6, h: 0.6, fontSize: 28, color: 'C7D2FE', margin: 0, isTextBox: true })
  s.addText('Prototipo navegable: turnos, ausencias, licencias, suplencias y reintegros en una sola plataforma', { x: 0.7, y: 3.45, w: 7.4, h: 0.8, fontSize: 18, color: 'E0E7FF', margin: 0, isTextBox: true })
  s.addNotes('Presentación del prototipo navegable. Todos los datos son de ejemplo.')

  // 2. Qué es
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Presentación' })
  titulo(s, 'Una sola plataforma para el personal de las tiendas')
  const stats = [['30', 'tiendas'], ['19', 'departamentos'], ['125', 'empleados'], ['25', 'suplentes']]
  stats.forEach(([n, l], i) => {
    const x = 0.5 + i * 2.3
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.45, w: 2.1, h: 1.7, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, rectRadius: 0.12, objectName: 'stat-' + l })
    s.addText(n, { x, y: 1.55, w: 2.1, h: 0.95, fontFace: 'Cambria', fontSize: 54, bold: true, color: C.accent1, align: 'center', margin: 0, isTextBox: true })
    s.addText(l, { x, y: 2.5, w: 2.1, h: 0.45, fontSize: 18, color: C.text1, align: 'center', margin: 0, isTextBox: true })
  })
  s.addText('Sede en Montevideo, 5 regiones con su coordinadora y 1 supervisión general.', { x: 0.5, y: 3.5, w: 9, h: 0.4, fontSize: 18, color: C.text1, margin: 0, isTextBox: true })
  s.addText('Turnos · ausencias · licencias · suplencias · reintegros · tableros · legajo', { x: 0.5, y: 4.0, w: 9, h: 0.4, fontSize: 18, bold: true, color: C.accent1, margin: 0, isTextBox: true })
  s.addNotes('Pagnifique tiene casa matriz en Montevideo y tiendas en los 19 departamentos. La plataforma reúne la gestión de personal en un solo lugar.')

  // 3. Cuatro perfiles
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Presentación' })
  titulo(s, 'Cuatro perfiles, cada uno con lo que necesita')
  const perf = [['user', 'Empleado', 'Celular', 'Avisa que falta, pide licencias y cambios, ve su turno y su legajo.', C.accent1], ['swap', 'Suplente', 'Celular', 'Recibe ofertas de cobertura y las acepta con un toque.', C.accent5], ['users', 'Coordinadora', 'Web', 'Resuelve lo de su región: valida, aprueba y busca cobertura.', C.accent2], ['globe', 'Supervisor', 'Web', 'Ve todo el país y decide lo que las coordinadoras le elevan.', C.accent6]]
  perf.forEach(([k, n, d, t, col], i) => {
    const x = 0.5 + i * 2.3
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.4, w: 2.1, h: 3.2, fill: { color: C.background1 }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.12, objectName: 'tarjeta-' + n })
    circ(s, k, x + 0.7, 1.65, 0.7, col)
    s.addText(n, { x, y: 2.5, w: 2.1, h: 0.45, fontFace: 'Cambria', fontSize: 22, bold: true, color: C.text2, align: 'center', margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.5, y: 2.98, w: 1.1, h: 0.3, fontSize: 12, bold: true, color: col, align: 'center', margin: 0, isTextBox: true })
    s.addText(t, { x: x + 0.15, y: 3.4, w: 1.8, h: 1.3, fontSize: 14, color: C.text1, align: 'left', valign: 'top', margin: 0, isTextBox: true })
  })
  s.addNotes('Empleado y suplente usan la app desde el celular; coordinadora y supervisor desde la computadora.')

  // 4. Flujo
  sec('Cómo funciona')
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Cómo funciona' })
  titulo(s, 'De “hoy no puedo ir” a turno cubierto')
  const pasos = [['1', 'Avisa', 'El empleado avisa y sube el comprobante', 'Empleado', C.accent1], ['2', 'Valida', 'La coordinadora revisa y valida', 'Coordinadora', C.accent2], ['3', 'Sugiere', 'El sistema propone suplentes por cercanía y disponibilidad', 'Sistema', C.accent5], ['4', 'Acepta', 'Un suplente acepta; las demás ofertas se cancelan', 'Suplente', C.accent6], ['5', 'Cubierto', 'El turno queda cubierto y la alerta se cierra sola', 'Sistema', C.accent3]]
  pasos.forEach(([n, t, d, quien, col], i) => {
    const x = 0.5 + i * 1.82
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.5, y: 1.45, w: 0.65, h: 0.65, fill: { color: col }, line: { color: col, width: 0 }, objectName: 'paso-' + n })
    s.addText(n, { x: x + 0.5, y: 1.45, w: 0.65, h: 0.65, fontFace: 'Cambria', fontSize: 24, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true })
    if (i < 4) s.addShape(pres.ShapeType.line, { x: x + 1.2, y: 1.775, w: 0.95, h: 0, line: { color: '94A3B8', width: 1.5, endArrowType: 'triangle' }, objectName: 'flecha-' + n })
    s.addText(t, { x, y: 2.3, w: 1.65, h: 0.4, fontFace: 'Cambria', fontSize: 20, bold: true, color: C.text2, align: 'center', margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.05, y: 2.75, w: 1.55, h: 1.15, fontSize: 14, color: C.text1, align: 'center', valign: 'top', margin: 0, isTextBox: true })
    s.addText(quien, { x: x + 0.2, y: 3.95, w: 1.25, h: 0.3, fontSize: 12, bold: true, color: col, align: 'center', margin: 0, isTextBox: true })
  })
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.4, w: 9, h: 0.6, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, rectRadius: 0.1, objectName: 'nota-escalar' })
  s.addText('Si no hay suplentes en la zona, se escala a personal de otras tiendas o a externos.', { x: 0.7, y: 4.4, w: 8.6, h: 0.6, fontSize: 16, bold: true, color: C.text2, valign: 'middle', margin: 0, isTextBox: true })
  s.addNotes('El mismo flujo sirve para ausencias, licencias aprobadas y reintegros prolongados.')

  // 5. Empleado
  sec('Por perfil')
  const tres = (slide, fs, ys = 1.4) => fs.forEach(([f, t], i) => { foto(slide, f, 4.55 + i * 1.75, ys, 1.6, 'captura-' + f); cap(slide, t, 4.45 + i * 1.75, ys + 3.48, 1.8) })
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Empleado: avisar que falta en 3 pasos')
  bullets(s, [['Inicio:', 'su turno de hoy y el botón “Avisar ausencia”, siempre a un toque.'], ['Aviso:', 'motivo, fecha y comprobante. La coordinadora lo recibe al instante.'], ['Licencias:', 'saldo, solicitud y estado con el motivo del rechazo.'], ['Y además:', 'turnos y cambios, legajo, reintegro y notificaciones.']], 0.5, 1.45, 3.8, 3.4, 16)
  tres(s, [['emp1_inicio', 'Inicio'], ['emp2_avisar', 'Avisar ausencia'], ['emp4_licencias', 'Licencias']])
  s.addNotes('Demo: Camila Acosta avisa que falta hoy y sube el comprobante.')

  // 6. Suplente
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Suplente: ofertas claras, respuesta rápida')
  bullets(s, [['Ofertas:', 'tienda, horario, distancia desde su base y pago estimado.'], ['Disponibilidad:', 'marca cuándo puede cubrir; solo recibe ofertas que le sirven.'], ['Coberturas y horas:', 'lo agendado, lo realizado y lo ganado.']], 0.5, 1.45, 3.8, 3.4, 16)
  tres(s, [['sup1_ofertas', 'Ofertas'], ['sup2_disponibilidad', 'Disponibilidad'], ['sup3_horas', 'Mis horas']])
  s.addNotes('Demo: Valentina Techera acepta la oferta de Las Piedras.')

  // 7. Coordinadora panel
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Coordinadora: su región de un vistazo')
  bullets(s, [['Semáforo' , 'por tienda: rojo, amarillo o verde.'], ['Alertas', 'con el nombre de quien debe resolverlas.'], ['Bandeja:', 'valida ausencias, aprueba licencias y cambios.'], ['Planificador:', 'turnos con aviso de horas extras.']], 0.5, 1.45, 3.8, 3.4, 16)
  foto(s, 'co1_panel', 4.6, 1.4, 4.9, 'captura-panel-coordinadora', 'Panel de la región Metropolitana')
  s.addNotes('Cada alerta lleva directo a la acción. “Me hago cargo” toma el tema; “Elevar a Supervisión” pasa la decisión.')

  // 8. Cobertura y escalamiento
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Cobertura y escalamiento')
  foto(s, 'co3_cobertura', 0.9, 1.5, 3.6, 'captura-cobertura', 'Pocitos: suplentes por disponibilidad y cercanía')
  foto(s, 'co6_escalar', 5.5, 1.5, 3.6, 'captura-escalar', 'Artigas: sin suplentes en la zona, se escala')
  s.addText('Se envían ofertas a varios a la vez: gana quien acepta primero.', { x: 0.5, y: 1.0, w: 9, h: 0.35, fontSize: 16, color: C.text1, margin: 0, isTextBox: true })
  s.addNotes('En el interior puede no haber suplentes: el sistema propone otras tiendas (en su franco, con viáticos) y externos.')

  // 9. Supervisor
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Supervisor: el panorama nacional')
  bullets(s, [['Indicadores:', 'ausentismo, horas extras, cobertura y costo.'], ['Gestión por región:', 'quién responde y si está al día.'], ['Elevados:', 'los temas que las coordinadoras le piden decidir.']], 0.5, 1.45, 3.8, 3.4, 16)
  foto(s, 'su1_tablero', 4.6, 1.4, 4.9, 'captura-tablero', 'Tablero nacional')
  s.addNotes('El supervisor ve todo el país, pero no resuelve lo cotidiano.')

  // 10. Responsabilidades
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Cada tema tiene un responsable')
  const filas = [['users', C.accent2, 'Lo resuelve la coordinadora', 'Ausencias, licencias, cambios y cobertura de su región.'], ['arrowUp', C.accent5, 'Lo eleva si necesita decisión', 'El supervisor pasa a ser el responsable.'], ['shield', C.accent6, 'El supervisor interviene', 'Si hace falta, como administrador, desde un menú discreto “⋯”.']]
  filas.forEach(([k, col, t, d], i) => {
    const y = 1.45 + i * 1.15
    circ(s, k, 0.5, y + 0.1, 0.7, col)
    s.addText(t, { x: 1.4, y, w: 3.1, h: 0.45, fontFace: 'Cambria', fontSize: 17, bold: true, color: C.text2, margin: 0, isTextBox: true })
    s.addText(d, { x: 1.4, y: y + 0.45, w: 3.1, h: 0.65, fontSize: 14, color: C.text1, valign: 'top', margin: 0, isTextBox: true })
  })
  foto(s, 'su4_alertas_menu', 4.75, 1.4, 4.75, 'captura-alertas', 'Alertas con responsable y menú “⋯”')
  s.addNotes('Cada alerta muestra el nombre de la persona que debe resolverla. Si el supervisor interviene, se avisa a la coordinadora.')

  // 11. Mapa y análisis
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Por perfil' })
  titulo(s, 'Datos para decidir')
  foto(s, 'su3_mapa', 0.5, 1.4, 4.2, 'captura-mapa', 'Mapa de Uruguay con semáforo por departamento')
  foto(s, 'su6_analisis', 5.3, 1.4, 4.2, 'captura-analisis', 'Capacidad de la bolsa, causas y costos')
  s.addText('Comparativas entre regiones y tiendas, reportes exportables y configuración de reglas.', { x: 0.5, y: 4.8, w: 9, h: 0.35, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true })
  s.addNotes('Análisis para decidir: huecos de los próximos 7 días contra la capacidad de suplentes, ausencias por motivo, horas extras por causa y costo por tipo de suplente.')

  // 12. Siguientes pasos
  sec('Cierre')
  s = pres.addSlide({ masterName: 'CONTENIDO', sectionTitle: 'Cierre' })
  titulo(s, 'Qué sigue para validar el concepto')
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.4, w: 4.4, h: 3.5, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, rectRadius: 0.12, objectName: 'col-hoy' })
  s.addText('Ya se puede recorrer', { x: 0.75, y: 1.55, w: 4, h: 0.4, fontFace: 'Cambria', fontSize: 20, bold: true, color: C.text2, margin: 0, isTextBox: true })
  bullets(s, ['Los 4 perfiles, con datos de ejemplo', 'Avisos, coberturas, licencias y reintegros', 'Alertas con responsable y elevación', 'Mapa, comparativas y reportes'], 0.75, 2.1, 3.9, 2.7, 16)
  s.addShape(pres.ShapeType.roundRect, { x: 5.1, y: 1.4, w: 4.4, h: 3.5, fill: { color: C.background1 }, line: { color: 'CBD5E1', width: 1 }, rectRadius: 0.12, objectName: 'col-definir' })
  s.addText('Para definir con el equipo', { x: 5.35, y: 1.55, w: 4, h: 0.4, fontFace: 'Cambria', fontSize: 20, bold: true, color: C.text2, margin: 0, isTextBox: true })
  bullets(s, ['Reglas de aprobación y plazos de aviso', 'Tarifas de suplentes y valor de horas extras', 'Umbrales del semáforo y de las alertas', 'Conexión con los sistemas actuales'], 5.35, 2.1, 3.9, 2.7, 16)
  s.addNotes('El prototipo no tiene servidor: sirve para validar flujos y pantallas antes de construir.')

  // 13. Cierre
  s = pres.addSlide({ masterName: 'OSCURA', sectionTitle: 'Cierre' })
  s.addText('Probalo', { x: 0.7, y: 1.2, w: 8.6, h: 0.9, fontFace: 'Cambria', fontSize: 48, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
  s.addText('https://imnicosuarez.github.io/GRHP/', { x: 0.7, y: 2.2, w: 8.6, h: 0.5, fontSize: 24, color: 'C7D2FE', margin: 0, isTextBox: true, hyperlink: { url: 'https://imnicosuarez.github.io/GRHP/' } })
  s.addText('Con el selector “Ver como…” se cambia de perfil sin iniciar sesión.', { x: 0.7, y: 3.0, w: 8.6, h: 0.5, fontSize: 18, color: 'E0E7FF', margin: 0, isTextBox: true })
  s.addText('Camila Acosta (empleada) · Valentina Techera (suplente) · Lucía Ferreira (coordinadora) · Alejandro Bentancor (supervisor)', { x: 0.7, y: 3.6, w: 8.2, h: 0.9, fontSize: 16, color: 'C7D2FE', margin: 0, isTextBox: true, valign: 'top' })
  s.addNotes('Todos los datos son de ejemplo.')

  await pres.writeFile({ fileName: OUT })
  await applyTheme(OUT, THEME)
  console.log('ok')
})().catch((e) => { console.error(e); process.exit(1) })
