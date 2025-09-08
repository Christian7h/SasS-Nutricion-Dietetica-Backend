# Integración con Google Calendar y Notificaciones por Email

Este documento explica cómo configurar y usar las nuevas funcionalidades de integración con Google Calendar y envío de notificaciones por correo electrónico.

## 🚀 Funcionalidades Implementadas

### Google Calendar
- ✅ Creación automática de eventos en Google Calendar
- ✅ Generación automática de enlaces de Google Meet
- ✅ Actualización de eventos cuando se modifica una cita
- ✅ Cancelación de eventos cuando se cancela una cita
- ✅ Invitaciones automáticas a paciente y nutricionista

### Notificaciones por Email
- ✅ Correo de confirmación al crear una cita
- ✅ Correo de cancelación al cancelar una cita
- ✅ Correo de actualización al modificar una cita
- ✅ Recordatorios automáticos 24 horas antes
- ✅ Templates HTML profesionales

## 📋 Configuración Inicial

### 1. Configurar Google Calendar API

#### Paso 1: Crear proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**
4. Ve a "Credenciales" y crea credenciales OAuth 2.0

#### Paso 2: Configurar OAuth 2.0
1. En "Credenciales", crea un "ID de cliente OAuth 2.0"
2. Tipo de aplicación: **Aplicación web**
3. URI de redirección autorizada: `http://localhost:3000/auth/google/callback`
4. Descarga el archivo JSON con las credenciales

#### Paso 3: Variables de entorno
```bash
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

#### Paso 4: Obtener Refresh Token
```bash
npm run setup:google
```
Este comando te guiará para obtener el `GOOGLE_REFRESH_TOKEN`.

### 2. Configurar Email (Gmail)

#### Paso 1: Configurar App Password
1. Ve a tu cuenta de Google
2. Habilita la verificación en dos pasos
3. Ve a "Contraseñas de aplicaciones"
4. Genera una contraseña para "Correo"

#### Paso 2: Variables de entorno
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
```

### 3. Variables de Entorno Completas

Copia `.env.example` a `.env` y configura:

```bash
# Configuración básica
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
MONGODB_URI=mongodb://localhost:27017/saas-nutricion

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🔧 Uso de las APIs

### Crear una Cita

```javascript
POST /api/appointments

{
  "date": "2024-12-15",
  "time": "10:00",
  "patientId": "patient_id",
  "nutritionistId": "nutritionist_id",
  "notes": "Primera consulta"
}

// Respuesta
{
  "success": true,
  "message": "Cita creada con éxito",
  "appointment": {...},
  "integrations": {
    "calendarCreated": true,
    "emailSent": true,
    "meetLink": "https://meet.google.com/abc-defg-hij"
  }
}
```

### Verificar Estado de Servicios

```javascript
GET /api/appointments/integrations/status

// Respuesta
{
  "success": true,
  "services": {
    "googleCalendar": {
      "configured": true,
      "required": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]
    },
    "email": {
      "configured": true,
      "required": ["EMAIL_USER", "EMAIL_PASSWORD"]
    }
  }
}
```

### Enviar Recordatorios Manualmente

```javascript
POST /api/appointments/reminders/daily

// Respuesta
{
  "success": true,
  "message": "Recordatorios procesados",
  "totalAppointments": 5,
  "results": [
    {
      "appointmentId": "...",
      "success": true,
      "patientEmail": "patient@example.com"
    }
  ]
}
```

## 🤖 Automatización

### Recordatorios Diarios

Para enviar recordatorios automáticamente, configura un cron job:

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar todos los días a las 8 PM
0 20 * * * cd /path/to/your/app && npm run reminders:daily
```

O usar un servicio como **node-cron** en tu aplicación:

```javascript
const cron = require('node-cron');

// Ejecutar todos los días a las 8 PM
cron.schedule('0 20 * * *', async () => {
  console.log('Enviando recordatorios diarios...');
  try {
    await appointmentService.sendDailyReminders();
  } catch (error) {
    console.error('Error enviando recordatorios:', error);
  }
});
```

## 📧 Templates de Email

### Confirmación de Cita
- ✅ Información completa de la cita
- ✅ Enlace a Google Calendar
- ✅ Enlace a Google Meet
- ✅ Recomendaciones para el paciente

### Recordatorio
- ✅ Recordatorio 24 horas antes
- ✅ Enlace directo a la videollamada
- ✅ Instrucciones de preparación

### Cancelación
- ✅ Notificación de cancelación
- ✅ Información de contacto para reagendar

## 🔒 Seguridad

- ✅ Todas las APIs requieren autenticación JWT
- ✅ Los tokens de Google se almacenan de forma segura
- ✅ Las contraseñas de email usan App Passwords
- ✅ Validación de permisos por rol de usuario

## 🚨 Manejo de Errores

El sistema está diseñado para ser resiliente:

- Si Google Calendar falla, la cita se crea pero sin evento de calendario
- Si el email falla, la cita se crea pero sin notificación
- Los errores se registran en logs para debugging
- El usuario recibe información sobre qué servicios funcionaron

## 📊 Monitoreo

### Logs
```bash
# Ver logs en tiempo real
npm run dev

# Los logs incluyen:
# - Eventos de Google Calendar creados/actualizados/cancelados
# - Emails enviados/fallidos
# - Errores de configuración
```

### Verificar Estado
```bash
curl http://localhost:3000/api/appointments/integrations/status
```

## 🔧 Troubleshooting

### Google Calendar no funciona
1. Verificar que las variables de entorno estén configuradas
2. Verificar que el refresh token sea válido
3. Verificar que la API de Google Calendar esté habilitada

### Emails no se envían
1. Verificar configuración de Gmail App Password
2. Verificar que las variables EMAIL_USER y EMAIL_PASSWORD estén configuradas
3. Revisar logs para errores específicos

### Citas se crean pero sin integraciones
- Esto es normal si los servicios no están configurados
- Verificar el estado con `/integrations/status`
- Las citas funcionan independientemente de las integraciones

## 📈 Métricas

El sistema registra:
- Número de eventos de calendario creados
- Número de emails enviados exitosamente
- Número de recordatorios procesados diariamente
- Errores y fallos por servicio

## 🔄 Próximas Mejoras

- [ ] Integración con otros proveedores de calendario (Outlook, etc.)
- [ ] Integración con WhatsApp para recordatorios
- [ ] Dashboard de métricas de integraciones
- [ ] Configuración de horarios personalizados para recordatorios
- [ ] Templates de email personalizables por nutricionista
