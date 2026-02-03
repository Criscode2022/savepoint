# Notes - Serverless Neon Setup

## Neon Auth Table Reference

**Important:** Neon Auth stores users in the `neon_auth.user` table (singular, not `users`).

When creating foreign keys to the Neon Auth user table:
```sql
user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE
```

Not `neon_auth.users` - it's `neon_auth.user`.

## Schema Tables

### platforms
- id (UUID, PK)
- name (VARCHAR, UNIQUE)
- manufacturer
- generation
- release_year
- icon_url
- color
- created_at

### companies  
- id (UUID, PK)
- name (VARCHAR, UNIQUE)
- country
- founded_year
- website
- created_at

### directors
- id (UUID, PK)
- name
- birth_year
- nationality
- bio
- created_at

### games
- id (UUID, PK)
- title
- description
- cover_image
- platform_id -> platforms(id)
- developer_id -> companies(id)
- director_id -> directors(id)
- release_year
- genre
- rating
- playtime_hours
- completed
- purchase_date
- notes
- user_id -> neon_auth.user(id)  -- NOT public.users
- created_at
- updated_at

## Important Notes

- Use `@neondatabase/serverless` client for direct SQL queries from frontend
- Column names are snake_case in DB (created_at, updated_at)
- Map to camelCase in TypeScript models
- Neon doesn't support multiple commands in one prepared statement
