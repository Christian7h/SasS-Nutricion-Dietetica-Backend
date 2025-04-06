require('dotenv').config();

const mongoose = require('mongoose');

const config = {
    development: {
        uri: process.env.DB_URI || 'mongodb://localhost:27017/saas_nutricion'
    },
    test: {
        uri: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/nutricion-saas-test'
    },
    production: {
        uri: process.env.DB_URI
    }
};

const connectDB = async () => {
    try {
        if (process.env.NODE_ENV === 'test') {
            return; // No conectar en modo test
        }

        await mongoose.connect(config[process.env.NODE_ENV || 'development'].uri);
        console.log('MongoDB conectado exitosamente');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;