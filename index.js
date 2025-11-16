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

// get producto por id
app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error obteniendo producto por ID:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// put producto por id
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image } = req.body;

  // validación
  if (!name || !description || !price || !stock) {
    return res.status(400).json({
      error: "Los campos name, description, price y stock son obligatorios",
    });
  }

  const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock = ?, image = ?
        WHERE id = ?
    `;

  try {
    const [result] = await pool.query(query, [
      name,
      description,
      price,
      stock,
      image || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto actualizado correctamente",
      producto: {
        id,
        name,
        description,
        price,
        stock,
        image,
      },
    });
  } catch (err) {
    console.error("Error actualizando producto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// deletye producto por id
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado correctamente",
      id: id,
    });
  } catch (err) {
    console.error("Error eliminando producto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
