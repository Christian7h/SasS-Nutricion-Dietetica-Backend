const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const planRoutes = require('./routes/planRoutes');
const patientRoutes = require('./routes/patientRoutes');
const statsRoutes = require('./routes/statsRoutes');

const connectDB = require('./config/db');


// bd
connectDB();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());



// rut
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/stats', statsRoutes);


//handle err
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
    });
});

module.exports = app;