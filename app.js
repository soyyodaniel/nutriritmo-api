// app.js
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middlewares globales
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simple
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
// Rutas
// ======================
app.use("/api/auth", authRoutes);

// ✅ PING (prueba de conexión desde Android)
app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

// Estado API
app.get("/", (req, res) => {
  res.json({ message: "API NutriRitmo funcionando ✅" });
});

// ===================================================
// RUTAS DE AYUNOS
// ===================================================

// GET /api/ayunos/:idUsuario
app.get("/api/ayunos/:idUsuario", (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: "idUsuario debe ser numérico" });
  }

  const sql = `
    SELECT id_ayuno, inicio_timestamp, fin_timestamp, duracion_horas, estado
    FROM ayunos
    WHERE id_usuario = ?
    ORDER BY inicio_timestamp DESC
  `;

  db.query(sql, [idUsuario], (err, results) => {
    if (err) return handleDbError(res, err, "Error al obtener los ayunos");
    res.json(results);
  });
});

// POST /api/ayunos/iniciar
app.post("/api/ayunos/iniciar", (req, res) => {
  const { id_usuario, inicio_timestamp } = req.body || {};

  if (!id_usuario || isNaN(id_usuario) || !inicio_timestamp) {
    return res.status(400).json({
      error:
        "Faltan datos: se requiere id_usuario e inicio_timestamp, y id_usuario debe ser numérico",
    });
  }

  const sql = `
    INSERT INTO ayunos (id_usuario, inicio_timestamp, estado)
    VALUES (?, ?, 'activo')
  `;

  db.query(sql, [id_usuario, inicio_timestamp], (err, result) => {
    if (err) return handleDbError(res, err, "Error al iniciar el ayuno");

    res.status(201).json({
      message: "Ayuno iniciado correctamente",
      id_ayuno: result.insertId,
    });
  });
});

// POST /api/ayunos/detener
app.post("/api/ayunos/detener", (req, res) => {
  const { id_ayuno, fin_timestamp, duracion_horas } = req.body || {};

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
    if (err) return handleDbError(res, err, "Error al detener el ayuno");

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "No se encontró un ayuno activo con ese id_ayuno",
      });
    }

    res.json({ message: "Ayuno detenido correctamente" });
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada", path: req.originalUrl });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor NutriRitmo escuchando en http://localhost:${PORT}`);
});

module.exports = app;