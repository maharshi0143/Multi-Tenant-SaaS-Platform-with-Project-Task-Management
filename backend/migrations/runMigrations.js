const { pool } = require('../src/config/db'); // Path updated to include src
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
    console.log("🚀 Starting Database Migrations...");
    try {
        // Points to /usr/src/app/database/migrations/init.sql in Docker
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log("✅ Migrations completed successfully!");
    } catch (err) {
        // Ignore errors if the relation or type already exists to allow restarts
        if (err.message.includes('already exists')) {
            console.log("ℹ️ Database structure already exists. Skipping...");
        } else {
            console.error("❌ Migration Error:", err.message);
            process.exit(1);
        }
    }
};

if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;