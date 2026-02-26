// app.js
"use strict";

<<<<<<< HEAD
require("dotenv").config();

const express = require("express");// Framework web para Node.js
const cors = require("cors");// Middleware para permitir CORS (Cross-Origin Resource Sharing)
const db = require("./db");// Conexión a la base de datos

const authRoutes = require("./routes/auth");// Rutas de autenticación (registro, login)
=======
require("dotenv").config();  // Cargar variables de entorno

const express = require("express");
const cors = require("cors");
const db = require("./db");  // Conexión MySQL (pool)
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middlewares globales
// ======================
app.use(cors());
app.use(express.json());

<<<<<<< HEAD
app.use(express.urlencoded({ extended: true }));

// Logger simple para depuración (opcional pero útil)
=======
// Logger simple para depuración
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ======================
<<<<<<< HEAD
// Rutas
// ======================
app.use("/api/auth", authRoutes);

// ======================
=======
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
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
<<<<<<< HEAD
//  RUTAS DE AYUNOS
// ===================================================
app.use("/api/auth", authRoutes);

// ✅ PING (prueba de conexión desde Android)
app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});


// ======================
// Ruta principal (estado API)
// ======================
app.get("/", (req, res) => {
    res.json({ message: "API NutriRitmo funcionando ✅" });
});


// GET /api/ayunos/1
app.get("/api/ayunos/:idUsuario", (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario, 10);// Validar que idUsuario sea un número válido
    
    if (isNaN(idUsuario)) {// Si no es un número, devolver un error 400
        return res.status(400).json({ error: "idUsuario debe ser numérico" });
    }
    // Validar que el usuario exista antes de consultar sus ayunos (opcional pero recomendado)
=======
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
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
    const sql = `
    SELECT id_ayuno, inicio_timestamp, fin_timestamp, duracion_horas, estado
    FROM ayunos
    WHERE id_usuario = ?
    ORDER BY inicio_timestamp DESC
  `;
<<<<<<< HEAD
    // Este endpoint devuelve todos los ayunos del usuario, ordenados por fecha de inicio (más recientes primero)
    db.query(sql, [idUsuario], (err, results) => {
        if (err) return handleDbError(res, err, "Error al obtener los ayunos");
=======
    // Ejecutar la consulta
    db.query(sql, [idUsuario], (err, results) => {
        if (err) {
            return handleDbError(res, err, "Error al obtener los ayunos");
        }
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
        res.json(results);
    });
});

<<<<<<< HEAD
// POST /api/ayunos/iniciar
app.post("/api/ayunos/iniciar", (req, res) => {
    const { id_usuario, inicio_timestamp } = req.body || {};

    if (!id_usuario || isNaN(id_usuario) || !inicio_timestamp) {
        return res.status(400).json({
            error:
                "Faltan datos: se requiere id_usuario e inicio_timestamp, y id_usuario debe ser numérico",
        });
    }
    // Validar que no haya un ayuno activo para este usuario
    const sql = ` 
    INSERT INTO ayunos (id_usuario, inicio_timestamp, estado)
    VALUES (?, ?, 'activo')
  `;
    // No es necesario validar manualmente si hay un ayuno activo, ya que el estado 'activo' se asigna al crear el ayuno. Si se desea evitar múltiples ayunos activos, se podría agregar una restricción en la base de datos o realizar una consulta previa para verificarlo.
    db.query(sql, [id_usuario, inicio_timestamp], (err, result) => {
        if (err) return handleDbError(res, err, "Error al iniciar el ayuno");
=======
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
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9

        res.status(201).json({
            message: "Ayuno iniciado correctamente",
            id_ayuno: result.insertId,
        });
    });
});

<<<<<<< HEAD
// POST /api/ayunos/detener
app.post("/api/ayunos/detener", (req, res) => {
    const { id_ayuno, fin_timestamp, duracion_horas } = req.body || {};
=======
// Detener un ayuno activo
// POST /api/ayunos/detener
// BODY: { "id_ayuno": 10, "fin_timestamp": 1700470000000, "duracion_horas": 14.5 }
app.post("/api/ayunos/detener", (req, res) => {
    const { id_ayuno, fin_timestamp, duracion_horas } = req.body;
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9

    if (!id_ayuno || !fin_timestamp || duracion_horas === undefined) {
        return res.status(400).json({
            error: "Faltan datos: se requiere id_ayuno, fin_timestamp y duracion_horas",
        });
    }
<<<<<<< HEAD
    // Validar que el ayuno exista y esté activo antes de actualizarlo
=======

>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
    const sql = `
    UPDATE ayunos
    SET fin_timestamp = ?, duracion_horas = ?, estado = 'completado'
    WHERE id_ayuno = ? AND estado = 'activo'
  `;
<<<<<<< HEAD
    // El WHERE asegura que solo se actualice un ayuno que esté activo, evitando errores si el ID es incorrecto o ya fue detenido
    db.query(sql, [fin_timestamp, duracion_horas, id_ayuno], (err, result) => {
        if (err) return handleDbError(res, err, "Error al detener el ayuno");
=======

    db.query(sql, [fin_timestamp, duracion_horas, id_ayuno], (err, result) => {
        if (err) {
            return handleDbError(res, err, "Error al detener el ayuno");
        }
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9

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
<<<<<<< HEAD
app.use((req, res) => {
=======
app.use((req, res) => {// Manejo de rutas no encontradas
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
    res.status(404).json({
        error: "Ruta no encontrada",
        path: req.originalUrl,
    });
});

// ===================================================
// Inicialización del servidor
// ===================================================
app.listen(PORT, () => {
<<<<<<< HEAD
    console.log(`Servidor NutriRitmo escuchando en http://localhost:${PORT}`);
});

module.exports = app;
=======
    console.log(`🚀 Servidor NutriRitmo escuchando en http://localhost:${PORT}`);
});

module.exports = app;// Exportar app para pruebas u otros usos
>>>>>>> e7768ef7d90bfc8a3338035db001a28f916a5be9
