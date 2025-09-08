#!/usr/bin/env node

/**
 * Script para enviar recordatorios diarios de citas
 * Este script debe ejecutarse diariamente, preferiblemente por la noche
 * para enviar recordatorios de citas del día siguiente
 */

require('dotenv').config();
const mongoose = require('mongoose');
const appointmentService = require('../src/services/appointmentService');

async function sendDailyReminders() {
    try {
        console.log('🚀 Iniciando envío de recordatorios diarios...');
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a la base de datos');

        // Enviar recordatorios
        const result = await appointmentService.sendDailyReminders();
        
        console.log('📊 Resultados:');
        console.log(`- Total de citas para mañana: ${result.totalAppointments}`);
        console.log(`- Recordatorios enviados exitosamente: ${result.results?.filter(r => r.success).length || 0}`);
        console.log(`- Recordatorios fallidos: ${result.results?.filter(r => !r.success).length || 0}`);

        if (result.results?.length > 0) {
            console.log('\n📧 Detalle de envíos:');
            result.results.forEach(item => {
                const status = item.success ? '✅' : '❌';
                console.log(`  ${status} ${item.patientEmail} - Cita: ${item.appointmentId}`);
                if (!item.success && item.error) {
                    console.log(`      Error: ${item.error}`);
                }
            });
        }

        console.log('\n🎉 Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error enviando recordatorios:', error.message);
        process.exit(1);
    } finally {
        // Cerrar conexión a la base de datos
        await mongoose.connection.close();
        console.log('🔌 Conexión a la base de datos cerrada');
    }
}

// Ejecutar script si es llamado directamente
if (require.main === module) {
    sendDailyReminders();
}

module.exports = sendDailyReminders;
