# PowerShell script to install exec_sql function
# Run this from Windows PowerShell (not WSL)

$PROJECT_REF = "mdccswzjwfyrzahbhduu"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE"
$SQL_FILE = ".\database\migrations\000_install_exec_sql.sql"

Write-Host "🚀 Installing exec_sql function..." -ForegroundColor Cyan
Write-Host ""

# Check if SQL file exists
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: SQL file not found: $SQL_FILE" -ForegroundColor Red
    Write-Host "   Make sure you're running this from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Read SQL content
$sqlContent = Get-Content -Path $SQL_FILE -Raw

Write-Host "📝 Attempting to install via Node.js..." -ForegroundColor Yellow

# Create temporary Node.js script
$nodeScript = @"
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'db.$PROJECT_REF.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '$SERVICE_KEY',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function install() {
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\\n');

    console.log('📝 Installing exec_sql function...');
    const sql = fs.readFileSync('$SQL_FILE', 'utf8');
    await client.query(sql);

    console.log('✅ exec_sql function installed!\\n');

    const result = await client.query(
      ``SELECT COUNT(*) as count FROM information_schema.routines WHERE routine_name = 'exec_sql'``
    );

    if (result.rows[0].count > 0) {
      console.log('✅ Verification passed\\n');
      console.log('🎉 exec_sql is ready to use!');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\\n💡 Please run the SQL manually in Supabase SQL Editor:');
    console.error('   URL: https://supabase.com/dashboard/project/$PROJECT_REF/sql');
    await client.end();
    process.exit(1);
  }
}

install();
"@

# Write temporary script
$tempScript = ".\install-exec-sql-temp.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Run Node.js script
    node $tempScript

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ exec_sql installed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Automated installation failed" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 MANUAL INSTALLATION:" -ForegroundColor Cyan
        Write-Host "1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql" -ForegroundColor White
        Write-Host "2. Click 'New Query'" -ForegroundColor White
        Write-Host "3. Copy and paste the contents of: $SQL_FILE" -ForegroundColor White
        Write-Host "4. Click 'Run'" -ForegroundColor White
    }
} finally {
    # Clean up temporary script
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
}
