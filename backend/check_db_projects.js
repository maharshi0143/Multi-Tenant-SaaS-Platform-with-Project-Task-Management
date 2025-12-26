const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    connectionString: 'postgresql://postgres:maharshi@localhost:5432/saas_db',
});

async function listProjects() {
    try {
        const res = await pool.query('SELECT id, name, tenant_id FROM projects');
        console.log('Projects in DB:');
        res.rows.forEach(r => console.log(`Project: ${r.id} | ${r.name} | Tenant: ${r.tenant_id}`));

        const users = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@demo.com'");
        console.log('Users in DB:');
        users.rows.forEach(u => console.log(`User: ${u.email} | Tenant: ${u.tenant_id}`));

        if (res.rows.length === 0) console.log('No projects found.');
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        await pool.end();
    }
}

listProjects();
