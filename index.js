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

// operaciones CRUD parte 1

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

// operaciones CRUD del exaamen

//post
app.post("/api/purchases", async (req, res) => {
  const { user_id, status, details } = req.body;

  // validaciones
  if (
    !user_id ||
    !status ||
    !details ||
    !Array.isArray(details) ||
    details.length === 0
  ) {
    return res.status(400).json({
      error: "Los campos user_id, status y details son obligatorios.",
    });
  }

  // validacion 5 items
  if (details.length > 5) {
    return res.status(400).json({
      error: "No se permiten más de 5 productos por compra.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // validar usuario
    const [userExists] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [user_id]
    );

    if (userExists.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "El usuario no existe." });
    }

    let total = 0;

    // calculos substock
    for (const item of details) {
      const { product_id, quantity, price } = item;

      if (!product_id || !quantity || !price) {
        await connection.rollback();
        return res.status(400).json({
          error: "Cada detalle debe incluir product_id, quantity y price.",
        });
      }

      // validar existencia
      const [productRows] = await connection.query(
        "SELECT stock FROM products WHERE id = ?",
        [product_id]
      );

      if (productRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `El producto con id ${product_id} no existe.`,
        });
      }

      // validar stock
      if (productRows[0].stock < quantity) {
        await connection.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para el producto ${product_id}. Stock actual: ${productRows[0].stock}`,
        });
      }

      // calcular subtotal
      const subtotal = price * quantity;
      item.subtotal = subtotal;
      total += subtotal;
    }

    // validaciopn 3500
    if (total > 3500) {
      await connection.rollback();
      return res.status(400).json({
        error: "El total no puede superar $3500.",
      });
    }

    // insert tabla purchases
    const [purchaseResult] = await connection.query(
      "INSERT INTO purchases (user_id, total, status, purchase_date) VALUES (?, ?, ?, NOW())",
      [user_id, total, status]
    );

    const purchaseId = purchaseResult.insertId;

    // insert en purchase_details + actualizar stock
    for (const item of details) {
      const { product_id, quantity, price, subtotal } = item;

      await connection.query(
        "INSERT INTO purchase_details (purchase_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)",
        [purchaseId, product_id, quantity, price, subtotal]
      );

      // sescontar stock
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [quantity, product_id]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Compra creada exitosamente",
      purchase_id: purchaseId,
      total,
      status,
      details,
    });
  } catch (error) {
    console.error("Error al crear compra:", error);
    await connection.rollback();
    return res.status(500).json({ error: "Error interno del servidor." });
  } finally {
    connection.release();
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
