const axios = require('axios');

async function testIntegrations() {
    try {
        console.log('🧪 Probando estado de integraciones...\n');

        // Test de estado de servicios
        const statusResponse = await axios.get('http://localhost:3000/api/appointments/integrations/status', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWY5YjFkNzg1ZTM1YTRmZDI5ODg2YyIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJlbWFpbCI6Im51dHJpY2lvbmlzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczNDc1NjQ0NiwiZXhwIjoxNzM0ODQyODQ2fQ.AzQqJAhOT8f78CUpqVqLpT4VEhpwmhKWcf8DqzuHWZE'
            }
        });

        console.log('📊 Estado de servicios:');
        console.log(JSON.stringify(statusResponse.data, null, 2));

        // Test de creación de cita
        console.log('\n🏥 Probando creación de cita...\n');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const appointmentData = {
            date: tomorrow.toISOString().split('T')[0],
            time: '10:00',
            patientId: '67506da75fb9b66c5ddc123d', // Usar un ID válido de tu base de datos
            nutritionistId: '675f9b1d785e35a4fd29886c',
            notes: 'Cita de prueba para probar Google Calendar'
        };

        const createResponse = await axios.post('http://localhost:3000/api/appointments', appointmentData, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWY5YjFkNzg1ZTM1YTRmZDI5ODg2YyIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJlbWFpbCI6Im51dHJpY2lvbmlzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczNDc1NjQ0NiwiZXhwIjoxNzM0ODQyODQ2fQ.AzQqJAhOT8f78CUpqVqLpT4VEhpwmhKWcf8DqzuHWZE',
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Cita creada:');
        console.log(JSON.stringify(createResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testIntegrations();
