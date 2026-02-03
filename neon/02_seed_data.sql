-- Insert sample platforms
INSERT INTO platforms (name, manufacturer, generation, release_year) VALUES
    ('PlayStation 5', 'Sony', 9, 2020),
    ('Xbox Series X', 'Microsoft', 9, 2020),
    ('Nintendo Switch', 'Nintendo', 8, 2017),
    ('PlayStation 4', 'Sony', 8, 2013),
    ('Xbox One', 'Microsoft', 8, 2013),
    ('PC', 'Various', NULL, NULL),
    ('Nintendo Switch 2', 'Nintendo', 9, 2025),
    ('Steam Deck', 'Valve', NULL, 2022)
ON CONFLICT (name) DO NOTHING;

-- Insert sample companies
INSERT INTO companies (name, country, founded_year, website) VALUES
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
ON CONFLICT (name) DO NOTHING;

-- Insert sample directors
INSERT INTO directors (name, birth_year, nationality, bio) VALUES
    ('Neil Druckmann', 1978, 'Israeli-American', 'Creative Director at Naughty Dog'),
    ('Hidetaka Miyazaki', 1974, 'Japanese', 'President of FromSoftware'),
    ('Todd Howard', 1971, 'American', 'Game Director at Bethesda'),
    ('Cory Barlog', 1975, 'American', 'Creative Director at Santa Monica Studio'),
    ('Eiji Aonuma', 1963, 'Japanese', 'Producer and Director at Nintendo'),
    ('Hideo Kojima', 1963, 'Japanese', 'Video game designer and director'),
    ('Shigeru Miyamoto', 1952, 'Japanese', 'Nintendo representative director')
ON CONFLICT DO NOTHING;