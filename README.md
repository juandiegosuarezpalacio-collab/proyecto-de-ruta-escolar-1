# Ruta escolar Montenegro

Esta versión rehace la aplicación para que sí cargue la interfaz, la bandeja de mensajes y la conexión con WhatsApp.

## Qué funciona
- interfaz móvil
- orden de recogida por ruta
- bandeja de mensajes
- mensajes individuales y masivos
- IA local para redactar mensajes
- GPS del celular
- integración con WhatsApp app/web
- integración con WhatsApp Business por backend

## Cómo abrirla
### Opción recomendada
Sube esta carpeta a GitHub Pages o ábrela desde un servidor local.

### Si la abres con doble clic
Algunos navegadores bloquean `fetch()` local. Por eso la app trae datos de respaldo y también guarda cambios en `localStorage`.

## Cómo usar WhatsApp Business
1. Despliega `backend/cloudflare-worker.js` en Cloudflare Workers.
2. Crea estos secretos en Cloudflare:
   - `API_KEY`
   - `PHONE_NUMBER_ID`
   - `WHATSAPP_TOKEN`
3. En la app selecciona **Config**.
4. Elige **WhatsApp Business**.
5. Pega la URL del worker.
6. Pega la API key.
7. Toca **Guardar** y luego **Probar conexión**.

## Rutas cargadas
- Bachillerato - Parte 1
- Bachillerato - Parte 2
- Primaria
- Transición

## Estudiantes cargados
Se incluyeron los estudiantes que compartiste para Bachillerato - Parte 1.

## Nota importante
La web sola no puede guardar el token privado de WhatsApp. Por eso el envío real en Business se hace por el backend.
