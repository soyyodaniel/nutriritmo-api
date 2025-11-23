// db.js
"use strict";

const mysql = require("mysql2");
require("dotenv").config();

// Pool de conexiones (mejor práctica que una sola conexión fija)
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nutriritmo",
  connectionLimit: 10, // máximo de conexiones en el pool
});

// Probar la conexión una vez al iniciar
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error al conectar al pool de MySQL:", err);
  } else {
    console.log("✅ Pool de conexiones MySQL listo (BD nutriritmo)");
    connection.release();
  }
});

module.exports = db;
