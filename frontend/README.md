# DVWS-Node Svelte Frontend

Modern, professional frontend rewrite for DVWS-Node (Damn Vulnerable Web Services) using Svelte 5.


## Technology Stack

- **Framework:** SvelteKit 2.x with Svelte 5 (runes mode)
- **Language:** TypeScript
- **Styling:** Custom CSS (Tailwind-like utilities)
- **HTTP Client:** Axios
- **Build Tool:** Vite 8.x
- **Deployment:** Static adapter (serves from Express.js)

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── api/              # API client with JWT injection
│   │   ├── stores/           # Svelte stores (auth, notifications)
│   │   ├── components/
│   │   │   ├── ui/           # Reusable UI components
│   │   │   ├── layout/       # Layout components (Sidebar, TopBar)
│   │   │   └── vulnerable/   # Intentionally vulnerable components
│   │   ├── utils/            # Utilities (passgen.js)
│   │   └── types/            # TypeScript types
│   ├── routes/
│   │   ├── +page.svelte              # Login/Register
│   │   ├── (app)/                    # Protected routes
│   │   │   ├── dashboard/            # Dashboard
│   │   │   ├── notes/                # Notes CRUD + Import
│   │   │   ├── admin/                # Admin panel
│   │   │   ├── profile/              # Profile export/import
│   │   │   ├── search/               # Public notes search
│   │   │   ├── passphrase/           # Passphrase generator
│   │   │   └── files/                # File upload/download
│   │   └── logout/                   # Logout
│   └── app.css               # Global styles
├── build/                    # Production build (gitignored)
└── static/                   # Static assets
```

## Development

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later

### Setup

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output: `build/` directory

### Preview Production Build

```bash
npm run preview
```
