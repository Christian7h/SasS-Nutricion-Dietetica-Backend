#!/usr/bin/env node

/**
 * Script para obtener el refresh token de Google Calendar
 * Ejecuta este script una sola vez para configurar la autorización
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const OAuth2 = google.auth.OAuth2;

async function setupGoogleAuth() {
    try {
        console.log('🔧 Configuración de autorización de Google Calendar\n');

        // Verificar variables de entorno
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
            console.error('❌ Faltan variables de entorno de Google:');
            console.error('- GOOGLE_CLIENT_ID');
            console.error('- GOOGLE_CLIENT_SECRET');
            console.error('- GOOGLE_REDIRECT_URI');
            console.error('\nConfigúralas en tu archivo .env');
            process.exit(1);
        }

        const oAuth2Client = new OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const scopes = [
            'https://www.googleapis.com/auth/calendar'
        ];

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });

        console.log('📱 Autorización requerida:');
        console.log('1. Abre esta URL en tu navegador:');
        console.log(`\n${authUrl}\n`);
        console.log('2. Autoriza la aplicación');
        console.log('3. Copia el código de autorización que aparece');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const code = await new Promise((resolve) => {
            rl.question('\n4. Pega aquí el código de autorización: ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });

        console.log('\n🔄 Intercambiando código por tokens...');

        const { tokens } = await oAuth2Client.getToken(code);
        
        console.log('✅ Tokens obtenidos exitosamente!');
        console.log('\n📝 Agrega esta línea a tu archivo .env:');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);

        if (!tokens.refresh_token) {
            console.log('\n⚠️  Advertencia: No se obtuvo refresh_token.');
            console.log('   Esto puede suceder si ya autorizaste antes.');
            console.log('   Intenta revocar el acceso y volver a autorizar.');
        }

        console.log('\n🎉 Configuración completada!');

    } catch (error) {
        console.error('❌ Error durante la configuración:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    setupGoogleAuth();
}

module.exports = setupGoogleAuth;
