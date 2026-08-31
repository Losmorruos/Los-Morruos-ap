# Los Morruos App — Versión mejorada

Basada en tu app original, con las mejoras recomendadas ya implementadas.

## Qué se ha añadido

### Acceso
- **Entrar como invitado**: se puede consultar la app sin registrarse (botón bajo el registro).

### Inicio
- **Cuenta atrás** en vivo en los próximos partidos (días / horas / min / seg).
- Botón **Compartir partido** (Web Share API o copiar al portapapeles).
- **Estados vacíos** más claros cuando no hay resultados o clasificación.

### Nuevas secciones del menú
1. **Entrenamientos** — listado de sesiones (fecha, hora, lugar, notas).
2. **Galería** — rejilla de fotos (por URL pública).
3. **Cancha / Mapa** — nombre, dirección, mapa embebido y enlace a Google Maps.
4. **Estadísticas** — partidos, victorias, empates, derrotas, jugadores, noticias.
5. **Socios** — cuota, beneficios y contacto.

### Administración (nuevas pestañas)
- Entrenamientos (formato `Fecha|Hora|Lugar|Título|Notas`)
- Galería (`URL|Caption`)
- Cancha (nombre, dirección, lat/lng, URL Maps, cómo llegar)
- Socios (texto, cuota, beneficios, contacto)

Los guardados usan el mismo flujo local + GitHub / push que ya tenías.

## Cómo publicar

1. Sustituye en tu repo `Los-Morruos-ap` los archivos:
   - `index.html`
   - `data.json` (o fusiona los campos nuevos)
   - `sw.js` (versión de caché `morruos-v10`)
2. Haz commit y push a `main` (GitHub Pages se actualiza solo).
3. En el móvil: cierra la app, borra caché del sitio o espera; el SW nuevo fuerza actualización.

## Campos nuevos en `data.json`

```json
"trainings": [ { "date", "time", "place", "title", "notes" } ],
"gallery": [ { "url", "caption" } ],
"venue": { "name", "address", "lat", "lng", "mapsUrl", "howto" },
"socios": { "info", "fee", "benefits": [], "contact" }
```

## Notas

- Chat, Firebase, OneSignal, Asistente IA y sync GitHub se mantienen como en el original.
- La galería necesita URLs públicas de imágenes (Imgur, Drive público, etc.).
- Para notificaciones push reales sigue haciendo falta configurar OneSignal en el admin.
- Si quieres formularios del admin más visuales (sin líneas `|`), se puede hacer en una siguiente iteración.


## Chat en tiempo real (Firebase)

- Colección Firestore: `chat`
- Campos por mensaje: `user`, `text`, `t` (ISO), `time`, `phone`, `guest`
- Listener `onSnapshot` ordenado por `t` (últimos 150)
- Si Firebase no está configurado, el chat sigue funcionando en local (+ GitHub si hay token admin)
- Badge del chat: **Local** / **● En vivo**
- Reglas recomendadas incluidas en Administración → Usuarios (desplegable)

### Pasos para activarlo

1. Firebase Console → crea proyecto (o usa el mismo)
2. Activa **Firestore Database**
3. Pega la config web en Administración → Usuarios → Firebase
4. Publica las reglas (incluye `match /chat/{docId}`)
5. Abre el chat en dos móviles: los mensajes aparecen al instante



## Actualización v12

- **Chat eliminado** del menú y de la app.
- **Estadísticas** separadas: Morro Jable A y Morro Jable B (pestañas).
- **Plantilla**: solo nombres y apellidos; separada en A y B. Admin: `Nombre|A` o `Nombre|B`.
- **Galería admin**: botón para elegir fotos del móvil/PC (se redimensionan y guardan).
- **Merchandising**: Camiseta, Suéter, Chándal (editable en admin).
- **Avisos push**: mejor diagnóstico (iOS PWA, permisos, App ID, dominio OneSignal).

