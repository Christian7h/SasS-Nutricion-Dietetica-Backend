# Sistema de Registro de Pacientes

## 🎯 Funcionalidades Implementadas

### ✅ Registro Completo de Pacientes
- **Selección de nutricionista** - Los pacientes pueden elegir su nutricionista
- **Datos básicos** - Nombre, email, contraseña
- **Datos antropométricos** - Peso, altura (con cálculo automático de IMC)
- **Información personal** - Teléfono, fecha de nacimiento, género, dirección
- **Validaciones robustas** - Validación de todos los campos de entrada
- **Autenticación automática** - Token JWT generado al registrarse

## 📋 APIs Disponibles

### 1. Obtener Nutricionistas Disponibles
```
GET /api/auth/nutritionists
```

**Respuesta:**
```json
{
  "success": true,
  "nutritionists": [
    {
      "id": "68b5cedeff0cbca15221bc7d",
      "name": "Cristian Villalobos",
      "email": "cristianvillalobos666@gmail.com",
      "specialties": ["Nutrición Deportiva", "Pérdida de peso"],
      "license": "12345",
      "hasAvailability": true
    }
  ]
}
```

### 2. Registrar Paciente
```
POST /api/auth/register/patient
```

**Datos requeridos:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "123456",
  "nutritionistId": "68b5cedeff0cbca15221bc7d"
}
```

**Datos opcionales:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com", 
  "password": "123456",
  "nutritionistId": "68b5cedeff0cbca15221bc7d",
  "profile": {
    "phone": "+56912345678",
    "birthDate": "1990-05-15",
    "gender": "male",
    "weight": 75,
    "height": 175,
    "address": "Av. Providencia 123, Santiago",
    "medicalHistory": "Sin antecedentes relevantes"
  }
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Paciente registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "patient": {
    "id": "68bf8d408a3923ae190c9ab6",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "patient",
    "profile": {
      "weight": 75,
      "height": 175,
      "imc": 24.49,
      "registrationDate": "2024-01-01T10:00:00.000Z"
    },
    "nutritionist": {
      "id": "68b5cedeff0cbca15221bc7d",
      "name": "Cristian Villalobos",
      "email": "cristianvillalobos666@gmail.com",
      "specialties": ["Nutrición Deportiva"]
    }
  }
}
```

## 🛡️ Validaciones Implementadas

### Datos Básicos:
- **Nombre:** Mínimo 2 caracteres
- **Email:** Formato válido y único en el sistema
- **Contraseña:** Mínimo 6 caracteres
- **Nutricionista:** Debe ser un ID válido de nutricionista activo

### Datos del Perfil:
- **Teléfono:** Formato internacional válido (opcional)
- **Peso:** Entre 1 y 1000 kg (opcional)
- **Altura:** Entre 1 y 300 cm (opcional)
- **Fecha de nacimiento:** Edad entre 5 y 120 años (opcional)
- **Género:** 'male', 'female', 'other' (opcional)

### Validaciones Automáticas:
- **Email duplicado** - Previene registros con emails existentes
- **Nutricionista válido** - Verifica que existe y está activo
- **Cálculo de IMC** - Se calcula automáticamente si se proporciona peso y altura
- **Sanitización** - Limpia y formatea datos de entrada

## 🔄 Flujo de Registro Frontend

```javascript
// 1. Obtener lista de nutricionistas
const getNutritionists = async () => {
  const response = await axios.get('/api/auth/nutritionists');
  return response.data.nutritionists;
};

// 2. Registrar paciente
const registerPatient = async (patientData) => {
  try {
    const response = await axios.post('/api/auth/register/patient', {
      name: patientData.name,
      email: patientData.email,
      password: patientData.password,
      nutritionistId: patientData.selectedNutritionist,
      profile: {
        phone: patientData.phone,
        birthDate: patientData.birthDate,
        gender: patientData.gender,
        weight: patientData.weight,
        height: patientData.height,
        address: patientData.address
      }
    });

    if (response.data.success) {
      // Guardar token en localStorage
      localStorage.setItem('token', response.data.token);
      
      // Redirigir al dashboard del paciente
      window.location.href = '/patient/dashboard';
      
      return response.data.patient;
    }
  } catch (error) {
    console.error('Error registrando paciente:', error.response.data);
    return { errors: error.response.data.errors };
  }
};
```

## 🎨 Componente de Formulario (React)

```jsx
import React, { useState, useEffect } from 'react';

const PatientRegistrationForm = () => {
  const [nutritionists, setNutritionists] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    nutritionistId: '',
    profile: {
      phone: '',
      birthDate: '',
      gender: '',
      weight: '',
      height: '',
      address: ''
    }
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar nutricionistas al montar el componente
    loadNutritionists();
  }, []);

  const loadNutritionists = async () => {
    try {
      const response = await axios.get('/api/auth/nutritionists');
      setNutritionists(response.data.nutritionists);
    } catch (error) {
      console.error('Error cargando nutricionistas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const response = await axios.post('/api/auth/register/patient', formData);
      
      if (response.data.success) {
        // Guardar token y redirigir
        localStorage.setItem('token', response.data.token);
        window.location.href = '/patient/dashboard';
      }
    } catch (error) {
      setErrors(error.response.data.errors || [error.response.data.message]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="patient-registration-form">
      <h2>Registro de Paciente</h2>
      
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((error, index) => (
            <div key={index} className="error">{error}</div>
          ))}
        </div>
      )}

      {/* Datos básicos */}
      <div className="form-group">
        <label htmlFor="name">Nombre completo *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Contraseña *</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>

      {/* Selección de nutricionista */}
      <div className="form-group">
        <label htmlFor="nutritionistId">Selecciona tu nutricionista *</label>
        <select
          id="nutritionistId"
          name="nutritionistId"
          value={formData.nutritionistId}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona un nutricionista</option>
          {nutritionists.map(nutritionist => (
            <option key={nutritionist.id} value={nutritionist.id}>
              {nutritionist.name} {nutritionist.specialties.length > 0 && 
                `- ${nutritionist.specialties.join(', ')}`}
            </option>
          ))}
        </select>
      </div>

      {/* Datos opcionales */}
      <h3>Información adicional (opcional)</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="profile.weight">Peso (kg)</label>
          <input
            type="number"
            id="profile.weight"
            name="profile.weight"
            value={formData.profile.weight}
            onChange={handleChange}
            min="1"
            max="1000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="profile.height">Altura (cm)</label>
          <input
            type="number"
            id="profile.height"
            name="profile.height"
            value={formData.profile.height}
            onChange={handleChange}
            min="1"
            max="300"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="profile.birthDate">Fecha de nacimiento</label>
        <input
          type="date"
          id="profile.birthDate"
          name="profile.birthDate"
          value={formData.profile.birthDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="profile.gender">Género</label>
        <select
          id="profile.gender"
          name="profile.gender"
          value={formData.profile.gender}
          onChange={handleChange}
        >
          <option value="">Seleccionar</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="profile.phone">Teléfono</label>
        <input
          type="tel"
          id="profile.phone"
          name="profile.phone"
          value={formData.profile.phone}
          onChange={handleChange}
          placeholder="+56912345678"
        />
      </div>

      <div className="form-group">
        <label htmlFor="profile.address">Dirección</label>
        <textarea
          id="profile.address"
          name="profile.address"
          value={formData.profile.address}
          onChange={handleChange}
          rows="2"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  );
};

export default PatientRegistrationForm;
```

## 🔐 Características de Seguridad

- **Validación en servidor** - Todas las validaciones se ejecutan en el backend
- **Sanitización de datos** - Limpieza automática de datos de entrada
- **Hash de contraseñas** - Encriptación segura con bcrypt
- **Tokens JWT** - Autenticación segura con expiración
- **Validación de nutricionista** - Verificación de existencia y estado activo

## 📊 Beneficios del Sistema

1. **Auto-registro** - Los pacientes pueden registrarse sin intervención del nutricionista
2. **Selección libre** - Los pacientes eligen su nutricionista preferido
3. **Datos completos** - Recolección de información importante desde el inicio
4. **IMC automático** - Cálculo inmediato si se proporcionan peso y altura
5. **Validación robusta** - Prevención de datos inválidos o duplicados
6. **UX fluida** - Token automático para acceso inmediato al sistema

¡El sistema está listo para que los pacientes se registren de forma independiente! 🎉
