const { Pool } = require('pg');

// Heroku Postgres bắt buộc SSL. Code mẫu chỉ bật SSL khi NODE_ENV=production,
// nếu quên set NODE_ENV thì không kết nối được -> ở đây bật SSL mặc định,
// chỉ tắt khi chạy thử ở máy (DATABASE_SSL=false).
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// Initialize tables
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
};

module.exports = { pool, initDB };
