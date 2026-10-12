// Etiquetas, colores de estado consistentes (verde / amarillo / rojo / azul / gris) y formatos.
export const TONOS = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
  warn: 'bg-amber-50 text-amber-900 ring-amber-600/30',
  bad: 'bg-red-50 text-red-800 ring-red-600/25',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/25',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
}
export const ICONO_TONO = { ok: '✓', warn: '!', bad: '✕', info: 'i', neutral: '•' }

export const TIPOS_AUSENCIA = {
  enfermedad: 'Enfermedad', falta_sin_aviso: 'Falta sin aviso', tramite_personal: 'Trámite personal', duelo: 'Duelo',
  estudio: 'Estudio', familiar_enfermo: 'Familiar enfermo', licencia: 'Licencia',
}
export const ESTADO_AUSENCIA = {
  avisada: ['Avisada · por validar', 'info'], pendiente_comprobante: ['Falta comprobante', 'warn'], validada: ['Validada', 'ok'],
  rechazada: ['Rechazada', 'bad'], cubierta: ['Cubierta', 'ok'], sin_cubrir: ['Sin cubrir', 'bad'],
}
export const ESTADO_LICENCIA = { pendiente: ['Pendiente', 'warn'], aprobada: ['Aprobada', 'ok'], rechazada: ['Rechazada', 'bad'] }
export const ESTADO_OFERTA = {
  pendiente: ['Pendiente de respuesta', 'warn'], aceptada: ['Aceptada', 'ok'], rechazada: ['Rechazada', 'bad'],
  sin_respuesta: ['Sin respuesta', 'neutral'], cancelada: ['Cancelada (ya cubierta)', 'neutral'],
}
export const ESTADO_REINTEGRO = {
  en_licencia: ['En licencia', 'info'], certificado_por_vencer: ['Certificado por vencer', 'bad'], alta_proxima: ['Alta próxima', 'warn'],
  reintegrado: ['Reintegrado', 'ok'], reintegrado_con_ajuste: ['Reintegrado con ajuste de tareas', 'ok'],
}
export const ESTADO_CAMBIO = {
  pendiente_coordinadora: ['Esperando a la coordinadora', 'warn'], aprobado: ['Aprobado', 'ok'], rechazado: ['Rechazado', 'bad'],
}
export const CAUSA_HE = {
  ausencia_sin_cubrir: 'Ausencia sin cubrir', pico_demanda: 'Pico de demanda', inventario: 'Inventario', cierre_tardio: 'Cierre tardío', evento_promocional: 'Evento promocional',
}
export const TIPO_SUPLENTE = { propio_part_time: 'Propio part-time', de_otra_tienda: 'De otra tienda', externo: 'Externo' }
export const SEMAFORO = {
  verde: ['Sin novedades', 'ok', '#059669'], amarillo: ['Atención', 'warn', '#d97706'], rojo: ['Sin cobertura', 'bad', '#dc2626'],
}
export const SEVERIDAD = { alta: ['Alta', 'bad'], media: ['Media', 'warn'], baja: ['Baja', 'info'] }

export const pesos = (n) => '$U ' + Math.round(n || 0).toLocaleString('es-UY')
export const num = (n, d = 0) => (n ?? 0).toLocaleString('es-UY', { minimumFractionDigits: d, maximumFractionDigits: d })
export const pct = (n, d = 1) => num(n, d) + ' %'
export const iniciales = (nombre) => nombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
export const primerNombre = (n) => n.split(' ')[0]
