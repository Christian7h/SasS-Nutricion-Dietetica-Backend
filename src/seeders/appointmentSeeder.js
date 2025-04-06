const Appointment = require('../models/Appointment');
const faker = require('faker');

const getRandomFutureDate = () => {
    const date = faker.date.future();
    date.setHours(9 + Math.floor(Math.random() * 8)); // Horario de 9:00 a 17:00
    date.setMinutes(0);
    return date;
};

const createAppointment = async (nutritionist, patient) => {
    const date = getRandomFutureDate();
    
    return await Appointment.createAppointment({
        date: date.toISOString().split('T')[0],
        time: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
        patientId: patient._id,
        nutritionistId: nutritionist._id,
        status: faker.random.arrayElement(['scheduled', 'completed', 'cancelled']),
        notes: faker.lorem.paragraph(),
        type: faker.random.arrayElement(['first_visit', 'follow_up', 'control']),
        measurements: {
            weight: faker.random.number({ min: 50, max: 100, precision: 0.1 }),
            height: faker.random.number({ min: 150, max: 190 }),
            bodyFat: faker.random.number({ min: 10, max: 30, precision: 0.1 }),
            musclePercentage: faker.random.number({ min: 20, max: 40, precision: 0.1 })
        }
    });
};

exports.seed = async (users) => {
    const appointments = [];

    // Crear 3 citas por paciente
    for (const patient of users.patients) {
        const nutritionist = users.nutritionists[Math.floor(Math.random() * users.nutritionists.length)];
        
        // Citas pasadas y futuras
        for (let i = 0; i < 3; i++) {
            appointments.push(await createAppointment(nutritionist, patient));
        }
    }

    console.log(`Creadas ${appointments.length} citas`);
    return appointments;
};