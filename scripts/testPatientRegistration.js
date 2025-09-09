const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

async function testPatientRegistration() {
    try {
        console.log('🧪 Probando registro de pacientes...\n');

        // Paso 1: Obtener lista de nutricionistas disponibles
        console.log('1️⃣ Obteniendo nutricionistas disponibles...');
        const nutritionistsResponse = await axios.get(`${BASE_URL}/nutritionists`);
        
        if (nutritionistsResponse.data.success && nutritionistsResponse.data.nutritionists.length > 0) {
            console.log('✅ Nutricionistas encontrados:');
            nutritionistsResponse.data.nutritionists.forEach((nut, index) => {
                console.log(`   ${index + 1}. ${nut.name} (${nut.email})`);
                if (nut.specialties.length > 0) {
                    console.log(`      Especialidades: ${nut.specialties.join(', ')}`);
                }
            });

            // Usar el primer nutricionista para la prueba
            const selectedNutritionist = nutritionistsResponse.data.nutritionists[0];
            console.log(`\n📝 Seleccionando: ${selectedNutritionist.name}\n`);

            // Paso 2: Registrar paciente con datos completos
            console.log('2️⃣ Registrando paciente con datos completos...');
            const patientData = {
                name: 'Juan Pérez Paciente',
                email: 'juan.paciente@example.com',
                password: '123456',
                nutritionistId: selectedNutritionist.id,
                profile: {
                    phone: '+56912345678',
                    birthDate: '1990-05-15',
                    gender: 'male',
                    weight: 75,
                    height: 175,
                    address: 'Av. Providencia 123, Santiago',
                    medicalHistory: 'Sin antecedentes médicos relevantes'
                }
            };

            const registerResponse = await axios.post(`${BASE_URL}/register/patient`, patientData);
            
            if (registerResponse.data.success) {
                console.log('✅ Paciente registrado exitosamente:');
                console.log(`   ID: ${registerResponse.data.patient.id}`);
                console.log(`   Nombre: ${registerResponse.data.patient.name}`);
                console.log(`   Email: ${registerResponse.data.patient.email}`);
                console.log(`   IMC: ${registerResponse.data.patient.profile.imc || 'No calculado'}`);
                console.log(`   Nutricionista asignado: ${registerResponse.data.patient.nutritionist.name}`);
                console.log(`   Token generado: ${registerResponse.data.token ? 'Sí' : 'No'}`);
            }

            // Paso 3: Probar registro con datos mínimos
            console.log('\n3️⃣ Registrando paciente con datos mínimos...');
            const minimalPatientData = {
                name: 'María González',
                email: 'maria.gonzalez@example.com',
                password: 'password123',
                nutritionistId: selectedNutritionist.id
            };

            const minimalRegisterResponse = await axios.post(`${BASE_URL}/register/patient`, minimalPatientData);
            
            if (minimalRegisterResponse.data.success) {
                console.log('✅ Paciente con datos mínimos registrado:');
                console.log(`   Nombre: ${minimalRegisterResponse.data.patient.name}`);
                console.log(`   Email: ${minimalRegisterResponse.data.patient.email}`);
            }

            // Paso 4: Probar errores de validación
            console.log('\n4️⃣ Probando validaciones de error...');
            
            try {
                await axios.post(`${BASE_URL}/register/patient`, {
                    name: 'A', // Nombre muy corto
                    email: 'email-invalido', // Email inválido
                    password: '123', // Contraseña muy corta
                    nutritionistId: selectedNutritionist.id,
                    profile: {
                        weight: -10, // Peso inválido
                        height: 500 // Altura inválida
                    }
                });
            } catch (error) {
                if (error.response && error.response.data) {
                    console.log('✅ Validaciones funcionando correctamente:');
                    error.response.data.errors?.forEach(err => {
                        console.log(`   ❌ ${err}`);
                    });
                }
            }

            // Paso 5: Probar email duplicado
            console.log('\n5️⃣ Probando email duplicado...');
            try {
                await axios.post(`${BASE_URL}/register/patient`, {
                    name: 'Otro Juan',
                    email: 'juan.paciente@example.com', // Email ya usado
                    password: '123456',
                    nutritionistId: selectedNutritionist.id
                });
            } catch (error) {
                if (error.response && error.response.data) {
                    console.log('✅ Validación de email duplicado:');
                    console.log(`   ❌ ${error.response.data.message}`);
                }
            }

        } else {
            console.log('❌ No se encontraron nutricionistas disponibles');
        }

        console.log('\n🎉 Pruebas de registro de pacientes completadas!');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.response) {
            console.error('Detalles del error:', error.response.data);
        }
    }
}

// Ejecutar las pruebas
testPatientRegistration();
