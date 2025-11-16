const express = require('express');
const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

const mysql = require('mysql2/promise');

// Crea una pool de conexiones con la información de tu base de datos
const pool = mysql.createPool({
    host: 'test-db-merida.c0oen9i4myoj.us-east-2.rds.amazonaws.com',
    user: 'admin',
    password: 'merida-12345',
    database: 'example-merida'
});






app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get("/usuarios", (req, res) => {
    pool.query('SELECT * FROM usuarios')
        .then(([rows, fields]) => {
            res.json(rows);
        })
        .catch(err => {
            console.error('Error executing query', err);
            res.status(500).send('Error retrieving users');
        });
})

// Endpoint POST para crear un usuario
app.post("/usuarios", (req, res) => {
    const { nombre, email, telefono, edad } = req.body;

    // Validación básica
    if (!nombre || !email) {
        return res.status(400).json({
            error: 'Los campos nombre y email son obligatorios'
        });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Formato de email inválido'
        });
    }

    const query = 'INSERT INTO usuarios (nombre, email, telefono, edad) VALUES (?, ?, ?, ?)';

    pool.query(query, [nombre, email, telefono || null, edad || null])
        .then(([result]) => {
            res.status(201).json({
                message: 'Usuario creado exitosamente',
                id: result.insertId,
                usuario: {
                    id: result.insertId,
                    nombre,
                    email,
                    telefono,
                    edad
                }
            });
        })
        .catch(err => {
            console.error('Error creating user', err);

            // Manejar error de email duplicado (si existe constraint UNIQUE)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    error: 'El email ya está registrado'
                });
            }

            res.status(500).json({
                error: 'Error interno del servidor al crear el usuario'
            });
        });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});