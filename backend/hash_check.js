const bcrypt = require('bcrypt');

const checkHashes = async () => {
    const superAdminPass = 'Admin@123';
    const currentHash = '$2b$10$7R9M7v.X8lHhM3J4K3J4K.y8R6M7v.X8lHhM3J4K3J4K.y8R6M7v'; // From seedData.sql

    try {
        const isMatch = await bcrypt.compare(superAdminPass, currentHash);
        console.log(`Super Admin Hash Match: ${isMatch}`);
    } catch (e) {
        console.log(`Super Admin Hash Error: ${e.message}`);
    }

    // Generate new hashes
    const salt = await bcrypt.genSalt(10);
    const newSuperAdminHash = await bcrypt.hash(superAdminPass, salt);
    console.log(`New Super Admin Hash: ${newSuperAdminHash}`);

    const demoAdminPass = 'Demo@123';
    const newDemoAdminHash = await bcrypt.hash(demoAdminPass, 10);
    console.log(`New Demo Admin Hash: ${newDemoAdminHash}`);
    
    const userPass = 'User@123';
    const newUserHash = await bcrypt.hash(userPass, 10);
    console.log(`New User Hash: ${newUserHash}`);
};

checkHashes();
