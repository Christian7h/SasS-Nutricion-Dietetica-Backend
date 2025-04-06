const User = require('../models/User');

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

        const { name, email, phone, birthDate, medicalNotes } = req.body;
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
                medicalNotes
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
        const { name, phone, birthDate, medicalNotes } = req.body;

        const patient = await User.findOneAndUpdate(
            {
                _id: req.params.id,
                role: 'patient',
                nutritionistId: req.user._id
            },
            {
                name,
                phone,
                'profile.birthDate': birthDate,
                'profile.medicalNotes': medicalNotes
            },
            { new: true }
        ).select('-password');

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