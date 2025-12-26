const { pool } = require('../src/config/db'); // Path updated to include src
const fs = require('fs');
const path = require('path');

const runSeeds = async () => {
    console.log("🌱 Seeding Database with Mandatory Test Data...");
    try {
        // Points to /usr/src/app/database/seeds/seed_data.sql in Docker
        const sqlPath = path.join(__dirname, 'seedData.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log("✅ Seeding completed successfully!");
    } catch (err) {
        // Ignore unique constraint errors to prevent crashes if data is already there
        if (err.message.includes('unique constraint')) {
            console.log("ℹ️ Seed data already exists. Skipping...");
        } else {
            console.error("❌ Seeding Error:", err.message);
            process.exit(1);
        }
    }
};

if (require.main === module) {
    runSeeds();
}

module.exports = runSeeds;