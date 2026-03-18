// app.js
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const ayunosRoutes = require("./routes/ayunos");
const metabolismRoutes = require("./routes/metabolism");
const mealsRoutes = require("./routes/meals");
const nutritionRoutes = require("./routes/nutrition");
const foodsRoutes = require("./routes/foods");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/ayunos", ayunosRoutes);
app.use("/api/metabolism", metabolismRoutes);
app.use("/api/meals", mealsRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/foods", foodsRoutes);

app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.get("/", (req, res) => {
  res.json({ ok: true, message: "API NutriRitmo funcionando" });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada", path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Servidor NutriRitmo escuchando en http://localhost:${PORT}`);
});

module.exports = app;
