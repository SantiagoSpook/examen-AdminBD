import express from "express";
import dotenv from "dotenv";
import pool from "./connection.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.get("/", (req, res) => {
  res.send("API funcionando correctamente");
});

// get usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Error ejecutando query", err);
    res.status(500).send("Error retrieving users");
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
