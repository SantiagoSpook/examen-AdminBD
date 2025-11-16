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

// get productos
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    console.error("Error ejecutando query", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// post producto
app.post("/api/products", async (req, res) => {
  const { name, description, price, stock, image } = req.body;

  // validaciones
  if (!name || !description || !price || !stock) {
    return res.status(400).json({
      error: "Los campos name, description, price y stock son obligatorios",
    });
  }

  const query = `
        INSERT INTO products (name, description, price, stock, image, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

  try {
    const [result] = await pool.query(query, [
      name,
      description,
      price,
      stock,
      image || null,
    ]);

    res.status(201).json({
      message: "Producto creado exitosamente",
      id: result.insertId,
      producto: {
        id: result.insertId,
        name,
        description,
        price,
        stock,
        image,
      },
    });
  } catch (err) {
    console.error("Error al crear producto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
