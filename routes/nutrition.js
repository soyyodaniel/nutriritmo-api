"use strict";

const express = require("express");
const { query } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");
const { validationFailed, handleDbError } = require("../utils/http");

const router = express.Router();

router.get(
  "/today-summary",
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

    const targetsSql = `
      SELECT
        calorias_objetivo,
        proteinas_objetivo_g,
        carbohidratos_objetivo_g,
        lipidos_objetivo_g
      FROM user_nutrition_profiles
      WHERE id_usuario = ?
      LIMIT 1
    `;

    db.query(targetsSql, [idUsuario], (targetsErr, targetsRows) => {
      if (targetsErr) return handleDbError(res, targetsErr, "Error al obtener metas nutricionales");
      if (targetsRows.length === 0) {
        return res.status(404).json({ ok: false, error: "Perfil metabólico no configurado" });
      }

      const consumptionSql = `
        SELECT
          COALESCE(SUM(calorias_kcal), 0) AS calorias_consumidas,
          COALESCE(SUM(proteinas_g), 0) AS proteinas_consumidas_g,
          COALESCE(SUM(carbohidratos_g), 0) AS carbohidratos_consumidos_g,
          COALESCE(SUM(lipidos_g), 0) AS lipidos_consumidos_g
        FROM meal_entries
        WHERE id_usuario = ? AND DATE(consumido_en) = ?
      `;

      db.query(consumptionSql, [idUsuario, date], (consumptionErr, consumptionRows) => {
        if (consumptionErr) return handleDbError(res, consumptionErr, "Error al obtener resumen diario");

        const targets = targetsRows[0];
        const consumed = consumptionRows[0];

        const data = {
          date,
          objetivo: {
            calorias_kcal: Number(targets.calorias_objetivo),
            proteinas_g: Number(targets.proteinas_objetivo_g),
            carbohidratos_g: Number(targets.carbohidratos_objetivo_g),
            lipidos_g: Number(targets.lipidos_objetivo_g),
          },
          consumido: {
            calorias_kcal: Number(consumed.calorias_consumidas),
            proteinas_g: Number(consumed.proteinas_consumidas_g),
            carbohidratos_g: Number(consumed.carbohidratos_consumidos_g),
            lipidos_g: Number(consumed.lipidos_consumidos_g),
          },
        };

        data.restante = {
          calorias_kcal: data.objetivo.calorias_kcal - data.consumido.calorias_kcal,
          proteinas_g: data.objetivo.proteinas_g - data.consumido.proteinas_g,
          carbohidratos_g: data.objetivo.carbohidratos_g - data.consumido.carbohidratos_g,
          lipidos_g: data.objetivo.lipidos_g - data.consumido.lipidos_g,
        };

        return res.json({ ok: true, data });
      });
    });
  }
);

module.exports = router;
