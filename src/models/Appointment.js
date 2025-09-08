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
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: {
        type: String
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

// Métodos estáticos
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

// Métodos de instancia
appointmentSchema.methods.isScheduled = function() {
    return this.status === 'scheduled';
};

appointmentSchema.methods.complete = async function() {
    this.status = 'completed';
    return await this.save();
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;