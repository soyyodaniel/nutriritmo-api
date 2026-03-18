"use strict";

const express = require("express");
const { body } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");
const { validationFailed, handleDbError } = require("../utils/http");
const { calculateNutritionTargets } = require("../utils/nutrition");

const router = express.Router();

const profileValidators = [
  body("sexo").isIn(["hombre", "mujer"]).withMessage("sexo inválido"),
  body("peso_actual").isFloat({ min: 20, max: 400 }).withMessage("peso_actual inválido"),
  body("peso_objetivo").optional({ nullable: true }).isFloat({ min: 20, max: 400 }).withMessage("peso_objetivo inválido"),
  body("altura").isInt({ min: 80, max: 250 }).withMessage("altura inválida"),
  body("edad").isInt({ min: 10, max: 120 }).withMessage("edad inválida"),
  body("nivel_actividad")
    .isIn(["sedentario", "ligero", "moderado", "intenso", "muy_intenso"])
    .withMessage("nivel_actividad inválido"),
  body("objetivo")
    .isIn(["bajar_grasa", "mantener", "subir_masa"])
    .withMessage("objetivo inválido"),
];

router.post("/calculate", verifyToken, profileValidators, (req, res) => {
  if (validationFailed(req, res)) return;

  try {
    const result = calculateNutritionTargets(req.body);
    return res.json({ ok: true, data: result });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post("/profile", verifyToken, profileValidators, (req, res) => {
  if (validationFailed(req, res)) return;

  let targets;
  try {
    targets = calculateNutritionTargets(req.body);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  const idUsuario = req.user.id_usuario;
  const {
    sexo,
    peso_actual,
    peso_objetivo = null,
    altura,
    edad,
    nivel_actividad,
    objetivo,
  } = req.body;

  const sql = `
    INSERT INTO user_nutrition_profiles (
      id_usuario, sexo, peso_actual, peso_objetivo, altura, edad, nivel_actividad, objetivo,
      calorias_objetivo, proteinas_objetivo_g, carbohidratos_objetivo_g, lipidos_objetivo_g
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      sexo = VALUES(sexo),
      peso_actual = VALUES(peso_actual),
      peso_objetivo = VALUES(peso_objetivo),
      altura = VALUES(altura),
      edad = VALUES(edad),
      nivel_actividad = VALUES(nivel_actividad),
      objetivo = VALUES(objetivo),
      calorias_objetivo = VALUES(calorias_objetivo),
      proteinas_objetivo_g = VALUES(proteinas_objetivo_g),
      carbohidratos_objetivo_g = VALUES(carbohidratos_objetivo_g),
      lipidos_objetivo_g = VALUES(lipidos_objetivo_g),
      updated_at = CURRENT_TIMESTAMP
  `;

  const params = [
    idUsuario,
    sexo,
    peso_actual,
    peso_objetivo,
    altura,
    edad,
    nivel_actividad,
    objetivo,
    targets.calorias_objetivo,
    targets.proteinas_objetivo_g,
    targets.carbohidratos_objetivo_g,
    targets.lipidos_objetivo_g,
  ];

  db.query(sql, params, (err) => {
    if (err) return handleDbError(res, err, "Error al guardar perfil metabólico");

    return res.status(201).json({
      ok: true,
      message: "Perfil metabólico guardado",
      data: {
        id_usuario: idUsuario,
        sexo,
        peso_actual: Number(peso_actual),
        peso_objetivo: peso_objetivo !== null ? Number(peso_objetivo) : null,
        altura: Number(altura),
        edad: Number(edad),
        nivel_actividad,
        objetivo,
        ...targets,
      },
    });
  });
});

router.get("/targets", verifyToken, (req, res) => {
  const sql = `
    SELECT
      id_usuario, sexo, peso_actual, peso_objetivo, altura, edad, nivel_actividad, objetivo,
      calorias_objetivo, proteinas_objetivo_g, carbohidratos_objetivo_g, lipidos_objetivo_g,
      created_at, updated_at
    FROM user_nutrition_profiles
    WHERE id_usuario = ?
    LIMIT 1
  `;

  db.query(sql, [req.user.id_usuario], (err, rows) => {
    if (err) return handleDbError(res, err, "Error al obtener metas nutricionales");
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Perfil metabólico no configurado" });
    }

    return res.json({ ok: true, data: rows[0] });
  });
});

module.exports = router;
