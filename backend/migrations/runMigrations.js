const { pool } = require('../src/config/db'); // Path updated to include src
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
    console.log("🚀 Starting Database Migrations...");
    try {
        const files = fs
            .readdirSync(__dirname)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const sqlPath = path.join(__dirname, file);
            const raw = fs.readFileSync(sqlPath, 'utf8');

            const upStart = raw.indexOf('-- UP');
            const downStart = raw.indexOf('-- DOWN');
            const sql = upStart !== -1
                ? raw.slice(upStart + 5, downStart !== -1 ? downStart : raw.length)
                : raw;

            if (sql.trim()) {
                await pool.query(sql);
            }
        }

        console.log("✅ Migrations completed successfully!");
    } catch (err) {
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