"use strict";

const { validationResult } = require("express-validator");

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

module.exports = {
  validationFailed,
  handleDbError,
};
