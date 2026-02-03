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

async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Create tables using individual queries
    console.log('Creating users table...');
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      username VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    console.log('Creating games table...');
    await sql`CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      platform VARCHAR(100) NOT NULL,
      genre VARCHAR(100),
      release_date DATE,
      rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
      cover_image_url TEXT,
      description TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    console.log('Creating game_status table...');
    await sql`CREATE TABLE IF NOT EXISTS game_status (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      status VARCHAR(50) CHECK (status IN ('playing', 'completed', 'wishlist', 'dropped')),
      hours_played INTEGER DEFAULT 0,
      notes TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_id)
    )`;
    
    console.log('Inserting sample games...');
    await sql`INSERT INTO games (title, platform, genre, release_date, rating, description) VALUES
      ('The Legend of Zelda: Breath of the Wild', 'Nintendo Switch', 'Adventure', '2017-03-03', 9.5, 'Open-world adventure game'),
      ('Elden Ring', 'Multi-platform', 'RPG', '2022-02-25', 9.6, 'Action RPG by FromSoftware'),
      ('God of War Ragnarök', 'PlayStation', 'Action', '2022-11-09', 9.4, 'Norse mythology action game'),
      ('Cyberpunk 2077', 'Multi-platform', 'RPG', '2020-12-10', 8.5, 'Futuristic open-world RPG'),
      ('Hades', 'Multi-platform', 'Roguelike', '2020-09-17', 9.0, 'Greek mythology roguelike')
      ON CONFLICT DO NOTHING`;
    
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_game_status_user_id ON game_status(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_game_status_game_id ON game_status(game_id)`;
    
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();
