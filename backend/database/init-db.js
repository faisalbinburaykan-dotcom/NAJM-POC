// Database Initialization Script
// Creates admin user and sample data
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function initializeAdminUser() {
    console.log('👤 Creating admin user...');

    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || '1234';

    // Check if admin already exists
    const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUsername);

    if (existingAdmin) {
        console.log('ℹ️  Admin user already exists');
        return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Insert admin user
    const stmt = db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    `);

    stmt.run(adminUsername, passwordHash, 'admin');

    console.log(`✅ Admin user created: ${adminUsername}`);
}

async function createSampleData() {
    console.log('📝 Creating sample tickets...');

    const tickets = [
        {
            ticket_id: 'A-1001',
            plate: 'ABC1234',
            vehicles: 2,
            damage: 'Front bumper damage',
            status: 'open'
        },
        {
            ticket_id: 'A-1002',
            plate: 'XYZ5678',
            vehicles: 1,
            damage: 'Side mirror broken',
            status: 'pending'
        }
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO tickets (ticket_id, plate, vehicles, damage, status)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const ticket of tickets) {
        stmt.run(ticket.ticket_id, ticket.plate, ticket.vehicles, ticket.damage, ticket.status);
    }

    console.log('✅ Sample tickets created');
}

// Main initialization
async function main() {
    try {
        console.log('🚀 Starting database initialization...\n');

        await initializeAdminUser();
        await createSampleData();

        console.log('\n✅ Database initialization complete!\n');
        console.log('📋 Summary:');
        console.log(`   - Admin user: ${process.env.ADMIN_USER || 'admin'}`);
        console.log(`   - Admin password: ${process.env.ADMIN_PASS || '1234'}`);
        console.log(`   - Database: ${db.name}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

main();
