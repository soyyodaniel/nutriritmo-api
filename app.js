// app.js
"use strict";

require("dotenv").config();  // Cargar variables de entorno

const express = require("express");
const cors = require("cors");
const db = require("./db");  // Conexión MySQL (pool)

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middlewares globales
// ======================
app.use(cors());
app.use(express.json());

// Logger simple para depuración
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ======================
// Helper para errores de BD
// ======================
function handleDbError(res, err, mensaje = "Error en la base de datos") {
    console.error(mensaje, err);
    return res.status(500).json({ error: mensaje });
}

// ======================
// Ruta principal (estado API)
// ======================
app.get("/", (req, res) => {
    res.json({ message: "API NutriRitmo funcionando ✅" });
});

// ===================================================
//  RUTAS DE AYUNOS (MÓDULO DANIEL ASTUDILLO)
// ===================================================

// Obtener historial de ayunos de un usuario
// GET /api/ayunos/1
app.get("/api/ayunos/:idUsuario", (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario, 10);

    if (isNaN(idUsuario)) {
        return res.status(400).json({ error: "idUsuario debe ser numérico" });
    }
    // Consulta SQL para obtener los ayunos del usuario
    const sql = `
    SELECT id_ayuno, inicio_timestamp, fin_timestamp, duracion_horas, estado
    FROM ayunos
    WHERE id_usuario = ?
    ORDER BY inicio_timestamp DESC
  `;
    // Ejecutar la consulta
    db.query(sql, [idUsuario], (err, results) => {
        if (err) {
            return handleDbError(res, err, "Error al obtener los ayunos");
        }
        res.json(results);
    });
});

// Iniciar un nuevo ayuno
// POST /api/ayunos/iniciar
// BODY: { "id_usuario": 1, "inicio_timestamp": 1700438400000 }
app.post("/api/ayunos/iniciar", (req, res) => {
    const { id_usuario, inicio_timestamp } = req.body;

    if (!id_usuario || !inicio_timestamp) {// Validar datos
        return res.status(400).json({
            error: "Faltan datos: se requiere id_usuario e inicio_timestamp",
        });
    }
    // Consulta SQL para insertar un nuevo ayuno
    const sql = `
    INSERT INTO ayunos (id_usuario, inicio_timestamp, estado)
    VALUES (?, ?, 'activo')
  `;
     // Ejecutar la consulta
    db.query(sql, [id_usuario, inicio_timestamp], (err, result) => {
        if (err) {
            return handleDbError(res, err, "Error al iniciar el ayuno");
        }

        res.status(201).json({
            message: "Ayuno iniciado correctamente",
            id_ayuno: result.insertId,
        });
    });
});

// Detener un ayuno activo
// POST /api/ayunos/detener
// BODY: { "id_ayuno": 10, "fin_timestamp": 1700470000000, "duracion_horas": 14.5 }
app.post("/api/ayunos/detener", (req, res) => {
    const { id_ayuno, fin_timestamp, duracion_horas } = req.body;

    if (!id_ayuno || !fin_timestamp || duracion_horas === undefined) {
        return res.status(400).json({
            error: "Faltan datos: se requiere id_ayuno, fin_timestamp y duracion_horas",
        });
    }

    const sql = `
    UPDATE ayunos
    SET fin_timestamp = ?, duracion_horas = ?, estado = 'completado'
    WHERE id_ayuno = ? AND estado = 'activo'
  `;

    db.query(sql, [fin_timestamp, duracion_horas, id_ayuno], (err, result) => {
        if (err) {
            return handleDbError(res, err, "Error al detener el ayuno");
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "No se encontró un ayuno activo con ese id_ayuno",
            });
        }

        res.json({ message: "Ayuno detenido correctamente" });
    });
});

// ===================================================
// Middleware 404
// ===================================================
app.use((req, res) => {// Manejo de rutas no encontradas
    res.status(404).json({
        error: "Ruta no encontrada",
        path: req.originalUrl,
    });
});

// ===================================================
// Inicialización del servidor
// ===================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor NutriRitmo escuchando en http://localhost:${PORT}`);
});

module.exports = app;// Exportar app para pruebas u otros usos
