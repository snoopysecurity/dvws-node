const Sequelize = require('sequelize');
require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../src/models/user');
const SupportTicket = require('../src/models/support-ticket');
const ResourceStorePromotion = require('../src/models/resource-store-promotion');


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

        // The private voucher stays stable while this database persists.
        await ResourceStorePromotion.findOneAndUpdate(
            { slug: 'workspace-credit-2026' },
            { $setOnInsert: {
                code: `OPS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
                publicId: 'workspace-credit-2026', credits: 175, maxOrders: 100, active: true
            } },
            { upsert: true, setDefaultsOnInsert: true }
        );
        
        // Reset Users collection
        await User.deleteMany({});
        await SupportTicket.deleteMany({});
        console.log("[+] MongoDB Users collection cleared");

        const user = new User({
            username: "admin",
            password: "letmein",
            admin: true,
            email: "admin@dvws.local",
            homeAddress: "1 Example Lane, Exampleton"
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
            admin: false,
            email: "test@dvws.local",
            homeAddress: "2 Example Lane, Exampleton"
        });

        try {
            const savedUser2 = await user2.save();
            console.log("[+] Test user created:", savedUser2.username);
        } catch (err) {
            console.log("[-] Error creating test user (might exist):", err.message);
        }

        const recoveryVictim = new User({
            username: "recovery-victim",
            password: "Victim123!",
            admin: false,
            email: "victim@dvws.local",
            homeAddress: "42 Fictional Crescent, Exampleton"
        });

        try {
            const savedVictim = await recoveryVictim.save();
            console.log("[+] Recovery challenge user created:", savedVictim.username);
        } catch (err) {
            console.log("[-] Error creating recovery challenge user:", err.message);
        }

        await SupportTicket.create({
            _id: '6f1d2a40-2f5b-11ef-9a31-0242ac120002',
            username: 'recovery-victim',
            subject: 'Training access issue',
            message: 'I cannot access the advanced training materials.',
            createdAt: new Date('2024-06-20T23:18:42.448Z')
        });
        console.log('[+] UUID support ticket created for recovery-victim');

        const sessionVictim = new User({
            username: "session-victim",
            password: "Session123!",
            admin: false,
            email: "session-victim@dvws.local",
            homeAddress: "18 Fictional Orchard Road, Exampleton"
        });

        try {
            const savedSessionVictim = await sessionVictim.save();
            console.log("[+] Session challenge user created:", savedSessionVictim.username);
        } catch (err) {
            console.log("[-] Error creating session challenge user:", err.message);
        }

    } catch (err) {
        console.error("[-] Mongoose Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log('[+] Setup complete');
    }
}

main();
