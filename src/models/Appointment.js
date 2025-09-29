const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
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
    status: {   
        type: String,
        enum: ['pending', 'scheduled', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['consultation', 'follow-up', 'evaluation'],
        default: 'consultation'
    },
    reason: {
        type: String,
        trim: true
    },
    notes: {
        type: String
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date
    },
    googleCalendarEventId: {
        type: String
    },
    googleCalendarEventLink: {
        type: String
    },
    googleMeetLink: {
        type: String
    },
    emailNotificationSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Índices para optimizar consultas
appointmentSchema.index({ patientId: 1, date: 1 });
appointmentSchema.index({ nutritionistId: 1, date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: 1, time: 1 });

// Middleware para actualizar respondedAt cuando cambia el status
appointmentSchema.pre('save', function(next) {
    if (this.isModified('status') && ['scheduled', 'rejected'].includes(this.status)) {
        this.respondedAt = new Date();
    }
    next();
});

// Métodos estáticos originales
appointmentSchema.statics.createAppointment = async function(appointmentData) {
    try {
        const appointment = new this(appointmentData);
        return await appointment.save();
    } catch (error) {
        throw new Error(`Error al crear la cita: ${error.message}`);
    }
};

appointmentSchema.statics.updateAppointment = async function(appointmentId, updatedData) {
    try {
        return await this.findByIdAndUpdate(
            appointmentId,
            updatedData,
            { new: true, runValidators: true }
        );
    } catch (error) {
        throw new Error(`Error al actualizar la cita: ${error.message}`);
    }
};

appointmentSchema.statics.cancelAppointment = async function(appointmentId) {
    try {
        return await this.findByIdAndUpdate(
            appointmentId,
            { status: 'cancelled' },
            { new: true }
        );
    } catch (error) {
        throw new Error(`Error al cancelar la cita: ${error.message}`);
    }
};

// Nuevo método estático para verificar disponibilidad
appointmentSchema.statics.checkAvailability = async function(nutritionistId, date, time, excludeId = null) {
    try {
        const query = {
            nutritionistId: nutritionistId,
            date: date,
            time: time,
            status: { $in: ['pending', 'scheduled'] }
        };
        
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        
        const existingAppointment = await this.findOne(query);
        return !existingAppointment;
    } catch (error) {
        throw new Error(`Error al verificar disponibilidad: ${error.message}`);
    }
};

// Nuevo método estático para solicitar cita
appointmentSchema.statics.requestAppointment = async function(appointmentData) {
    try {
        const appointmentRequest = new this({
            ...appointmentData,
            status: 'pending',
            requestedAt: new Date()
        });
        return await appointmentRequest.save();
    } catch (error) {
        throw new Error(`Error al solicitar la cita: ${error.message}`);
    }
};

// Nuevo método estático para aprobar cita
appointmentSchema.statics.approveAppointment = async function(appointmentId, notes = null) {
    try {
        const updateData = { 
            status: 'scheduled',
            respondedAt: new Date()
        };
        if (notes) {
            updateData.notes = notes;
        }
        
        return await this.findByIdAndUpdate(
            appointmentId,
            updateData,
            { new: true, runValidators: true }
        );
    } catch (error) {
        throw new Error(`Error al aprobar la cita: ${error.message}`);
    }
};

// Nuevo método estático para rechazar cita
appointmentSchema.statics.rejectAppointment = async function(appointmentId, rejectionReason) {
    try {
        return await this.findByIdAndUpdate(
            appointmentId,
            { 
                status: 'rejected',
                rejectionReason: rejectionReason,
                respondedAt: new Date()
            },
            { new: true, runValidators: true }
        );
    } catch (error) {
        throw new Error(`Error al rechazar la cita: ${error.message}`);
    }
};

// Métodos de instancia originales
appointmentSchema.methods.isScheduled = function() {
    return this.status === 'scheduled';
};

appointmentSchema.methods.complete = async function() {
    this.status = 'completed';
    return await this.save();
};

// Nuevos métodos de instancia
appointmentSchema.methods.isPending = function() {
    return this.status === 'pending';
};

appointmentSchema.methods.isRejected = function() {
    return this.status === 'rejected';
};

appointmentSchema.methods.isFuture = function() {
    if (!this.date || !this.time) return false;
    
    const [hours, minutes] = this.time.split(':');
    const appointmentDateTime = new Date(this.date);
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return appointmentDateTime > new Date();
};

// Virtual para calcular fecha y hora completa
appointmentSchema.virtual('dateTime').get(function() {
    if (!this.date || !this.time) return null;
    
    const [hours, minutes] = this.time.split(':');
    const dateTime = new Date(this.date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return dateTime;
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
