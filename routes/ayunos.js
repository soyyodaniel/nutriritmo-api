"use strict";

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function validationFailed(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ ok: false, error: "Datos inválidos", details: errors.array() });
  return true;
}

function handleDbError(res, err, message = "Error en base de datos") {
  console.error(message, err);
  return res.status(500).json({ ok: false, error: message });
}

function toUnixTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

router.get(
  "/:idUsuario",
  verifyToken,
  [param("idUsuario").isInt({ min: 1 }).withMessage("idUsuario debe ser numérico positivo")],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = Number(req.params.idUsuario);
    if (idUsuario !== req.user.id_usuario) {
      return res.status(403).json({ ok: false, error: "No autorizado para consultar este usuario" });
    }

    const sql = `
      SELECT id_ayuno, inicio_timestamp, fin_timestamp, duracion_horas, objetivo_horas, estado
      FROM ayunos
      WHERE id_usuario = ?
      ORDER BY inicio_timestamp DESC
    `;

    db.query(sql, [idUsuario], (err, rows) => {
      if (err) return handleDbError(res, err, "Error al obtener ayunos");
      return res.json({ ok: true, data: rows });
    });
  }
);

router.post(
  "/iniciar",
  verifyToken,
  [
    body("inicio_timestamp")
      .isISO8601()
      .withMessage("inicio_timestamp debe ser fecha/hora ISO8601")
      .toDate(),
    body("objetivo_horas")
      .isInt({ min: 1, max: 48 })
      .withMessage("objetivo_horas inválido"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = req.user.id_usuario;
    const { inicio_timestamp, objetivo_horas } = req.body;
    const inicioTimestampUnix = toUnixTimestamp(inicio_timestamp);

    if (!inicioTimestampUnix) {
      return res.status(400).json({ ok: false, error: "inicio_timestamp inválido" });
    }

    const sql = `
      INSERT INTO ayunos (id_usuario, inicio_timestamp, objetivo_horas, estado)
      VALUES (?, ?, ?, 'activo')
    `;

    db.query(sql, [idUsuario, inicioTimestampUnix, objetivo_horas], (err, result) => {
      if (err) return handleDbError(res, err, "Error al iniciar ayuno");

      return res.status(201).json({
        ok: true,
        message: "Ayuno iniciado correctamente",
        id_ayuno: result.insertId,
        objetivo_horas: Number(objetivo_horas),
      });
    });
  }
);

router.post(
  "/detener",
  verifyToken,
  [
    body("id_ayuno").isInt({ min: 1 }).withMessage("id_ayuno inválido"),
    body("fin_timestamp").isISO8601().withMessage("fin_timestamp debe ser fecha/hora ISO8601").toDate(),
    body("duracion_horas").isFloat({ min: 0 }).withMessage("duracion_horas inválida"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const { id_ayuno, fin_timestamp, duracion_horas } = req.body;
    const idUsuario = req.user.id_usuario;
    const finTimestampUnix = toUnixTimestamp(fin_timestamp);

    if (!finTimestampUnix) {
      return res.status(400).json({ ok: false, error: "fin_timestamp inválido" });
    }

    const sql = `
      UPDATE ayunos
      SET fin_timestamp = ?, duracion_horas = ?, estado = 'completado'
      WHERE id_ayuno = ? AND id_usuario = ? AND estado = 'activo'
    `;

    db.query(sql, [finTimestampUnix, duracion_horas, id_ayuno, idUsuario], (err, result) => {
      if (err) return handleDbError(res, err, "Error al detener ayuno");

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "No se encontró un ayuno activo para este usuario" });
      }

      return res.json({ ok: true, message: "Ayuno detenido correctamente" });
    });
  }
);

module.exports = router;
