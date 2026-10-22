const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Environment variables for service URLs
// (đã sửa lỗi "&#39;" trong code mẫu và bỏ dấu "/" thừa ở cuối URL)
const trim = url => url.replace(/\/+$/, '');
const USER_SERVICE_URL = trim(process.env.USER_SERVICE_URL || 'http://localhost:3001');
const PRODUCT_SERVICE_URL = trim(process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002');

// In-memory database
let orders = [];

// Get all orders
app.get('/orders', (req, res) => {
    res.json(orders);
});

// Get order by ID
app.get('/orders/:id', (req, res) => {
    const order = orders.find(o => o.id === parseInt(req.params.id));
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
});

// Create new order
app.post('/orders', async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const quantity = parseInt(req.body.quantity);

        console.log(`Creating order: userId=${userId}, productId=${productId}, quantity=${quantity}`);

        if (!userId || !productId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'userId, productId and quantity (> 0) are required' });
        }

        // 1. Verify user exists (gọi User Service)
        try {
            const userResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}`, { timeout: 15000 });
            console.log('User verified:', userResponse.data);
        } catch (error) {
            console.error('User verification failed:', error.message);
            return res.status(400).json({ error: 'Invalid user or user service unavailable' });
        }

        // 2. Verify product and check stock (gọi Product Service)
        let product;
        try {
            const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`, { timeout: 15000 });
            product = productResponse.data;
            console.log('Product verified:', product);
        } catch (error) {
            console.error('Product verification failed:', error.message);
            return res.status(400).json({ error: 'Invalid product or product service unavailable' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        // 3. Update product stock (gọi Product Service)
        try {
            await axios.patch(`${PRODUCT_SERVICE_URL}/products/${productId}/stock`, { quantity }, { timeout: 15000 });
            console.log('Stock updated successfully');
        } catch (error) {
            console.error('Stock update failed:', error.message);
            return res.status(500).json({ error: 'Failed to update product stock' });
        }

        // 4. Create order
        const newOrder = {
            id: orders.length + 1,
            userId: parseInt(userId),
            productId: parseInt(productId),
            quantity,
            totalPrice: product.price * quantity,
            status: 'completed',
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);
        console.log('Order created:', newOrder);
        res.status(201).json(newOrder);

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'order-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
            userService: USER_SERVICE_URL,
            productService: PRODUCT_SERVICE_URL
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Order Service',
        version: '1.0.0',
        endpoints: [
            'GET /orders - Get all orders',
            'GET /orders/:id - Get order by ID',
            'POST /orders - Create order',
            'GET /health - Health check'
        ],
        dependencies: {
            userService: USER_SERVICE_URL,
            productService: PRODUCT_SERVICE_URL
        }
    });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
    console.log(`User Service URL: ${USER_SERVICE_URL}`);
    console.log(`Product Service URL: ${PRODUCT_SERVICE_URL}`);
});
