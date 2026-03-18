"use strict";

const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Token requerido" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ ok: false, error: "Falta JWT_SECRET en .env" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Token inválido o expirado" });
  }
}

module.exports = { verifyToken };
