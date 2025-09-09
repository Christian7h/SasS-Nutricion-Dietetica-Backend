const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Plan = require('../models/Plan')
exports.getPatients = async (req, res) => {
    try {
        console.log('Buscando pacientes para nutricionista:', req.user._id);

        if (req.user.role !== 'nutritionist') {
            return res.status(403).json({
                success: false,
                message: 'No autorizado - Solo nutricionistas pueden ver pacientes'
            });
        }

        const patients = await User.findPatientsByNutritionistId(req.user._id);
        console.log('Pacientes encontrados:', patients);

        res.json({
            success: true,
            patients
        });
    } catch (error) {
        console.error('Error en getPatients:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pacientes',
            error: error.message
        });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const patient = await User.findOne({
            _id: req.params.id,
            role: 'patient',
            nutritionistId: req.user._id
        }).select('-password');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el paciente',
            error: error.message
        });
    }
};

exports.createPatient = async (req, res) => {
    try {
        if (req.user.role !== 'nutritionist') {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        const { name, email, phone, birthDate, medicalNotes, weight, height} = req.body;
        const password = '123456'; // Contraseña por defecto

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        const patient = await User.createUser({
            name,
            email,
            password,
            role: 'patient',
            nutritionistId: req.user._id,
            profile: {
                phone,
                birthDate,
                medicalNotes,
                weight,
                height,
                imc: null
            }
        });

        res.status(201).json({
            success: true,
            patient: {
                _id: patient._id,
                name: patient.name,
                email: patient.email,
                profile: patient.profile
            }
        });
    } catch (error) {
        console.error('Error al crear paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el paciente',
            error: error.message
        });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { name, phone, birthDate, medicalNotes, weight, height } = req.body;

        // Preparar datos de actualización
        const updateData = {
            name,
            'profile.phone': phone,
            'profile.birthDate': birthDate,
            'profile.medicalNotes': medicalNotes
        };

        // Agregar peso y altura si se proporcionan
        if (weight !== undefined) {
            updateData['profile.weight'] = weight;
        }
        if (height !== undefined) {
            updateData['profile.height'] = height;
        }

        const patient = await User.findOneAndUpdate(
            {
                _id: req.params.id,
                role: 'patient',
                nutritionistId: req.user._id
            },
            updateData,
            { new: true }
        ).select('-password');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Si se actualizó peso o altura, recalcular IMC manualmente
        if (weight !== undefined || height !== undefined) {
            try {
                patient.calculateIMC();
                await patient.save();
            } catch (imcError) {
                console.log('Error calculando IMC:', imcError.message);
            }
        }

        res.json({
            success: true,
            patient,
            message: patient.profile.imc ? 
                `Paciente actualizado. IMC: ${patient.profile.imc} (${patient.getIMCCategory()})` : 
                'Paciente actualizado'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el paciente',
            error: error.message
        });
    }
};

exports.deletePatient = async (req, res) => {
    try {
        const patient = await User.findOneAndDelete({
            _id: req.params.id,
            role: 'patient',
            nutritionistId: req.user._id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Paciente eliminado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el paciente',
            error: error.message
        });
    }
};


exports.getAppointmentsByPatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const appointments = await Appointment.find({
            patientId,
            nutritionistId: req.user._id
        }).sort({ date: 1, time: 1 });
        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las citas del paciente',
            error: error.message
        });
    }
};

exports.getPlansByPatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const plans = await Plan.find({
            patientId,
            nutritionistId: req.user._id
        });
        res.json({
            success: true,
            plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener los planes del paciente',
            error: error.message
        });
    }
};

// Nueva función para actualizar datos antropométricos
exports.updatePatientAnthropometrics = async (req, res) => {
    try {
        const { weight, height } = req.body;

        // Validar que al menos uno de los valores esté presente
        if (weight === undefined && height === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar al menos peso o altura'
            });
        }

        // Encontrar el paciente
        const patient = await User.findOne({
            _id: req.params.id,
            role: 'patient',
            nutritionistId: req.user._id
        }).select('-password');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Actualizar valores usando el método updateProfile para aprovechar las validaciones
        const updateData = {};
        if (weight !== undefined) updateData.weight = weight;
        if (height !== undefined) updateData.height = height;

        await patient.updateProfile(updateData);

        res.json({
            success: true,
            patient,
            anthropometrics: {
                weight: patient.profile.weight,
                height: patient.profile.height,
                imc: patient.profile.imc,
                imcCategory: patient.getIMCCategory()
            },
            message: `Datos antropométricos actualizados. IMC: ${patient.profile.imc} (${patient.getIMCCategory()})`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar datos antropométricos',
            error: error.message
        });
    }
};
