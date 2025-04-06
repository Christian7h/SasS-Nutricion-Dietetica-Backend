const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['patient', 'nutritionist', 'admin'],
        default: 'patient'
    },
    profile: {
        phone: String,
        address: String,
        birthDate: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'other']
        },
        // Campos específicos para nutricionistas
        license: String,
        specialties: [String],
        availability: [{
            day: {
                type: String,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            hours: [{
                start: String,
                end: String
            }]
        }]
    },
    nutritionistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.role === 'patient';
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware para hashear password antes de guardar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Método para generar token JWT
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            id: this._id,
            role: this.role,
            email: this.email 
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '24h' }
    );
};

// Métodos estáticos
userSchema.statics.createUser = async function(userData) {
    try {
        const user = new this(userData);
        return await user.save();
    } catch (error) {
        throw new Error(`Error al crear usuario: ${error.message}`);
    }
};

userSchema.statics.findUserByEmail = async function(email) {
    try {
        return await this.findOne({ email });
    } catch (error) {
        throw new Error(`Error al buscar usuario: ${error.message}`);
    }
};

userSchema.statics.findNutritionists = async function() {
    try {
        return await this.find({ role: 'nutritionist', active: true });
    } catch (error) {
        throw new Error(`Error al buscar nutricionistas: ${error.message}`);
    }
};

// Agregar método estático para buscar pacientes de un nutricionista
userSchema.statics.findPatientsByNutritionistId = async function(nutritionistId) {
    try {
        return await this.find({ 
            role: 'patient',
            nutritionistId: nutritionistId,
            active: true 
        }).select('-password');
    } catch (error) {
        throw new Error(`Error al buscar pacientes: ${error.message}`);
    }
};

// Método para actualizar perfil
userSchema.methods.updateProfile = async function(profileData) {
    try {
        // Validar género si se proporciona
        if (profileData.gender && !['male', 'female', 'other'].includes(profileData.gender)) {
            throw new Error('Género inválido');
        }

        // Validar días de disponibilidad si se proporcionan
        if (profileData.availability) {
            const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            profileData.availability.forEach(slot => {
                if (!validDays.includes(slot.day)) {
                    throw new Error('Día de disponibilidad inválido');
                }
            });
        }

        // Actualizar solo los campos proporcionados
        if (!this.profile) {
            this.profile = {};
        }

        Object.keys(profileData).forEach(key => {
            this.profile[key] = profileData[key];
        });

        await this.save();
        return this;
    } catch (error) {
        throw new Error(`Error al actualizar perfil: ${error.message}`);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;