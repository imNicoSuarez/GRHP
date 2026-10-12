# Pagnifique · RRHH y gestión de personal de tiendas (prototipo navegable)

Prototipo **sin backend** para validar el concepto: React + Vite + Tailwind, con todos los datos en `public/data/*.json` (se leen con `fetch`). Los cambios (avisar ausencia, validar, aceptar cobertura, aprobar licencias…) se guardan en estado local y se reflejan en **todos** los perfiles durante la sesión del navegador.

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:5173
# o: npm run build && npm run preview
```

Publicación: el workflow `.github/workflows/pages.yml` compila y publica en GitHub Pages en cada push a `master` (en el repo: Settings → Pages → Source: *GitHub Actions*). Queda en https://imnicosuarez.github.io/GRHP/ (el primer despliegue puede demorar un par de minutos).

- **Ver como…** (barra superior): cambia de usuario/rol sin login. Empleado y Suplente se ven dentro de un marco de teléfono; Coordinadora y Supervisor en layout web (la Coordinadora también es responsive para celular).
- **Reiniciar datos demo**: vuelve todo al estado inicial (también limpia lo guardado en `sessionStorage`).
- `npm run datos` regenera los JSON (generador determinístico en `scripts/generate-data.mjs`; ya vienen generados).
- "Hoy" está fijado en **lunes 12/10/2026, 07:50** para que los datos sean coherentes (el reloj avanza en tiempo real desde ahí).

## Estructura

```
public/data/*.json     15 archivos mock coherentes por ID (los 13 pedidos + notificaciones y cambios_turno)
public/img/            comprobantes placeholder (SVG)
scripts/               generate-data.mjs (datos), build-map.mjs (mapa), gen-img.mjs
src/lib/               store (estado + acciones), selectors (cobertura, semáforos, métricas), fechas, etiquetas
src/components/        UI (badges, modales, gráficos), marco de teléfono, layouts, mapa de Uruguay (SVG)
src/screens/           empleado/ suplente/ coordinadora/ supervisor/ shared/ (cobertura, reintegros, legajo, tienda)
```

Datos: 1 supervisor, 5 coordinadoras, 30 tiendas (los 19 departamentos), 125 empleados, 25 suplentes, ~4.100 turnos (4 semanas anteriores, actual y 4 siguientes), 65 ausencias, 26 licencias, 57 ofertas de cobertura, 10 reintegros, ~160 registros de horas extras y 11 alertas.

## Recorrido demo (escenario por escenario)

> Todo se hace desde “Ver como…”. Los textos entre comillas son botones o secciones.

1. **Empleado avisa que falta hoy, sube comprobante y su coordinadora valida**
   Ver como **Camila Acosta** (Empleado) → “Avisar ausencia” (botón rojo, o el `+` central) → paso 1: “Estoy enfermo/a”, “Hoy”, Siguiente → paso 2: “Usar una foto de ejemplo” (o elegí un archivo) → paso 3: “Enviar aviso”.
   Luego **Lucía Ferreira** (Coordinadora Metropolitana) → “Bandeja” → tab Ausencias → ver el comprobante → “Validar”. Volvé a Camila → Legajo: figura como validada. Además se generó un hueco en Pocitos (ver escenario 2).

2. **Tienda sin cobertura: el sistema sugiere suplentes, uno acepta y otro rechaza**
   - *Pocitos* (hueco de Romina Ibarra, sin ofertas): Lucía Ferreira → Panel → alerta “Pagnifique Pocitos sin cobertura hoy” → “Asignar suplente” → suplentes ordenados por disponibilidad y cercanía → “Enviar oferta” a 2 o 3. En “Ofertas enviadas”, los botones **Demo** simulan la respuesta: uno “Aceptó” (cancela las demás) y otro “Rechazó”.
   - *Las Piedras* (Martín Ramos): ya hay una oferta **rechazada**, una **sin respuesta** y una **pendiente** para Valentina Techera. Ver como **Valentina Techera** (Suplente) → “Aceptar”. Volvé a Lucía: la alerta de Las Piedras desaparece sola.

3. **Interior sin suplente disponible → escalar**
   Ver como **Silvana Techera** (Coordinadora Litoral Norte) → Panel → alerta “Artigas sin cobertura” → “Asignar suplente”. No hay suplentes que cubran Artigas; se recomiendan “Cobertura entre tiendas” (personal en su franco de otras tiendas, con distancia y viáticos) y “Externos y bolsas de otras regiones” (Gerardo Duarte, de la bolsa Centro-Norte). “Solicitar” / “Enviar oferta” y simulá la respuesta.

4. **Patrón de faltas los lunes**
   Ver como **Alejandro Bentancor** (Supervisor) → “Alertas y aprobaciones” → “Patrón de faltas los lunes: Gastón Pintos” → “Ver legajo y registrar seguimiento”: gráfico por día de la semana (lunes resaltado), historial y “Registrar en el legajo” (conversación).

5. **Licencias: pendiente, aprobada y rechazada con motivo**
   Ver como **Camila Acosta** → “Licencias”: una pendiente (26–30/10), una aprobada (agosto) y una rechazada con motivo. “Solicitar” crea otra. Como **Lucía Ferreira** → Bandeja → Licencias: “Aprobar” (genera el hueco a cubrir y descuenta saldo) o “Rechazar” con motivo (le llega a la empleada). La licencia **sin goce** requiere a Supervisión: Alejandro la ve en su tablero.

6. **Reintegros**
   Ver como **Mariana Olivera** (Coordinadora Este) → Reintegros → *Daniel Cardozo*: **certificado por vencer** (14/10). Probá “Registrar nuevo certificado”. *Rosana Núñez* (Litoral Norte, Silvana Techera, o ver como la propia Rosana → Legajo → Mi reintegro): **reintegrada con ajuste de tareas**. El Supervisor ve los 10 casos a nivel nacional.

7. **Región con horas extras muy por encima del promedio**
   Supervisor → Tablero: la región **Este** se destaca (≈ +100 % sobre el promedio). Alerta → “Ver comparativa de la región”. En Comparativas: barras por región y ranking de tiendas.

8. **Suplente gestiona su disponibilidad y acepta una oferta**
   Ver como **Valentina Techera** → “Disponibilidad”: tocá las celdas (se guarda al instante y cambia las sugerencias de la coordinadora) → “Ofertas” → “Aceptar” / “Rechazar” (con motivo) → “Coberturas” y “Mis horas”.

9. **Una tienda en cada departamento con algún dato relevante**
   Supervisor → “Mapa de Uruguay”: los 19 departamentos con semáforo (cambia el criterio: cobertura hoy / ausentismo / horas extras). Cada tienda tiene un dato relevante y movimientos (ausencias, horas extras, alertas). Tocá un departamento → tienda → detalle del día.

Extras: Planificador (Coordinadora → “Planificador”: asigná en un hueco rojo a alguien con 40 h y verás la alerta de horas extras sobre el tope de 44 h), cambios de turno (Empleado → Turnos → “Cambio”; la Coordinadora aprueba en Bandeja), Reportes con exportación CSV y Configuración (tipos de licencia, reglas, plazos, tarifas: afectan toda la demo).

## Decisiones tomadas (ambigüedades)

- **Estado de la ausencia** = los 6 valores pedidos (avisada, pendiente de comprobante, validada, rechazada, cubierta, sin cubrir). La cobertura real se **deriva de los turnos** (cada ausencia lista sus turnos y quién los cubre); al aceptarse una oferta, `sin cubrir`/`validada` pasa a `cubierta`.
- **Turnos**: dos franjas (Mañana 09–17, Tarde 13–21, 8 h). Tiendas chicas abren de lunes a sábado con 1 persona por franja; las grandes (6 tiendas de 2 por franja) todos los días. Tope semanal 44 h (configurable); un 6.º turno de 8 h dispara la alerta de horas extras.
- **Semáforo de tienda**: rojo = hueco hoy; amarillo = huecos en los próximos 7 días o certificado por vencer; verde = resto. El mapa usa el peor semáforo del departamento.
- **Ofertas de cobertura**: se pueden enviar a varios a la vez; gana quien acepta primero y las pendientes pasan a “cancelada”. El pago estimado = 8 h × tarifa por tipo de suplente (+ viáticos si hay más de 50 km). Las respuestas de otras personas se simulan con los botones “Demo”.
- **Licencia aprobada** → se marcan los turnos como “licencia” y se crea una ausencia de tipo licencia a cubrir (así entra en el mismo flujo de cobertura).
- **Escalamiento** (sin suplentes en la zona): 1) personal de otras tiendas en su franco (≤ 300 km, misma región primero, paga hora extra + viáticos), 2) suplentes/externos de otras bolsas cuya zona incluye el departamento.
- **Alertas**: están pre-calculadas en `alertas.json`; las de cobertura/reintegro se “apagan” solas cuando el dato que las originó cambia (p. ej. se cubre el turno).
- **Mapa**: polígonos simplificados de GADM 4.1 (`scripts/build-map.mjs`, solo se usó para generar `src/lib/uyMap.js`).
- Los comprobantes y las fotos de perfil son placeholders (SVG / iniciales). Las fechas de los `<input type="date">` siguen el idioma del navegador.
- Persistencia: solo `sessionStorage` (por pestaña). No hay login, permisos reales ni backend.
- Los links de imagen de los JSON son absolutos (`/img/...`): servir la app desde la raíz del dominio.
