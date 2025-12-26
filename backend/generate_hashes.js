const bcrypt = require('bcrypt');
const fs = require('fs');

async function generate() {
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const demoHash = await bcrypt.hash('Demo@123', 10);
    const userHash = await bcrypt.hash('User@123', 10);

    const content = `ADMIN_HASH=${adminHash}\nDEMO_HASH=${demoHash}\nUSER_HASH=${userHash}`;
    fs.writeFileSync('hashes.txt', content);
    console.log('Hashes written to hashes.txt');
}

generate();
