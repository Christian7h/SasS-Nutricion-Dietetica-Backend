const express = require('express');
const app = require('./app');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Puerto de escucha
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});