const Sequelize = require('sequelize');
require('dotenv').config();

const mongoose = require('mongoose');

const User = require('../src/models/user');


const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_USERNAME;
const connPass = process.env.SQL_PASSWORD;
const connUri = process.env.MONGO_LOCAL_CONN_URL;

// We assume the DB 'dvws_sqldb' exists initially (created by docker-compose)
// or we can connect without DB if we handle it.
// The original script connected to it.
// Connect without a specific database for setup
const sequelizeRoot = new Sequelize('', connUser, connPass, {
  host: connHost,
  dialect: 'mysql'
});

async function main() {
    console.log('[+] Starting setup...');
    
    // MySQL Setup
    try {
        console.log('[+] Resetting MySQL database for DVWS....');
        await sequelizeRoot.authenticate();
        await sequelizeRoot.query("DROP DATABASE IF EXISTS dvws_sqldb;");
        console.log("[+] Old SQL Database deleted");
        await sequelizeRoot.query("CREATE DATABASE dvws_sqldb;");
        console.log("[+] SQL Database created");
        await sequelizeRoot.query("USE dvws_sqldb;");
        await sequelizeRoot.query(
            'CREATE TABLE IF NOT EXISTS `passphrases` (`username` varchar(200) NOT NULL, `passphrase` varchar(200) NOT NULL, `reminder` varchar(200) NOT NULL, `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)'
        );
        await sequelizeRoot.query(
            "INSERT INTO passphrases (username, passphrase, reminder) VALUES ('admin', '5f4dcc3b5aa765d61d8327deb882cf99', 'default')"
        );
        console.log("[+] Passphrases table created and seeded");
    } catch (err) {
        console.error("[-] MySQL Error:", err);
    } finally {
        await sequelizeRoot.close();
    }

    // MongoDB Setup
    try {
        console.log('[+] Creating MongoDB Admin/Test users...');
        await mongoose.connect(connUri);
        
        // Reset Users collection
        await User.deleteMany({});
        console.log("[+] MongoDB Users collection cleared");

        const user = new User({
            username: "admin",
            password: "letmein",
            admin: true
        });

        try {
            const savedUser = await user.save();
            console.log("[+] Admin user created:", savedUser.username);
        } catch (err) {
            console.log("[-] Error creating admin (might exist):", err.message);
        }

        const user2 = new User({
            username: "test",
            password: "test",
            admin: false
        });

        try {
            const savedUser2 = await user2.save();
            console.log("[+] Test user created:", savedUser2.username);
        } catch (err) {
            console.log("[-] Error creating test user (might exist):", err.message);
        }

    } catch (err) {
        console.error("[-] Mongoose Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log('[+] Setup complete');
    }
}

main();
