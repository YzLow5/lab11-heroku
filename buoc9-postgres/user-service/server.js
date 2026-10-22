const express = require('express');
const bodyParser = require('body-parser');
const { pool, initDB } = require('./db');

const app = express();
app.use(bodyParser.json());

// Initialize database
initDB();

// id phải là số nguyên, tránh lỗi SQL khi gọi /users/abc
const parseId = (req, res) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        res.status(404).json({ error: 'User not found' });
        return null;
    }
    return id;
};

// Get all users
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user by ID
app.get('/users/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new user
app.post('/users', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'name and email are required' });
        }
        const result = await pool.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [name, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Email already exists' });
        } else {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Database error' });
        }
    }
});

// Update user
app.put('/users/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    try {
        const { name, email } = req.body;

        // COALESCE: field nào không gửi thì giữ giá trị cũ
        const result = await pool.query(
            `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
             updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
            [name, email, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            service: 'user-service',
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            service: 'user-service',
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'User Service',
        version: '2.0.0',
        database: 'PostgreSQL',
        endpoints: [
            'GET /users - Get all users',
            'GET /users/:id - Get user by ID',
            'POST /users - Create user',
            'PUT /users/:id - Update user',
            'DELETE /users/:id - Delete user',
            'GET /health - Health check'
        ]
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
