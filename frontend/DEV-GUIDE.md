# TURATHYA - Development Guide

## 🚀 Quick Start - Run Local Preview

### Option 1: Using Live Server (Recommended - Auto-reload)

This is the best option as it automatically reloads the browser when you make changes.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

   This will:
   - Start a local server at `http://localhost:8000`
   - Automatically open your browser
   - Auto-reload when you save changes to HTML, CSS, or JS files

### Option 2: Using Python (Simple HTTP Server)

If you have Python installed, you can use this simpler option (no auto-reload):

```bash
npm start
```

Then open your browser to: `http://localhost:8000`

### Option 3: Using VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📁 Project Structure

```
TURATHYA/
├── index.html              # Homepage
├── pages/                  # All main pages
│   ├── login.html
│   ├── register.html
│   ├── auctions.html       # Browse all auctions
│   ├── auction.html        # Single auction detail
│   ├── lot.html           # Single lot detail
│   ├── collection.html     # User's collection/watchlist
│   ├── account.html        # User account
│   └── admin.html         # Admin panel
├── partials/
│   └── header.html         # Shared header navigation
├── css/                    # Stylesheets
├── js/                     # JavaScript files
│   ├── i18n.js            # Language/translation system
│   ├── auth.js            # Authentication
│   ├── api.js             # Backend API calls
│   └── ...
└── locales/               # Translations
    ├── en.json
    └── ar.json
```

## 🔗 Navigation Links

All pages are now connected via the header navigation:

- **Home** (`index.html`) - Landing page with featured auctions
- **Auctions** (`pages/auctions.html`) - Browse all active auctions
- **Collection** (`pages/collection.html`) - User's watchlist
- **Account** (`pages/account.html`) - User profile (requires login)
- **Admin** (`pages/admin.html`) - Admin panel (requires admin login)
- **Login** (`pages/login.html`) - User login
- **Register** (`pages/register.html`) - New user registration

## 🌍 Language Support

The site supports English and Arabic with automatic RTL layout for Arabic:

- Click "EN" or "العربية" in the header to switch languages
- Language preference is saved to localStorage
- All text is translated via the `locales/` JSON files

## 🔧 Making Changes

1. **Edit HTML files** - Changes will auto-reload (if using npm run dev)
2. **Edit CSS files** - Located in `css/` directory
3. **Edit JavaScript** - Located in `js/` directory
4. **Add translations** - Update `locales/en.json` and `locales/ar.json`

## 🎨 Key Features

- ✅ Responsive design (mobile, tablet, desktop)
- ✅ RTL support for Arabic
- ✅ Dark/light theme toggle
- ✅ Real-time auction countdown timers
- ✅ Watchlist functionality
- ✅ Admin panel for managing auctions/lots
- ✅ Authentication system

## 🔌 Backend Connection

The frontend connects to the Node.js backend in `zauction-backend/`:

- Backend API: `http://localhost:3000`
- See `zauction-backend/SETUP_GUIDE.md` for backend setup
- Configure API endpoint in `js/api.js`

## 📝 Tips

- Use browser DevTools (F12) to debug
- Check the Console for errors
- Network tab shows API requests
- Use `localStorage.clear()` in console to reset stored data

## 🐛 Troubleshooting

**Header not loading?**
- Check browser console for errors
- Ensure you're running via a web server (not opening files directly)

**Translations not working?**
- Verify `locales/en.json` and `locales/ar.json` exist
- Check browser console for 404 errors

**Pages not connecting?**
- All navigation should work via the header
- Make sure you're accessing pages through the server

---

Happy coding! 🎉
