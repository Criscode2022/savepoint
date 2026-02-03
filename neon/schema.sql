-- Neon PostgreSQL Database Schema for GameVault
-- Videogames Library Management App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Neon Auth, this is for additional user data)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Platforms table
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100),
    icon_url TEXT,
    color VARCHAR(7) DEFAULT '#8b5cf6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies (Developers/Publishers) table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100),
    founded_year INTEGER,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image TEXT,
    release_year INTEGER NOT NULL,
    platform_id UUID REFERENCES platforms(id),
    developer_id UUID REFERENCES companies(id),
    director VARCHAR(200),
    rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
    playtime INTEGER CHECK (playtime >= 0),
    completed BOOLEAN DEFAULT FALSE,
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Game-Genre junction table (many-to-many)
CREATE TABLE IF NOT EXISTS game_genres (
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, genre_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_platform_id ON games(platform_id);
CREATE INDEX IF NOT EXISTS idx_games_developer_id ON games(developer_id);
CREATE INDEX IF NOT EXISTS idx_games_release_year ON games(release_year);
CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_games_search ON games 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default platforms
INSERT INTO platforms (id, name, manufacturer, color) VALUES
    ('platform_ps5', 'PlayStation 5', 'Sony', '#003791'),
    ('platform_ps4', 'PlayStation 4', 'Sony', '#003791'),
    ('platform_xbox_series', 'Xbox Series X/S', 'Microsoft', '#107C10'),
    ('platform_xbox_one', 'Xbox One', 'Microsoft', '#107C10'),
    ('platform_switch', 'Nintendo Switch', 'Nintendo', '#E60012'),
    ('platform_pc', 'PC', 'Various', '#FF5722'),
    ('platform_steam_deck', 'Steam Deck', 'Valve', '#1b2838')
ON CONFLICT DO NOTHING;

-- Insert default genres
INSERT INTO genres (name) VALUES
    ('Action'),
    ('Adventure'),
    ('RPG'),
    ('Strategy'),
    ('Shooter'),
    ('Platformer'),
    ('Puzzle'),
    ('Racing'),
    ('Sports'),
    ('Fighting'),
    ('Simulation'),
    ('Horror'),
    ('Indie'),
    ('MMORPG'),
    ('Battle Royale'),
    ('Roguelike'),
    ('Metroidvania'),
    ('Souls-like')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own games
CREATE POLICY games_select_own ON games
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY games_insert_own ON games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY games_update_own ON games
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY games_delete_own ON games
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see/update their own profile
CREATE POLICY user_profiles_select_own ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_profiles_update_own ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
