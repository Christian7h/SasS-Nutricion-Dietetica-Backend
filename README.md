# SaaS de Nutrición - Backend

Sistema de gestión para nutricionistas y seguimiento de pacientes.

## 🚀 Características

- Gestión de citas
- Planes nutricionales
- Seguimiento de pacientes
- Autenticación y autorización
- Base de datos MongoDB

## 📋 Prerrequisitos

- Node.js >= 14.x
- MongoDB >= 4.x
- npm >= 6.x

## 🔧 Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/saas-nutricion-backend.git
cd saas-nutricion-backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar `.env` con tus configuraciones:
```env
DB_URI=mongodb://localhost:27017/saas_nutricion
JWT_SECRET=tu_secret_key
NODE_ENV=development
```

## 🌱 Seeders

Poblar la base de datos con datos de prueba:

```bash
# Ejecutar seeding
npm run seed

# Limpiar base de datos
npm run seed:clean

# Limpiar y ejecutar seeding
npm run seed:fresh
```

## 🛠️ Desarrollo

Iniciar servidor en modo desarrollo:
```bash
npm run dev
```

## ⚡ Pruebas

Ejecutar pruebas:
```bash
# Todas las pruebas
npm test

# Pruebas específicas
npm test -- tests/appointment.test.js
```

## 📚 API Endpoints

### Citas
- `POST /api/appointments` - Crear cita
- `GET /api/appointments` - Listar citas
- `GET /api/appointments/:id` - Obtener cita
- `PUT /api/appointments/:id` - Actualizar cita
- `DELETE /api/appointments/:id` - Eliminar cita

### Planes Nutricionales
- `POST /api/plans` - Crear plan
- `GET /api/plans` - Listar planes
- `GET /api/plans/:id` - Obtener plan
- `PUT /api/plans/:id` - Actualizar plan
- `POST /api/plans/:id/meals` - Agregar comida
- `DELETE /api/plans/:id/meals/:mealId` - Eliminar comida

## 📁 Estructura del Proyecto

```
saas-nutricion-backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── seeders/
│   └── server.js
├── tests/
├── .env
└── package.json
```

## 🔐 Seguridad

- Autenticación JWT
- Validación de roles
- Sanitización de datos
- Protección contra XSS

## 📄 Licencia

MIT License - ver [LICENSE.md](LICENSE.md)

## ✨ Contribuir

1. Fork el proyecto
2. Crear rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request