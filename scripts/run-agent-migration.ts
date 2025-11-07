import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running multi-agent architecture migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/005_multi_agent_architecture.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the changes
    const agentsCount = await client.query('SELECT COUNT(*) FROM agents');
    const accountsWithLimits = await client.query('SELECT COUNT(*) FROM accounts WHERE max_agents IS NOT NULL');

    console.log('📊 Migration Results:');
    console.log(`   - Agents created: ${agentsCount.rows[0].count}`);
    console.log(`   - Accounts with agent limits: ${accountsWithLimits.rows[0].count}`);

    // Show agent usage stats
    const usage = await client.query(`
      SELECT
        email,
        max_agents,
        active_agents,
        usage_status
      FROM account_agent_usage
      LIMIT 5
    `);

    console.log('\n📈 Account Agent Usage (first 5):');
    usage.rows.forEach(row => {
      console.log(`   - ${row.email}: ${row.active_agents} agents (limit: ${row.max_agents === 0 ? 'unlimited' : row.max_agents})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
