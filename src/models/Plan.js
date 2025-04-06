const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    time: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    foods: [{
        name: String,
        portion: String,
        calories: Number,
        proteins: Number,
        carbs: Number,
        fats: Number
    }],
    notes: String
});

const planSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nutritionistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    objectives: [{
        type: String
    }],
    dailyCalories: {
        type: Number,
        required: true
    },
    macroDistribution: {
        proteins: Number,
        carbs: Number,
        fats: Number
    },
    meals: [mealSchema],
    restrictions: [{
        type: String
    }],
    supplements: [{
        name: String,
        dosage: String,
        frequency: String
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Métodos estáticos
planSchema.statics.createPlan = async function(planData) {
    try {
        const plan = new this(planData);
        return await plan.save();
    } catch (error) {
        throw new Error(`Error al crear el plan: ${error.message}`);
    }
};

planSchema.statics.findPatientPlans = async function(patientId) {
    try {
        return await this.find({ patientId }).sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Error al buscar planes del paciente: ${error.message}`);
    }
};

planSchema.statics.findNutritionistPlans = async function(nutritionistId) {
    try {
        return await this.find({ nutritionistId }).sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Error al buscar planes del nutricionista: ${error.message}`);
    }
};

// Métodos de instancia
planSchema.methods.updatePlan = async function(updateData) {
    try {
        Object.assign(this, updateData);
        return await this.save();
    } catch (error) {
        throw new Error(`Error al actualizar el plan: ${error.message}`);
    }
};

planSchema.methods.addMeal = async function(mealData) {
    try {
        this.meals.push(mealData);
        return await this.save();
    } catch (error) {
        throw new Error(`Error al agregar comida: ${error.message}`);
    }
};

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;