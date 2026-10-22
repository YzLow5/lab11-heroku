const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());
// LƯU Ý: KHÔNG dùng app.use(express.json()) trước proxy.
// express.json() đọc hết body của request, khiến proxy chuyển tiếp POST/PUT
// với body rỗng -> request bị treo/timeout. Gateway không cần đọc body.

// Environment variables for service URLs (đã sửa lỗi "&#39;" và bỏ "/" cuối)
const trim = url => url.replace(/\/+$/, '');
const USER_SERVICE_URL = trim(process.env.USER_SERVICE_URL || 'http://localhost:3001');
const PRODUCT_SERVICE_URL = trim(process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002');
const ORDER_SERVICE_URL = trim(process.env.ORDER_SERVICE_URL || 'http://localhost:3003');

console.log('Service URLs:');
console.log('User Service:', USER_SERVICE_URL);
console.log('Product Service:', PRODUCT_SERVICE_URL);
console.log('Order Service:', ORDER_SERVICE_URL);

// Gọi /health của 1 service, chỉ coi là healthy khi HTTP 2xx
async function checkService(url) {
    try {
        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(15000) });
        const body = await response.json().catch(() => ({}));
        return {
            status: response.ok ? 'healthy' : 'unhealthy',
            url,
            httpStatus: response.status,
            ...(body.database ? { database: body.database } : {})
        };
    } catch (error) {
        return { status: 'unhealthy', url, error: error.message };
    }
}

// Health check endpoint (kiểm tra song song cả 3 service)
app.get('/health', async (req, res) => {
    const [userService, productService, orderService] = await Promise.all([
        checkService(USER_SERVICE_URL),
        checkService(PRODUCT_SERVICE_URL),
        checkService(ORDER_SERVICE_URL)
    ]);
    res.json({
        gateway: { status: 'healthy', timestamp: new Date().toISOString() },
        services: { userService, productService, orderService }
    });
});

// Proxy configuration với error handling
// Giữ nguyên đường dẫn /users, /products, /orders vì các service định nghĩa route
// có tiền tố này (code mẫu xoá tiền tố đi nên /users/1 bị chuyển thành /1 -> 404).
// Riêng /users/health, /products/health, /orders/health được chuyển thành /health.
const createProxyWithErrorHandling = (target, prefix) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^${prefix}/health$`]: '/health' },
        proxyTimeout: 30000,
        timeout: 30000,
        onError: (err, req, res) => {
            console.error(`Proxy error for ${req.originalUrl}:`, err.message);
            if (!res.headersSent) {
                res.status(503).json({
                    error: 'Service temporarily unavailable',
                    service: target,
                    timestamp: new Date().toISOString()
                });
            }
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log(`Proxying ${req.method} ${req.originalUrl} to ${target}`);
        }
    });
};

// Create proxy middleware for each service
app.use('/users', createProxyWithErrorHandling(USER_SERVICE_URL, '/users'));
app.use('/products', createProxyWithErrorHandling(PRODUCT_SERVICE_URL, '/products'));
app.use('/orders', createProxyWithErrorHandling(ORDER_SERVICE_URL, '/orders'));

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Microservices API Gateway',
        version: '1.0.0',
        services: {
            userService: USER_SERVICE_URL,
            productService: PRODUCT_SERVICE_URL,
            orderService: ORDER_SERVICE_URL
        },
        endpoints: [
            'GET /users - Get all users',
            'POST /users - Create user',
            'GET /products - Get all products',
            'POST /products - Create product',
            'GET /orders - Get all orders',
            'POST /orders - Create order',
            'GET /health - Health check all services'
        ],
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
