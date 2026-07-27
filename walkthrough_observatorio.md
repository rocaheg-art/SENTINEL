# Walkthrough — Sección "Observatorio"

Hemos implementado por completo el observatorio editorial según el brief de diseño. La sección se encuentra integrada en el menú de navegación y es totalmente dinámica, consumiendo datos agregados directamente del Data Warehouse en PostgreSQL.

## Detalles de Implementación

### 1. Portada / Hero de la Semana
- **Diseño**: Un bloque de 320px de alto con fondo gris oscuro `#0F172A` que contrasta con el tema claro del resto del dashboard.
- **Tipografía**: Título en `DM Serif Display` a 52px con la frase más relevante del flujo, y subtítulo en `Inter Light`.
- **Métricas**: Indicadores a la derecha separados por líneas verticales en `JetBrains Mono` mostrando:
  - Total de artículos procesados
  - Fuentes activas
  - Temas identificados
- **Barra de Progreso**: Una línea azul eléctrico en la parte inferior que ilustra de forma inmediata el transcurso de la semana analizada.

### 2. Tarjetas de Insight (Frases de Datos)
- **Visual**: Grid adaptable (`minmax(260px, 1fr)`) con tarjetas de 280px × 160px en fondo blanco. Borde izquierdo de 4px con el color temático de la categoría (azul para volumen, violeta para fuentes, ámbar para tiempo, verde para sentimiento).
- **Interacción**: Hover animado con `scale(1.02)`, sombra intensificada y botón fantasma "Ver detalle" que abre un modal con información extendida y contextual del insight.

### 3. Estadísticos Sparkcards
Fila de 5 tarjetas rápidas de 200px × 140px:
1. **Pulso Semanal**: Sparkline de área con Recharts que muestra el volumen día a día.
2. **Distribución de Fuentes**: Donut chart minimalista de 80px sin leyenda fija (leyendas accesibles al hover mediante tooltips).
3. **Temperatura Editorial**: Promedio de severidad de la semana con flecha delta de tendencia (↑ ↓) respecto a la semana anterior.
4. **Hora Pico**: Gráfica de 24 barras por hora, coloreando en ámbar automáticamente la hora de máxima actividad.
5. **Tema Dominante**: Categoría con mayor volumen, porcentaje de share y barra de progreso.
- **Modo Live Toggle**: Selector en la esquina que activa el polling asíncrono y hace destellar la tarjeta con una animación de volteo (*flip animation*) al actualizar el dato.

### 4. Línea del Tiempo Editorial
- Un track horizontal con soporte de arrastre de cursor (*draggable timeline*).
- Nodos proporcionales a la magnitud del evento (S, M, L) coloreados según el tipo (azul para volumen, rojo para sentimiento crítico, ámbar para anomalías).
- Hover con tooltips detallados mostrando hora, fecha, descripción editorial y sentimiento predominante.

### 5. Rankings Editoriales
- **Top Medios**: Lista numerada en dm-serif de los 5 medios más activos de Facebook con barra de progreso relativo y delta de posiciones.
- **Top Temas**: Lista con chips de categoría y **sparklines SVG inline** ultraligeros que muestran la tendencia de 5 días de cada tema.

### 6. Cierre — "El número de la semana"
- Bloque destacado con fondo azul suave `#EFF6FF` centrado en un número gigante de 96px en `JetBrains Mono` y una cita descriptiva abajo en `DM Serif Display` cursiva a 22px.

### 7. Navegación Histórica y Exportación
- **Tabs superiores** para cambiar de semana (Esta semana, Semana pasada, Hace 2 y 3 semanas). Al cambiar de pestaña, se recalculan en tiempo real los datos históricos y se gatilla la animación staggered de las tarjetas.
- **Exportar resumen**: Botón que invoca los estilos print para generar un PDF listo para compartir.

---

## Pruebas de Calidad
- **API Endpoint**: La ruta `GET /api/observatorio?semana=0` se validó mediante el script de integración, retornando un `200 OK` en menos de 90ms y trayendo las agregaciones numéricas correctas desde PostgreSQL.
- **TypeScript & Next.js Build**: Corrimos `npm run build` confirmando que todas las tipografías de Google Fonts y los tipos de Recharts compilan exitosamente.
