const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { startOfDay, endOfDay, startOfWeek, endOfWeek } = require('date-fns');

exports.getDashboardStats = async (req, res) => {
    try {
        const nutritionistId = req.user._id;
        const today = new Date();

        // Obtener total de pacientes
        const totalPatients = await User.countDocuments({
            role: 'patient',
            nutritionistId
        });

        // Obtener citas de hoy
        const todayAppointments = await Appointment.countDocuments({
            nutritionistId,
            date: {
                $gte: startOfDay(today),
                $lte: endOfDay(today)
            }
        });

        // Obtener citas de la semana
        const weekAppointments = await Appointment.countDocuments({
            nutritionistId,
            date: {
                $gte: startOfWeek(today),
                $lte: endOfWeek(today)
            }
        });

        // Obtener citas completadas
        const completedAppointments = await Appointment.countDocuments({
            nutritionistId,
            status: 'completed'
        });

        // Obtener datos adicionales
        const recentAppointments = await Appointment.find({
            nutritionistId,
            date: { $gte: today }
        })
        .populate('patientId', 'name email')
        .sort({ date: 1 })
        .limit(5);

        const appointmentsByStatus = await Appointment.aggregate([
            { $match: { nutritionistId } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);
        
        //obtener link de reunion de google meet
        const googleMeetLinks =  await Appointment.find({
            nutritionistId,
            googleMeetLink: { $ne: null }
        }).select('googleMeetLink -_id');
        

        res.json({
            success: true,
            stats: {
                totalPatients,
                todayAppointments,
                weekAppointments,
                completedAppointments,
                appointmentsByStatus,
                recentAppointments,
                googleMeetLinks
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

