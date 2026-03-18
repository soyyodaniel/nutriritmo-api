"use strict";

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { verifyToken } = require("../middleware/auth");
const { calculateNutritionTargets } = require("../utils/nutrition");

const router = express.Router();

function validationFailed(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ ok: false, error: "Datos inválidos", details: errors.array() });
  return true;
}

function handleDbError(res, err, message = "Error en la base de datos") {
  console.error(message, err);
  return res.status(500).json({ ok: false, error: message });
}

function hasMetabolicProfileFields(body) {
  return Boolean(
    body.sexo &&
      body.peso_inicial != null &&
      body.altura != null &&
      body.edad != null &&
      body.nivel_actividad &&
      body.objetivo_metabolico
  );
}

router.post(
  "/register",
  [
    body("nombre").trim().notEmpty().withMessage("nombre es requerido").isLength({ max: 100 }),
    body("email").trim().isEmail().withMessage("email inválido").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("password debe tener al menos 6 caracteres"),
    body("edad").optional({ nullable: true }).isInt({ min: 10, max: 120 }).withMessage("edad inválida"),
    body("peso_inicial").optional({ nullable: true }).isFloat({ min: 20, max: 400 }).withMessage("peso_inicial inválido"),
    body("altura").optional({ nullable: true }).isInt({ min: 80, max: 250 }).withMessage("altura inválida"),
    body("objetivo").optional({ nullable: true }).isLength({ max: 120 }).withMessage("objetivo demasiado largo"),
    body("sexo").optional({ nullable: true }).isIn(["hombre", "mujer"]).withMessage("sexo inválido"),
    body("peso_objetivo").optional({ nullable: true }).isFloat({ min: 20, max: 400 }).withMessage("peso_objetivo inválido"),
    body("nivel_actividad")
      .optional({ nullable: true })
      .isIn(["sedentario", "ligero", "moderado", "intenso", "muy_intenso"])
      .withMessage("nivel_actividad inválido"),
    body("objetivo_metabolico")
      .optional({ nullable: true })
      .isIn(["bajar_grasa", "mantener", "subir_masa"])
      .withMessage("objetivo_metabolico inválido"),
  ],
  async (req, res) => {
    if (validationFailed(req, res)) return;

    const {
      nombre,
      edad,
      peso_inicial,
      altura,
      objetivo,
      email,
      password,
      sexo,
      peso_objetivo,
      nivel_actividad,
      objetivo_metabolico,
    } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const sqlUsuario = `
        INSERT INTO usuarios (nombre, edad, peso_inicial, altura, objetivo, email, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sqlUsuario,
        [nombre, edad ?? null, peso_inicial ?? null, altura ?? null, objetivo ?? null, email, passwordHash],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ ok: false, error: "El correo ya está registrado" });
            }
            return handleDbError(res, err, "Error al registrar usuario");
          }

          const idUsuario = result.insertId;

          if (!hasMetabolicProfileFields(req.body)) {
            return res.status(201).json({
              ok: true,
              message: "Usuario registrado",
              id_usuario: idUsuario,
            });
          }

          let targets;
          try {
            targets = calculateNutritionTargets({
              sexo,
              peso_actual: peso_inicial,
              peso_objetivo: peso_objetivo ?? null,
              altura,
              edad,
              nivel_actividad,
              objetivo: objetivo_metabolico,
            });
          } catch (calcErr) {
            return res.status(201).json({
              ok: true,
              message: "Usuario registrado. Falta configurar metas nutricionales.",
              id_usuario: idUsuario,
            });
          }

          const sqlMetabolic = `
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

          const metabolicParams = [
            idUsuario,
            sexo,
            peso_inicial,
            peso_objetivo ?? null,
            altura,
            edad,
            nivel_actividad,
            objetivo_metabolico,
            targets.calorias_objetivo,
            targets.proteinas_objetivo_g,
            targets.carbohidratos_objetivo_g,
            targets.lipidos_objetivo_g,
          ];

          db.query(sqlMetabolic, metabolicParams, (metabolicErr) => {
            if (metabolicErr) {
              console.error("Perfil metabólico no guardado durante registro", metabolicErr);
              return res.status(201).json({
                ok: true,
                message: "Usuario registrado. Falta configurar metas nutricionales.",
                id_usuario: idUsuario,
              });
            }

            return res.status(201).json({
              ok: true,
              message: "Usuario registrado con metas nutricionales",
              id_usuario: idUsuario,
            });
          });
        }
      );
    } catch (err) {
      return handleDbError(res, err, "Error al registrar usuario");
    }
  }
);

router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("email inválido").normalizeEmail(),
    body("password").notEmpty().withMessage("password es requerido"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const { email, password } = req.body;

    db.query(
      "SELECT id_usuario, nombre, email, password_hash FROM usuarios WHERE email = ? LIMIT 1",
      [email],
      async (err, rows) => {
        if (err) return handleDbError(res, err, "Error al consultar usuario");

        if (rows.length === 0) {
          return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
        }

        const user = rows[0];

        try {
          const ok = await bcrypt.compare(password, user.password_hash);
          if (!ok) {
            return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
          }
        } catch (compareErr) {
          return handleDbError(res, compareErr, "Error al validar credenciales");
        }

        if (!process.env.JWT_SECRET) {
          return res.status(500).json({ ok: false, error: "Falta JWT_SECRET en .env" });
        }

        const token = jwt.sign(
          { id_usuario: user.id_usuario, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.json({
          ok: true,
          message: "Login exitoso",
          token,
          user: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
          },
        });
      }
    );
  }
);

router.get("/me", verifyToken, (req, res) => {
  const idUsuario = req.user.id_usuario;

  db.query(
    "SELECT id_usuario, nombre, email, edad, peso_inicial, altura, objetivo FROM usuarios WHERE id_usuario = ? LIMIT 1",
    [idUsuario],
    (err, rows) => {
      if (err) return handleDbError(res, err, "Error al obtener perfil");
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
      }

      return res.json({ ok: true, user: rows[0] });
    }
  );
});

router.put(
  "/me",
  verifyToken,
  [
    body("nombre").trim().notEmpty().withMessage("nombre es requerido").isLength({ max: 100 }),
    body("email").trim().isEmail().withMessage("email invalido").normalizeEmail(),
    body("edad").optional({ nullable: true }).isInt({ min: 10, max: 120 }).withMessage("edad invalida"),
    body("peso_inicial").optional({ nullable: true }).isFloat({ min: 20, max: 400 }).withMessage("peso_inicial invalido"),
    body("altura").optional({ nullable: true }).isInt({ min: 80, max: 250 }).withMessage("altura invalida"),
    body("objetivo").optional({ nullable: true }).isLength({ max: 120 }).withMessage("objetivo demasiado largo"),
  ],
  (req, res) => {
    if (validationFailed(req, res)) return;

    const idUsuario = req.user.id_usuario;
    const { nombre, email, edad, peso_inicial, altura, objetivo } = req.body;

    const sql = `
      UPDATE usuarios
      SET nombre = ?, email = ?, edad = ?, peso_inicial = ?, altura = ?, objetivo = ?
      WHERE id_usuario = ?
    `;

    db.query(
      sql,
      [nombre, email, edad ?? null, peso_inicial ?? null, altura ?? null, objetivo ?? null, idUsuario],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ ok: false, error: "El correo ya esta registrado" });
          }
          return handleDbError(res, err, "Error al actualizar perfil");
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
        }

        return res.json({
          ok: true,
          message: "Perfil actualizado",
          user: {
            id_usuario: idUsuario,
            nombre,
            email,
            edad: edad ?? null,
            peso_inicial: peso_inicial ?? null,
            altura: altura ?? null,
            objetivo: objetivo ?? null,
          },
        });
      }
    );
  }
);

module.exports = router;
