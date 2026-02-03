-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    manufacturer VARCHAR(100),
    generation INTEGER,
    release_year INTEGER,
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(100),
    founded_year INTEGER,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create directors table
CREATE TABLE IF NOT EXISTS directors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    birth_year INTEGER,
    nationality VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (for Neon Auth integration)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    avatar_url VARCHAR(500),
    auth_provider VARCHAR(50) DEFAULT 'neon',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
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
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_platform_id ON games(platform_id);
CREATE INDEX IF NOT EXISTS idx_games_developer_id ON games(developer_id);
CREATE INDEX IF NOT EXISTS idx_games_director_id ON games(director_id);
CREATE INDEX IF NOT EXISTS idx_games_release_year ON games(release_year);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();