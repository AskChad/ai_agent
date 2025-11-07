const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Force IPv4 by using connection string
const connectionString = `postgresql://postgres:${encodeURIComponent(envVars.DB_PASSWORD)}@db.mdccswzjwfyrzahbhduu.supabase.co:5432/postgres?sslmode=require`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Force IPv4
  host: 'db.mdccswzjwfyrzahbhduu.supabase.co',
  family: 4
});

async function deploySchema() {
  console.log('🚀 Deploying database schema via PostgreSQL connection...\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing SQL migration...');
    console.log('⏳ This may take a moment...\n');

    // Execute the entire SQL file
    await client.query(sql);

    console.log('✅ Schema deployed successfully!');
    console.log('\n📊 Database is now ready with:');
    console.log('   - 15+ tables created');
    console.log('   - Indexes configured');
    console.log('   - Triggers activated');
    console.log('   - Helper functions installed');
    console.log('   - RLS enabled\n');

  } catch (error) {
    console.error('\n❌ Error deploying schema:');
    console.error(error.message);
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

deploySchema();
