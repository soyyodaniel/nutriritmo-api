"use strict";

const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");
const { validationFailed, handleDbError } = require("../utils/http");

const router = express.Router();

function round2(value) {
  return Number(Number(value).toFixed(2));
}

function toMysqlDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function buildEstimate(food, grams) {
  const factor = grams / Number(food.gramos_base);
  return {
    id_food: food.id_food,
    nombre: food.nombre,
    grupo_equivalente: food.grupo_equivalente,
    gramos: round2(grams),
    unidad_base: food.unidad_base,
    porcion_referencia: food.porcion_referencia,
    gramos_base: Number(food.gramos_base),
    calorias_kcal: round2(Number(food.calorias_kcal) * factor),
    proteinas_g: round2(Number(food.proteinas_g) * factor),
    carbohidratos_g: round2(Number(food.carbohidratos_g) * factor),
    lipidos_g: round2(Number(food.lipidos_g) * factor),
  };
}

router.get(
  "/search",
  verifyToken,
  [
    query("q").optional().trim().isLength({ min: 1, max: 100 }).withMessage("q inválido"),
    query("grupo").optional().trim().isLength({ min: 1, max: 60 }).withMessage("grupo inválido"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit inválido"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const q = (req.query.q || "").trim();
    const grupo = (req.query.grupo || "").trim();
    const limit = Number(req.query.limit || 20);

    let sql = `
      SELECT
        id_food, grupo_equivalente, nombre, aliases, unidad_base, porcion_referencia,
        gramos_base, calorias_kcal, proteinas_g, carbohidratos_g, lipidos_g
      FROM food_equivalents_catalog
      WHERE activo = 1
    `;

    const params = [];

    if (grupo) {
      sql += " AND grupo_equivalente = ?";
      params.push(grupo);
    }

    if (q) {
      sql += " AND (nombre LIKE ? OR aliases LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY nombre ASC LIMIT ?";
    params.push(limit);

    db.query(sql, params, (err, rows) => {
      if (err) return handleDbError(res, err, "Error al buscar alimentos");
      return res.json({ ok: true, data: rows });
    });
  }
);

router.get(
  "/:id/estimate",
  verifyToken,
  [
    param("id").isInt({ min: 1 }).withMessage("id inválido"),
    query("grams").isFloat({ gt: 0 }).withMessage("grams inválido"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idFood = Number(req.params.id);
    const grams = Number(req.query.grams);

    const sql = `
      SELECT
        id_food, grupo_equivalente, nombre, aliases, unidad_base, porcion_referencia,
        gramos_base, calorias_kcal, proteinas_g, carbohidratos_g, lipidos_g
      FROM food_equivalents_catalog
      WHERE id_food = ? AND activo = 1
      LIMIT 1
    `;

    db.query(sql, [idFood], (err, rows) => {
      if (err) return handleDbError(res, err, "Error al estimar alimento");
      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Alimento no encontrado" });
      }

      const estimate = buildEstimate(rows[0], grams);
      return res.json({ ok: true, data: estimate });
    });
  }
);

router.post(
  "/register",
  verifyToken,
  [
    body("food_id").isInt({ min: 1 }).withMessage("food_id inválido"),
    body("grams").isFloat({ gt: 0 }).withMessage("grams inválido"),
    body("tipo_comida")
      .optional({ nullable: true })
      .isIn(["desayuno", "colacion", "comida", "cena", "otro"])
      .withMessage("tipo_comida inválido"),
    body("unidad_porcion")
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("unidad_porcion inválida"),
    body("nombre_personalizado")
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 1, max: 120 })
      .withMessage("nombre_personalizado inválido"),
    body("consumido_en")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("consumido_en debe ser fecha/hora ISO8601"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = req.user.id_usuario;
    const foodId = Number(req.body.food_id);
    const grams = Number(req.body.grams);
    const tipoComida = req.body.tipo_comida || "otro";
    const consumidoEn = toMysqlDateTime(req.body.consumido_en);

    const sqlFood = `
      SELECT
        id_food, grupo_equivalente, nombre, unidad_base, porcion_referencia,
        gramos_base, calorias_kcal, proteinas_g, carbohidratos_g, lipidos_g
      FROM food_equivalents_catalog
      WHERE id_food = ? AND activo = 1
      LIMIT 1
    `;

    db.query(sqlFood, [foodId], (err, rows) => {
      if (err) return handleDbError(res, err, "Error al obtener alimento");
      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Alimento no encontrado" });
      }

      const food = rows[0];
      const estimate = buildEstimate(food, grams);
      const nombre = req.body.nombre_personalizado || `${food.nombre} (${round2(grams)} g)`;
      const unidadPorcion = req.body.unidad_porcion || "g";

      const sqlMeal = `
        INSERT INTO meal_entries (
          id_usuario, nombre, tipo_comida, porciones, unidad_porcion, calorias_kcal,
          proteinas_g, carbohidratos_g, lipidos_g, consumido_en
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        idUsuario,
        nombre,
        tipoComida,
        round2(grams),
        unidadPorcion,
        estimate.calorias_kcal,
        estimate.proteinas_g,
        estimate.carbohidratos_g,
        estimate.lipidos_g,
        consumidoEn,
      ];

      db.query(sqlMeal, params, (insertErr, result) => {
        if (insertErr) return handleDbError(res, insertErr, "Error al registrar comida desde catálogo");

        return res.status(201).json({
          ok: true,
          message: "Comida registrada desde catálogo",
          data: {
            id_comida: result.insertId,
            id_food: food.id_food,
            nombre,
            tipo_comida: tipoComida,
            gramos: round2(grams),
            unidad_porcion: unidadPorcion,
            calorias_kcal: estimate.calorias_kcal,
            proteinas_g: estimate.proteinas_g,
            carbohidratos_g: estimate.carbohidratos_g,
            lipidos_g: estimate.lipidos_g,
            consumido_en: consumidoEn,
            grupo_equivalente: food.grupo_equivalente,
            porcion_referencia: food.porcion_referencia,
          },
        });
      });
    });
  }
);

module.exports = router;
