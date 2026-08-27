# Club Deportivo Los Morruos — App Móvil

App web progresiva (PWA) para el Club Deportivo **Los Morruos** de bola canaria (Fuerteventura).

## Cómo probarla en el móvil

### Opción rápida (recomendado)
1. Sube la carpeta completa a cualquier hosting gratuito (Netlify, Vercel, GitHub Pages, Cloudflare Pages…).
2. Abre la URL en el navegador del móvil (Chrome o Safari).
3. En el menú del navegador elige **“Añadir a la pantalla de inicio”** / **“Instalar aplicación”**.
4. Ya tienes el icono como una app nativa.

### Probar en local
- Abre `index.html` en el navegador del ordenador (para previsualizar).
- Para PWA completa necesitas servirla por HTTP (por ejemplo con `npx serve .` o Live Server).

## Contenido actual (datos de ejemplo)
- **Inicio**: próximo partido, últimos resultados, clasificación rápida y eventos.
- **Calendario**: partidos de la temporada.
- **Clasificación**: tabla de la Liga Insular de Fuerteventura.
- **Resultados**: histórico de partidos.
- **Eventos**: partidos + entrenamientos + actos sociales.
- **Plantilla**: 8 jugadores de ejemplo.
- **El Club**: info básica + logo.

## Cómo actualizar los datos
Todos los datos de ejemplo están en el `<script>` de `index.html` (arrays `standings`, `matches`, `events` y `players`).  
Sustituye los nombres, fechas y resultados por los reales cuando los tengas.

## Colores
- Negro: `#0A0A0A`
- Dorado: `#F5C518`
- Acentos de victoria/derrota en verde y rojo.

## Próximos pasos posibles
- Añadir fotos reales de jugadores.
- Conectar con resultados reales (si la federación publica datos).
- Sección de noticias.
- Formulario de contacto / inscripción.
- Notificaciones push de próximos partidos.

---
Datos de ejemplo · No es una app oficial de la Federación.
