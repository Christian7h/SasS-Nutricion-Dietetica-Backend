const Plan = require('../models/Plan');
const faker = require('faker');

const createPlan = async (nutritionist, patient) => {
    const startDate = faker.date.future();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    return await Plan.createPlan({
        patientId: patient._id,
        nutritionistId: nutritionist._id,
        title: `Plan de ${faker.random.words(2)}`,
        startDate,
        endDate,
        dailyCalories: faker.random.number({ min: 1500, max: 3000 }),
        objectives: ['Pérdida de peso', 'Mejora de hábitos'],
        meals: [
            {
                time: '08:00',
                name: 'Desayuno',
                foods: [{
                    name: 'Avena con frutas',
                    portion: '1 taza',
                    calories: 300
                }]
            }
        ]
    });
};

exports.seed = async (users) => {
    const plans = [];

    // Crear 2 planes por paciente
    for (const patient of users.patients) {
        const nutritionist = users.nutritionists[Math.floor(Math.random() * users.nutritionists.length)];
        plans.push(await createPlan(nutritionist, patient));
        plans.push(await createPlan(nutritionist, patient));
    }

    return plans;
};