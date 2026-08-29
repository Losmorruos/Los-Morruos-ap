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

## Novedades

- **Registro obligatorio**: nombre, apellidos y teléfono para entrar en la app.
- **Firebase (sincronización en tiempo real)**: registros de usuarios y actividad visibles desde cualquier dispositivo admin.
- **Asistente IA** en el panel de administración para modificar datos con lenguaje natural.
- La contraseña de administrador **ya no se muestra** en pantalla.

## Configurar Firebase (recomendado)

Para que los registros y la actividad se vean en **todos** los dispositivos del admin:

1. Ve a [Firebase Console](https://console.firebase.google.com) y crea un proyecto (o usa uno existente).
2. Activa **Firestore Database** (modo producción o prueba).
3. En **Project settings → Your apps** crea una app web y copia el objeto de configuración (`apiKey`, `projectId`, etc.).
4. En la app, entra en **Administración → Usuarios** y pega esa configuración JSON en el campo de Firebase. Pulsa **Guardar y conectar Firebase**.
5. Configura las **reglas de seguridad** de Firestore (Firestore → Rules). Ejemplo sencillo para un club (ajusta según necesites):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registrations/{docId} {
      allow read: if true;
      allow create, update: if request.resource.data.keys().hasAll(['nombre','apellidos','telefono','registeredAt']);
    }
    match /activity/{docId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['t','msg']);
    }
  }
}
```

Con esto, cualquiera puede registrarse y ver actividad, y el admin ve la lista actualizada en tiempo real.

> **Nota de seguridad**: estas reglas son abiertas (adecuadas para un club pequeño). Si más adelante quieres restringir, se puede añadir Firebase Authentication.

## Contenido de la app

- Inicio, Calendario, Clasificación, Resultados, Eventos, Plantilla, El Club, Chat
- Notificaciones push (OneSignal)
- Sincronización de datos del club vía GitHub (`data.json`)
- Registro de usuarios + actividad (local o Firebase)
- Asistente IA en administración

## Cómo actualizar los datos del club

Usa la zona de **Administración** o el **Asistente IA**.  
Los cambios se guardan en el dispositivo y, si tienes configurado el token de GitHub, se publican a `data.json` para que los vean todos.

## Colores

- Negro: `#0A0A0A`
- Dorado: `#F5C518`

---
Datos de ejemplo · No es una app oficial de la Federación.
