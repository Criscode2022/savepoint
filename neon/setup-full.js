const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setupFullDatabase() {
  console.log('Setting up complete database schema...');
  
  try {
    // Create platforms table
    console.log('Creating platforms table...');
    await sql(`CREATE TABLE IF NOT EXISTS platforms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      manufacturer VARCHAR(100),
      generation INTEGER,
      release_year INTEGER,
      icon_url VARCHAR(500),
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create companies table
    console.log('Creating companies table...');
    await sql(`CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      country VARCHAR(100),
      founded_year INTEGER,
      website VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create directors table
    console.log('Creating directors table...');
    await sql(`CREATE TABLE IF NOT EXISTS directors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      birth_year INTEGER,
      nationality VARCHAR(100),
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create users table (for Neon Auth integration)
    console.log('Creating users table...');
    await sql(`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE,
      avatar_url VARCHAR(500),
      auth_provider VARCHAR(50) DEFAULT 'neon',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create games table with proper foreign keys
    console.log('Creating games table...');
    await sql(`CREATE TABLE IF NOT EXISTS games (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      cover_image VARCHAR(500),
      platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
      developer_id UUID REFERENCES companies(id) ON DELETE SET NULL,
      director_id UUID REFERENCES directors(id) ON DELETE SET NULL,
      release_year INTEGER,
      genre VARCHAR(100),
      rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
      playtime_hours INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      purchase_date DATE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create indexes for filtering
    console.log('Creating indexes...');
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_platform_id ON games(platform_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_developer_id ON games(developer_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_director_id ON games(director_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_release_year ON games(release_year)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_games_title ON games(title)`);
    
    // Insert sample platforms
    console.log('Inserting sample platforms...');
    await sql(`INSERT INTO platforms (name, manufacturer, generation, release_year) VALUES
      ('PlayStation 5', 'Sony', 9, 2020),
      ('Xbox Series X', 'Microsoft', 9, 2020),
      ('Nintendo Switch', 'Nintendo', 8, 2017),
      ('PlayStation 4', 'Sony', 8, 2013),
      ('Xbox One', 'Microsoft', 8, 2013),
      ('PC', 'Various', NULL, NULL),
      ('Nintendo Switch 2', 'Nintendo', 9, 2025),
      ('Steam Deck', 'Valve', NULL, 2022)
      ON CONFLICT (name) DO NOTHING`);
    
    // Insert sample companies
    console.log('Inserting sample companies...');
    await sql(`INSERT INTO companies (name, country, founded_year, website) VALUES
      ('Naughty Dog', 'USA', 1984, 'https://www.naughtydog.com'),
      ('FromSoftware', 'Japan', 1986, 'https://www.fromsoftware.jp'),
      ('CD Projekt Red', 'Poland', 2002, 'https://en.cdprojektred.com'),
      ('Rockstar Games', 'USA', 1998, 'https://www.rockstargames.com'),
      ('Nintendo EPD', 'Japan', 2015, 'https://www.nintendo.com'),
      ('Santa Monica Studio', 'USA', 1999, 'https://sms.playstation.com'),
      ('Valve Corporation', 'USA', 1996, 'https://www.valvesoftware.com'),
      ('Bethesda Game Studios', 'USA', 2001, 'https://bethesdagamestudios.com'),
      ('Guerrilla Games', 'Netherlands', 2000, 'https://www.guerrilla-games.com'),
      ('Insomniac Games', 'USA', 1994, 'https://insomniac.games')
      ON CONFLICT (name) DO NOTHING`);
    
    // Insert sample directors
    console.log('Inserting sample directors...');
    await sql(`INSERT INTO directors (name, birth_year, nationality, bio) VALUES
      ('Neil Druckmann', 1978, 'Israeli-American', 'Creative Director at Naughty Dog'),
      ('Hidetaka Miyazaki', 1974, 'Japanese', 'President of FromSoftware'),
      ('Todd Howard', 1971, 'American', 'Game Director at Bethesda'),
      ('Cory Barlog', 1975, 'American', 'Creative Director at Santa Monica Studio'),
      ('Eiji Aonuma', 1963, 'Japanese', 'Producer and Director at Nintendo'),
      ('Hideo Kojima', 1963, 'Japanese', 'Video game designer and director'),
      ('Shigeru Miyamoto', 1952, 'Japanese', 'Nintendo representative director')
      ON CONFLICT DO NOTHING`);
    
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupFullDatabase();
