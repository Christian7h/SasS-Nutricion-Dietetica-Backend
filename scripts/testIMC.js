const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.DB_URI || 'mongodb://localhost:27017/saas_nutricion')
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const User = require('../src/models/User');

async function testIMCCalculation() {
    try {
        console.log('🧪 Probando cálculo automático de IMC...\n');

        // Buscar un paciente existente o crear uno de prueba
        let testPatient = await User.findOne({ 
            role: 'patient',
            email: 'test-imc@example.com'
        });

        if (!testPatient) {
            console.log('📝 Creando paciente de prueba...');
            testPatient = await User.createUser({
                name: 'Paciente Prueba IMC',
                email: 'test-imc@example.com',
                password: '123456',
                role: 'patient',
                nutritionistId: '68b5cedeff0cbca15221bc7d' // Usar un ID de nutricionista válido
            });
        }

        console.log('👤 Paciente:', testPatient.name);
        console.log('📧 Email:', testPatient.email);
        
        // Caso 1: Actualizar solo peso
        console.log('\n🔬 Caso 1: Actualizando solo peso (70kg)...');
        await testPatient.updateProfile({ weight: 70 });
        console.log('Peso:', testPatient.profile.weight);
        console.log('Altura:', testPatient.profile.height);
        console.log('IMC:', testPatient.profile.imc);

        // Caso 2: Actualizar solo altura
        console.log('\n🔬 Caso 2: Actualizando solo altura (175cm)...');
        await testPatient.updateProfile({ height: 175 });
        console.log('Peso:', testPatient.profile.weight);
        console.log('Altura:', testPatient.profile.height);
        console.log('IMC:', testPatient.profile.imc);
        console.log('Categoría IMC:', testPatient.getIMCCategory());

        // Caso 3: Actualizar ambos
        console.log('\n🔬 Caso 3: Actualizando peso y altura (80kg, 180cm)...');
        await testPatient.updateProfile({ weight: 80, height: 180 });
        console.log('Peso:', testPatient.profile.weight);
        console.log('Altura:', testPatient.profile.height);
        console.log('IMC:', testPatient.profile.imc);
        console.log('Categoría IMC:', testPatient.getIMCCategory());

        // Caso 4: Diferentes categorías de IMC
        console.log('\n🔬 Caso 4: Probando diferentes categorías...');
        
        const testCases = [
            { weight: 50, height: 170, expectedCategory: 'Bajo peso' },
            { weight: 65, height: 170, expectedCategory: 'Peso normal' },
            { weight: 75, height: 170, expectedCategory: 'Sobrepeso' },
            { weight: 90, height: 170, expectedCategory: 'Obesidad grado I' },
            { weight: 105, height: 170, expectedCategory: 'Obesidad grado II' },
            { weight: 120, height: 170, expectedCategory: 'Obesidad grado III' }
        ];

        for (const testCase of testCases) {
            await testPatient.updateProfile({ 
                weight: testCase.weight, 
                height: testCase.height 
            });
            
            const imc = testPatient.profile.imc;
            const category = testPatient.getIMCCategory();
            
            console.log(`Peso: ${testCase.weight}kg, Altura: ${testCase.height}cm -> IMC: ${imc} (${category})`);
            
            if (category === testCase.expectedCategory) {
                console.log('  ✅ Categoría correcta');
            } else {
                console.log(`  ❌ Categoría incorrecta. Esperaba: ${testCase.expectedCategory}`);
            }
        }

        console.log('\n🎉 Pruebas de IMC completadas exitosamente!');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
    } finally {
        mongoose.connection.close();
    }
}

// Ejecutar las pruebas
testIMCCalculation();
