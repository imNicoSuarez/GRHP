// Genera docs/Pagnifique_guia_de_la_app.docx a partir de docs/capturas/*.png
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber, PageBreak,
} = require('docx')

const CAP = path.join(__dirname, '..', 'docs', 'capturas')
const COLOR = '4338CA', GRIS = '475569'
const dims = (f) => { const b = fs.readFileSync(path.join(CAP, f + '.png')); return [b.readUInt32BE(16), b.readUInt32BE(20)] }
const img = (f, ancho) => {
  const [w, h] = dims(f)
  return new ImageRun({ type: 'png', data: fs.readFileSync(path.join(CAP, f + '.png')), transformation: { width: ancho, height: Math.round((h / w) * ancho) }, altText: { title: f, description: f, name: f } })
}
const P = (t, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: Array.isArray(t) ? t : [new TextRun({ text: t, size: 22, ...(o.run || {}) })] })
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { before: 0, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 36, color: COLOR })] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: t, bold: true, size: 26, color: '1E1B4B' })] })
const bullet = (t, b) => new Paragraph({ numbering: { reference: 'vi', level: 0 }, spacing: { after: 60 }, children: b ? [new TextRun({ text: b + ' ', bold: true, size: 22 }), new TextRun({ text: t, size: 22 })] : [new TextRun({ text: t, size: 22 })] })
const cap = (t) => new Paragraph({ spacing: { before: 40, after: 200 }, alignment: AlignmentType.LEFT, children: [new TextRun({ text: t, italics: true, size: 18, color: GRIS })] })
const webImg = (f, texto) => [new Paragraph({ spacing: { before: 120, after: 0 }, children: [img(f, 600)] }), cap(texto)]
const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const bordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde }
const celda = (children, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: bordes, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children })
function fila(items, ancho) {
  const w = Math.floor(9026 / items.length)
  return new Table({
    width: { size: w * items.length, type: WidthType.DXA }, columnWidths: items.map(() => w),
    rows: [new TableRow({ children: items.map(([f, t]) => celda([new Paragraph({ alignment: AlignmentType.CENTER, children: [img(f, ancho)] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 120 }, children: [new TextRun({ text: t, italics: true, size: 18, color: GRIS })] })], w)) })],
  })
}
const linea = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
const b6 = { top: linea, bottom: linea, left: linea, right: linea }
function tabla(cols, rows) {
  const total = 9026
  const cw = cols.map((c) => Math.floor(total * c))
  const mk = (txt, i, head) => new TableCell({ width: { size: cw[i], type: WidthType.DXA }, borders: b6, margins: { top: 60, bottom: 60, left: 100, right: 100 }, shading: head ? { type: ShadingType.CLEAR, fill: 'E0E7FF', color: 'auto' } : undefined, children: [new Paragraph({ children: [new TextRun({ text: txt, size: 20, bold: head || i === 0 })] })] })
  return new Table({ width: { size: cw.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: cw, rows: [new TableRow({ tableHeader: true, children: rows[0].map((t, i) => mk(t, i, true)) }), ...rows.slice(1).map((r) => new TableRow({ children: r.map((t, i) => mk(t, i, false)) }))] })
}

const portada = [
  new Paragraph({ spacing: { before: 1800, after: 120 }, children: [new TextRun({ text: 'Pagnifique', bold: true, size: 72, color: COLOR })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'RRHH y gestión del personal de tiendas', size: 36, color: '1E1B4B' })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'Guía de la app (prototipo navegable): qué puede hacer cada rol', size: 26, color: GRIS })] }),
  P([new TextRun({ text: 'La app es un prototipo sin servidor: todos los datos son de ejemplo y los cambios que se hacen (avisar una ausencia, validarla, aceptar una cobertura, aprobar una licencia) se reflejan en todos los perfiles mientras dura la sesión. El botón “Reiniciar datos demo” de la barra superior vuelve todo al estado inicial.', size: 22 })]),
  P([new TextRun({ text: 'Para cambiar de perfil sin iniciar sesión se usa el selector “Ver como…” de la barra superior. “Hoy” está fijado en el lunes 12/10/2026, 07:50.', size: 22 })]),
  P([new TextRun({ text: 'Página: ', bold: true, size: 22 }), new TextRun({ text: 'https://imnicosuarez.github.io/GRHP/', size: 22, color: COLOR })]),
  P([new TextRun({ text: 'Código: ', bold: true, size: 22 }), new TextRun({ text: 'https://github.com/imNicoSuarez/GRHP', size: 22, color: COLOR })]),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: [new TextRun({ text: 'Resumen por rol', bold: true, size: 36, color: COLOR })] }),
  P('La plataforma tiene cuatro perfiles. Empleado y Suplente se usan desde el celular; Coordinadora y Supervisor, desde la computadora (la Coordinadora también se adapta al celular).'),
  tabla([0.17, 0.15, 0.68], [
    ['Perfil', 'Pantalla', 'Para qué lo usa'],
    ['Empleado', 'Celular', 'Ve su turno de hoy, avisa que falta (con comprobante), pide cambios de turno y licencias, consulta su legajo y su reintegro.'],
    ['Suplente', 'Celular', 'Recibe ofertas de cobertura (tienda, horario, distancia, pago) y las acepta o rechaza; marca su disponibilidad; ve sus coberturas y horas.'],
    ['Coordinadora regional', 'Web', 'Gestiona su región: valida ausencias, aprueba licencias y cambios, busca cobertura con suplentes sugeridos, planifica turnos, sigue reintegros.'],
    ['Supervisor general', 'Web', 'Ve el estado nacional, controla que cada tema tenga responsable, decide lo que las coordinadoras le elevan y analiza datos para decidir refuerzos y costos.'],
  ]),
  P(''),
  H2('Quién resuelve cada cosa'),
  tabla([0.3, 0.7], [
    ['Tema', 'Responsable'],
    ['Ausencias, comprobantes, cambios de turno, horas extras', 'Coordinadora regional'],
    ['Búsqueda de cobertura (suplentes, otras tiendas, externos)', 'Coordinadora regional'],
    ['Licencias comunes (anual, médica, estudio, paternidad)', 'Coordinadora regional'],
    ['Licencias sin goce y maternidad', 'Supervisor general'],
    ['Temas que la coordinadora eleva (por ejemplo, un refuerzo de dotación)', 'Supervisor general, hasta que decide o lo devuelve'],
    ['Cualquier tema, como administrador', 'Supervisor general, desde un menú discreto “⋯”; se avisa a la coordinadora'],
  ]),
]

const empleado = [
  H1('Empleado (celular)'),
  P('Todo está pensado para usarse con una mano. El botón “Avisar” del centro de la barra inferior queda siempre a un toque, en cualquier pantalla.'),
  H2('Qué puede hacer'),
  bullet('ve su turno de hoy, los próximos y el estado de sus pedidos.', 'Inicio:'),
  bullet('elige el motivo, la fecha, sube el comprobante (foto o archivo) y confirma. Su coordinadora recibe el aviso al instante.', 'Avisar ausencia en 3 pasos:'),
  bullet('mira la semana y pide cambiar un turno con un compañero; la coordinadora lo aprueba.', 'Mis turnos:'),
  bullet('ve su saldo, solicita licencias y sigue el estado (pendiente, aprobada, rechazada con el motivo).', 'Licencias:'),
  bullet('datos personales, contrato, documentos e historial de ausencias, con la opción de subir comprobantes pendientes.', 'Legajo:'),
  bullet('si estuvo de licencia prolongada, ve su certificado, la fecha de alta, el ajuste de tareas y los pendientes del seguimiento.', 'Reintegro:'),
  bullet('recibe avisos cuando se valida su ausencia, se aprueba una licencia o se cubre su turno.', 'Notificaciones:'),
  new Paragraph({ children: [new PageBreak()] }),
  H2('Capturas'),
  fila([['emp1_inicio', 'Inicio: turno de hoy y botón “Avisar ausencia”'], ['emp2_avisar', 'Avisar ausencia, paso 1 de 3'], ['emp4_licencias', 'Licencias: saldo y estados, con el motivo del rechazo']], 175),
  fila([['emp3_turnos', 'Mis turnos y pedidos de cambio'], ['emp5_reintegro', 'Reintegro con ajuste de tareas']], 175),
]

const suplente = [
  H1('Suplente (celular)'),
  P('El suplente solo ve lo que necesita para decidir rápido: dónde, cuándo, a cuántos kilómetros y cuánto se le paga.'),
  H2('Qué puede hacer'),
  bullet('cada oferta muestra tienda, fecha, horario, distancia desde su base y pago estimado. Acepta o rechaza (con motivo) con un toque. Si acepta, la cobertura queda confirmada y la coordinadora recibe el aviso.', 'Ofertas de cobertura:'),
  bullet('marca con un toque en qué días y franjas (mañana o tarde) puede cubrir. Solo recibe ofertas que coinciden con su disponibilidad y sus zonas.', 'Mi disponibilidad:'),
  bullet('próximas coberturas confirmadas y las realizadas.', 'Mis coberturas:'),
  bullet('horas de las últimas semanas, ganancias estimadas, tarifa, tiempo de respuesta y calificación.', 'Mis horas:'),
  H2('Capturas'),
  fila([['sup1_ofertas', 'Ofertas: una urgente para hoy'], ['sup2_disponibilidad', 'Disponibilidad semanal'], ['sup3_horas', 'Horas, ganancias y calificación']], 175),
]

const coord = [
  H1('Coordinadora regional (web)'),
  P('Cada coordinadora gestiona su región (por ejemplo, Metropolitana o Litoral Norte). Es la responsable de resolver los avisos y las alertas de sus tiendas.'),
  H2('Qué puede hacer'),
  bullet('semáforo por tienda (rojo: hueco hoy; amarillo: atención; verde: sin novedades), indicadores de la región y alertas con el nombre de quien debe resolverlas. Cada alerta lleva directo a la acción.', 'Panel de región:'),
  bullet('valida o rechaza ausencias (viendo el comprobante), aprueba o rechaza licencias y cambios de turno, y autoriza horas extras.', 'Bandeja de solicitudes:'),
  bullet('para cada hueco sin cubrir, el sistema sugiere suplentes por disponibilidad y cercanía. Envía ofertas a varios a la vez; gana quien acepta primero.', 'Cobertura:'),
  bullet('si no hay suplentes en la zona, propone personal de otras tiendas en su franco o suplentes externos, con distancia y viáticos.', 'Escalamiento:'),
  bullet('arma la semana por tienda y avisa si alguien supera las 44 horas semanales (horas extras).', 'Planificador de turnos:'),
  bullet('disponibilidad, zonas, calificación y respuesta de su bolsa de suplentes.', 'Bolsa de suplentes:'),
  bullet('estado del certificado, alta prevista, ajuste de tareas, notas y tareas de seguimiento.', 'Reintegros:'),
  bullet('legajo de cada persona con el patrón de ausencias (por ejemplo, los lunes) y registro de conversaciones.', 'Equipo:'),
  bullet('con “Me hago cargo” toma una alerta; con “Elevar a Supervisión” pasa la decisión al Supervisor explicando qué necesita.', 'Responsabilidad:'),
  new Paragraph({ children: [new PageBreak()] }),
  H2('Capturas'),
  ...webImg('co1_panel', 'Panel de región con alertas, responsable y botones “Me hago cargo” y “Elevar a Supervisión”.'),
  ...webImg('co2_bandeja', 'Bandeja: ausencias por validar, con comprobante y acceso a la cobertura.'),
  ...webImg('co3_cobertura', 'Cobertura: suplentes sugeridos por disponibilidad y cercanía.'),
  ...webImg('co6_escalar', 'Artigas, sin suplentes en la zona: se escala a otras tiendas o a externos.'),
  ...webImg('co4_planificador', 'Planificador de turnos con dotación por franja y alerta de horas extras.'),
  ...webImg('co7_reintegro', 'Reintegro con certificado por vencer, tareas y notas.'),
]

const sup = [
  H1('Supervisor general (web)'),
  P('El Supervisor ve toda la empresa, pero no resuelve lo cotidiano: eso lo hacen las coordinadoras. Interviene en lo que le elevan, aprueba lo que le corresponde y controla que todo tenga responsable.'),
  H2('Qué puede hacer'),
  bullet('ausentismo, horas extras, tasa y tiempo de cobertura y costo estimado; gráficos por semana y por región; temas elevados a él y gestión por región.', 'Tablero nacional:'),
  bullet('los 19 departamentos con semáforo; cambia el criterio entre cobertura de hoy, ausentismo y horas extras; al tocar un departamento ve sus tiendas.', 'Mapa de Uruguay:'),
  bullet('regiones y tiendas lado a lado, con ranking ordenable.', 'Comparativas:'),
  bullet('alertas agrupadas en: elevadas a él (decide o devuelve con una indicación), sin gestionar (puede recordar a la coordinadora) y en gestión (solo lectura). Cada una muestra quién es la responsable.', 'Alertas y aprobaciones:'),
  bullet('aprueba o rechaza las licencias que según las reglas le corresponden (por ejemplo, sin goce).', 'Aprobaciones:'),
  bullet('desde un menú discreto “⋯” puede intervenir en cualquier tema aunque no se lo hayan elevado; queda registrado y se avisa a la coordinadora.', 'Administrador:'),
  bullet('huecos de los próximos 7 días contra la capacidad de la bolsa, ausencias por motivo, horas extras por causa, costo por tipo de suplente y personas con ausencias reiteradas.', 'Análisis para decidir:'),
  bullet('reintegros nacionales, personas, reportes con exportación a CSV y configuración (tipos y reglas de licencia, plazos de aviso, tarifas y tope de horas).', 'Otras pantallas:'),
  new Paragraph({ children: [new PageBreak()] }),
  H2('Capturas'),
  ...webImg('su1_tablero', 'Tablero nacional con los indicadores principales.'),
  ...webImg('su2_elevados_gestion', 'Temas elevados a él y gestión por región (quién responde y si está al día).'),
  ...webImg('su3_mapa', 'Mapa de Uruguay por departamento con semáforo.'),
  ...webImg('su4_alertas_menu', 'Alertas con responsable y el menú “⋯” para intervenir como administrador.'),
  ...webImg('su6_analisis', 'Análisis para decidir: capacidad de la bolsa, causas y costos.'),
  ...webImg('su7_config', 'Configuración: tipos de licencia, quién aprueba y reglas.'),
]

const cierre = [
  H1('Cómo probarlo'),
  P('Estas son algunas rutas rápidas desde el selector “Ver como…”:'),
  bullet('Camila Acosta → “Avisar ausencia” → subir comprobante. Después, Lucía Ferreira (Coordinadora Metropolitana) → Bandeja → “Validar”.', 'Aviso de ausencia:'),
  bullet('Lucía Ferreira → alerta “Pocitos sin cobertura” → “Asignar suplente” → enviar ofertas. Valentina Techera (Suplente) → aceptar la oferta de Las Piedras.', 'Cobertura con suplentes:'),
  bullet('Silvana Techera (Coordinadora Litoral Norte) → alerta de Artigas: no hay suplentes en la zona y aparecen otras tiendas y externos.', 'Sin suplentes en la zona:'),
  bullet('Alejandro Bentancor (Supervisor) → Tablero: “Elevados a vos” (horas extras de la región Este) → “Tomar decisión”.', 'Decisión del Supervisor:'),
  bullet('Alejandro Bentancor → Alertas → menú “⋯” de una alerta → “Intervenir como administrador”.', 'Intervención como administrador:'),
  P(''),
  P([new TextRun({ text: 'Nota: ', bold: true, size: 20, color: GRIS }), new TextRun({ text: 'todos los nombres, tiendas, cifras y fechas son datos de ejemplo generados para validar el concepto.', size: 20, color: GRIS })]),
]

const doc = new Document({
  creator: 'Pagnifique', title: 'Pagnifique · Guía de la app',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  numbering: { config: [{ reference: 'vi', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Pagnifique · Guía de la app · página ', size: 16, color: GRIS }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRIS })] })] }) },
    children: [...portada, ...empleado, ...suplente, ...coord, ...sup, ...cierre],
  }],
})
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(__dirname, '..', 'docs', 'Pagnifique_guia_de_la_app.docx'), b); console.log('ok', b.length) })
