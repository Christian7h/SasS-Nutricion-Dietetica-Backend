const User = require('../models/User');
const faker = require('faker');

const createUser = async (role) => {
    return await User.createUser({
        name: faker.name.findName(),
        email: faker.internet.email(),
        password: '123456',
        role,
        profile: {
            specialties: role === 'nutritionist' ? ['Deportiva', 'Clínica'] : [],
            availability: role === 'nutritionist' ? [
                {
                    day: 'monday',
                    hours: [{ start: '09:00', end: '17:00' }]
                }
            ] : []
        }
    });
};

exports.seed = async () => {
    const users = {
        nutritionists: [],
        patients: []
    };

    // Crear 5 nutricionistas
    for (let i = 0; i < 5; i++) {
        users.nutritionists.push(await createUser('nutritionist'));
    }

    // Crear 20 pacientes
    for (let i = 0; i < 20; i++) {
        users.patients.push(await createUser('patient'));
    }

    return users;
};