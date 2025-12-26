const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: process.env.DB_NAME || 'saas_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function checkProject() {
    const projectId = 'c7b58a08-4bc7-4595-a9c4-7ab19e9f799e';

    try {
        const res = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
        if (res.rows.length === 0) {
            console.log('Project NOT FOUND in DB');
        } else {
            console.log('Project FOUND:', res.rows[0]);
        }
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        pool.end();
    }
}

checkProject();
