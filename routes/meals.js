"use strict";

const express = require("express");
const { body, query } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");
const { validationFailed, handleDbError } = require("../utils/http");

const router = express.Router();

function toMysqlDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

router.post(
  "/",
  verifyToken,
  [
    body("nombre").trim().notEmpty().isLength({ max: 120 }).withMessage("nombre inválido"),
    body("tipo_comida")
      .optional({ nullable: true })
      .isIn(["desayuno", "colacion", "comida", "cena", "otro"])
      .withMessage("tipo_comida inválido"),
    body("porciones").isFloat({ gt: 0 }).withMessage("porciones inválidas"),
    body("unidad_porcion").trim().notEmpty().isLength({ max: 30 }).withMessage("unidad_porcion inválida"),
    body("calorias_kcal").isFloat({ min: 0 }).withMessage("calorias_kcal inválidas"),
    body("proteinas_g").isFloat({ min: 0 }).withMessage("proteinas_g inválidas"),
    body("carbohidratos_g").isFloat({ min: 0 }).withMessage("carbohidratos_g inválidos"),
    body("lipidos_g").isFloat({ min: 0 }).withMessage("lipidos_g inválidos"),
    body("consumido_en")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("consumido_en debe ser fecha/hora ISO8601"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = req.user.id_usuario;
    const {
      nombre,
      tipo_comida = "otro",
      porciones,
      unidad_porcion,
      calorias_kcal,
      proteinas_g,
      carbohidratos_g,
      lipidos_g,
      consumido_en = new Date().toISOString(),
    } = req.body;

    const consumidoEn = toMysqlDateTime(consumido_en);

    const sql = `
      INSERT INTO meal_entries (
        id_usuario, nombre, tipo_comida, porciones, unidad_porcion, calorias_kcal,
        proteinas_g, carbohidratos_g, lipidos_g, consumido_en
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      idUsuario,
      nombre,
      tipo_comida,
      porciones,
      unidad_porcion,
      calorias_kcal,
      proteinas_g,
      carbohidratos_g,
      lipidos_g,
      consumidoEn,
    ];

    db.query(sql, params, (err, result) => {
      if (err) return handleDbError(res, err, "Error al registrar comida");

      return res.status(201).json({
        ok: true,
        message: "Comida registrada",
        data: {
          id_comida: result.insertId,
          id_usuario: idUsuario,
          nombre,
          tipo_comida,
          porciones: Number(porciones),
          unidad_porcion,
          calorias_kcal: Number(calorias_kcal),
          proteinas_g: Number(proteinas_g),
          carbohidratos_g: Number(carbohidratos_g),
          lipidos_g: Number(lipidos_g),
          consumido_en: consumidoEn,
        },
      });
    });
  }
);

router.get(
  "/today",
  verifyToken,
  [
    query("date")
      .optional()
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage("date debe tener formato YYYY-MM-DD"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = req.user.id_usuario;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const sql = `
      SELECT
        id_comida, nombre, tipo_comida, porciones, unidad_porcion, calorias_kcal,
        proteinas_g, carbohidratos_g, lipidos_g, consumido_en
      FROM meal_entries
      WHERE id_usuario = ? AND DATE(consumido_en) = ?
      ORDER BY consumido_en ASC, id_comida ASC
    `;

    db.query(sql, [idUsuario, date], (err, rows) => {
      if (err) return handleDbError(res, err, "Error al obtener comidas del día");
      return res.json({ ok: true, data: rows, date });
    });
  }
);

module.exports = router;
