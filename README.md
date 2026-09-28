# Integración Kommo CRM ⇄ Signy Riscos (Middleware Serverless)

Este proyecto es una función Serverless lista para ser desplegada en **Vercel** que conecta en tiempo real los prospectos (leads) de **Kommo CRM** con la plataforma **Signy Riscos**.

---

## 🚀 ¿Cómo funciona?

1. **Kommo** dispara un Webhook cuando un lead entra o cambia de etapa.
2. El middleware consulta los datos completos del lead y su contacto asociado en Kommo.
3. Extrae y valida:
   - **Teléfono / Correo:** Limpia el teléfono asegurando al menos 10 dígitos.
   - **Asesor:** Mapea el usuario responsable de Kommo con el usuario de Signy (`Estrella.Cruz`, `Daniela.Martinez`, `carolina.sanchez`, `jehosua.luna`).
   - **Origen:** Homologa fuentes (`Facebook`, `Instagram`, `Whatsapp`, `Página Web`, etc.).
   - **Desarrollo:** Homologa el catálogo de desarrollos (`CONDESA`, `INTERCITY I`, `ALLEGRO III`, etc.).
4. Realiza una petición HTTPS POST segura con el token oficial de Signy.
5. Escribe automáticamente una **Nota interna en el Lead de Kommo** confirmando la sincronización o alertando si hubo algún error.

---

## 📦 Instrucciones para Desplegar en Vercel (Paso a Paso)

### Opción 1: Subiendo a GitHub (La más recomendada)
1. Ve a [github.com](https://github.com) y crea un nuevo repositorio (puedes llamarlo `integracion-signy-kommo`).
2. Sube los archivos de esta carpeta (`package.json`, `vercel.json` y la carpeta `api/`).
3. Entra a tu cuenta en [vercel.com](https://vercel.com).
4. Haz clic en **"Add New..." ➔ "Project"**.
5. Selecciona el repositorio de GitHub que acabas de crear y haz clic en **"Deploy"**.
6. ¡Listo! Vercel te dará una URL pública (ejemplo: `https://integracion-signy-kommo.vercel.app`).

### Opción 2: Sin GitHub (Vercel CLI)
Si prefieres no usar GitHub, puedes instalar la herramienta oficial de Vercel en cualquier terminal:
```bash
npm install -g vercel
vercel
```
Sigue las preguntas en pantalla y te entregará tu URL al instante.

---

## ⚙️ Configuración del Webhook en Kommo CRM

Una vez que tengas tu URL de Vercel (ej: `https://tu-proyecto.vercel.app/api/webhook`):

1. Entra a **Kommo CRM** y ve a tu embudo **"Secuencia de Venta"**.
2. Haz clic en **"Automatizar"** (o "Ajustes del embudo").
3. En la columna de la etapa donde quieras que el lead se sincronice con Signy (por ejemplo: *Perfilamiento* o *Cita agendada*):
   - Haz clic en un espacio vacío para añadir un disparador.
   - Selecciona **"Enviar webhook"**.
   - Pega tu URL de Vercel: `https://tu-proyecto.vercel.app/api/webhook`.
   - Haz clic en **Guardar**.
4. ¡Listo! Cada vez que un lead llegue a esa etapa, se enviará automáticamente a Signy y verás la nota de confirmación en el lead.
