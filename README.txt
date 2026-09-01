LOS MORRUOS - PAQUETE COMPLETO CORREGIDO

Este paquete contiene los archivos necesarios de la app con las correcciones solicitadas.

CORRECCIONES INCLUIDAS
- index.html completo, no la versión vacía.
- Firebase con la configuración del proyecto integrada.
- Migración automática del usuario local a Firestore cuando es posible.
- Listener robusto de registrations para el panel de usuarios.
- Service Worker v22 sin inyectar etiquetas <script> como texto visible.
- Eliminación de la causa que mostraba código JavaScript de Firebase en pantalla.
- Merchandising: «Consultar por WhatsApp».
- WhatsApp del club: +34 650 858 521.
- Mensaje de WhatsApp con producto y consulta de disponibilidad, tallas y precio.
- «Compartir partido» mediante el sistema nativo del móvil y alternativas.
- «Compartir app» en la cabecera, junto al carrito.
- data.json con la noticia de la nueva temporada corregida.

INSTALACIÓN
1. Haz una copia de seguridad de tu repositorio actual.
2. Descomprime este ZIP.
3. Sustituye los archivos del repositorio por los incluidos aquí.
4. Publica los cambios.
5. Después de publicar, abre la app y haz una recarga completa. El Service Worker v22 elimina la caché anterior.

IMPORTANTE
No vuelvas a usar un sw.js antiguo que contenga FIREBASE_FIX_SCRIPT con etiquetas <script> dentro de la cadena que se inyecta. Ese era el origen del código visible en la captura.
