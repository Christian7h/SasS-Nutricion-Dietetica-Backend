const mongoose = require('mongoose');
const config = require('../config/db');
const userSeeder = require('./userSeeder');
const planSeeder = require('./planSeeder');
const appointmentSeeder = require('./appointmentSeeder');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log('Conectado a MongoDB para seeding...');

        // Limpiar la base de datos
        await mongoose.connection.dropDatabase();
        console.log('Base de datos limpiada');

        // Ejecutar seeders
        const users = await userSeeder.seed();
        console.log('Usuarios creados');

        await planSeeder.seed(users);
        console.log('Planes nutricionales creados');

        await appointmentSeeder.seed(users);
        console.log('Citas creadas');

        console.log('¡Seeding completado exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('Error durante el seeding:', error);
        process.exit(1);
    }
};

seedDatabase();