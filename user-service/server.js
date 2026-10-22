const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// In-memory database
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];
let nextId = 3; // tránh trùng id sau khi xoá user

// Get all users
app.get('/users', (req, res) => {
    res.json(users);
});

// Get user by ID
app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// Create new user
app.post('/users', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
    }
    const newUser = { id: nextId++, name, email };
    users.push(newUser);
    res.status(201).json(newUser);
});

// Update user
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    users[userIndex] = { ...users[userIndex], ...req.body, id: userId };
    res.json(users[userIndex]);
});

// Delete user
app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    users = users.filter(u => u.id !== userId);
    res.status(204).send();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'user-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'User Service',
        version: '1.0.0',
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

// IMPORTANT: Use process.env.PORT for Heroku
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
