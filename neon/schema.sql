-- GameVault Database Schema
-- Run this in your Neon SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
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
);

CREATE TABLE IF NOT EXISTS game_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('playing', 'completed', 'wishlist', 'dropped')),
    hours_played INTEGER DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

-- Insert sample games
INSERT INTO games (title, platform, genre, release_date, rating, description) VALUES
('The Legend of Zelda: Breath of the Wild', 'Nintendo Switch', 'Adventure', '2017-03-03', 9.5, 'Open-world adventure game'),
('Elden Ring', 'Multi-platform', 'RPG', '2022-02-25', 9.6, 'Action RPG by FromSoftware'),
('God of War Ragnarök', 'PlayStation', 'Action', '2022-11-09', 9.4, 'Norse mythology action game'),
('Cyberpunk 2077', 'Multi-platform', 'RPG', '2020-12-10', 8.5, 'Futuristic open-world RPG'),
('Hades', 'Multi-platform', 'Roguelike', '2020-09-17', 9.0, 'Greek mythology roguelike');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_game_status_user_id ON game_status(user_id);
CREATE INDEX IF NOT EXISTS idx_game_status_game_id ON game_status(game_id);
