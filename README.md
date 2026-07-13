# 🎮 GameVault

A modern, gaming-themed videogames library management application built with Angular, Ionic, and Tailwind CSS. Features Neon Auth/PostgreSQL integration, dark mode, and a sleek cyberpunk aesthetic.

![Angular](https://img.shields.io/badge/Angular-19-DD0031?style=flat-square&logo=angular)
![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?style=flat-square&logo=ionic)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)

## ✨ Features

- 🎛️ **Command Center shell** — sidebar smart collections, top search, mobile tabs
- ⌘ **Command palette** — jump to games, collections, and actions (`Ctrl/⌘K`)
- ▶️ **Continue Playing** — resume strip for active titles
- 📚 **Multi-view library** — grid, list, and shelf (preference persisted)
- 🔐 **Authentication** — Neon Auth login/register
- 🔍 **Filters & sort** — platform, year, developer, rating, last played, playtime
- 💖 **Wishlist** — upcoming titles with release countdown
- 🏷️ **Tags & saved collections** — personal labels + bookmarkable library views
- 📥 **Import / export** — JSON import; JSON & Excel export
- 📈 **Insights** — streaks, completion rate, playtime by platform/genre
- ✨ **Recommendations** — online picks from your library taste (RAWG, no AI)
- ⏱️ **Log playtime** — quick session hours on game detail
- 📊 **Play history** — completed timeline
- 🎨 **Refined Vault** — dark cyberpunk DNA with Apple-level restraint

## 🛠️ Tech Stack

- **Frontend**: Angular 19+ (Standalone Components)
- **UI Framework**: Ionic 8+ 
- **Styling**: Tailwind CSS 4+
- **Database**: Neon PostgreSQL
- **Auth**: Neon Auth
- **Icons**: Ionicons

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL account (for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/videogames-library.git
cd videogames-library
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Edit `src/environments/environment.ts` with your Neon credentials:
```typescript
export const environment = {
  production: false,
  neonDatabaseUrl: 'postgresql://username:password@host/database',
  neonAuthUrl: 'https://your-neon-auth-endpoint'
};
```

4. Run the development server:
```bash
npm start
```

5. Open your browser at `http://localhost:4200`

### Database Setup

1. Create a new project on [Neon](https://neon.tech)
2. Run the schema file in the Neon SQL Editor:
```bash
cat neon/schema.sql | pscale shell your-database main
```

## 📁 Project Structure

```
videogames-library/
├── src/
│   ├── app/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Main application pages
│   │   ├── services/        # API, auth, and data services
│   │   ├── models/          # TypeScript interfaces
│   │   └── shared/          # Guards, interceptors, utilities
│   ├── assets/              # Static assets (images, fonts)
│   ├── theme/               # Custom CSS variables
│   ├── styles.scss          # Global styles
│   └── index.html           # Main HTML file
├── neon/
│   └── schema.sql           # Database schema
├── docs/                    # Documentation
├── angular.json             # Angular CLI configuration
├── package.json             # Dependencies
└── README.md                # This file
```

## 🎨 Customization

### Theme Colors

Edit `src/styles.scss` to customize the gaming theme:

```scss
:root {
  --color-primary: #8b5cf6;        /* Purple */
  --color-secondary: #06b6d4;      /* Cyan */
  --color-accent: #f472b6;         /* Pink */
  --color-bg-primary: #0f0f1a;     /* Dark background */
  --color-bg-secondary: #1a1a2e;   /* Card background */
}
```

### Adding New Platforms

Edit `src/app/models/game.model.ts`:

```typescript
export const PLATFORMS: Platform[] = [
  { id: 'ps5', name: 'PlayStation 5', manufacturer: 'Sony', color: '#003791' },
  // Add your platform here
];
```

## 🏗️ Building for Production

```bash
npm run build
```

The production build will be in the `dist/videogames-library` directory.

## 🔒 Authentication Setup

This app uses Neon Auth. To set it up:

1. Enable Neon Auth in your Neon project dashboard
2. Configure OAuth providers (Google, GitHub, etc.)
3. Update the auth service to use your Neon Auth endpoints

## 📱 Mobile Build (Capacitor)

```bash
# Add iOS
npm run ionic:build
npx cap add ios
npx cap open ios

# Add Android
npm run ionic:build
npx cap add android
npx cap open android
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Angular](https://angular.io/)
- [Ionic Framework](https://ionicframework.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Neon](https://neon.tech/)

---

Built with ❤️ and 🎮 by [Your Name]
