# DVWS-Node frontend

The frontend is a SvelteKit 2 application using Svelte 5, TypeScript, Vite, and Axios. Express serves the production build.

## Layout

```text
src/
├── lib/
│   ├── api/          API client
│   ├── stores/       auth and notifications
│   ├── components/   shared UI and vulnerable examples
│   ├── types/        TypeScript types
│   └── utils/        small helpers
└── routes/
    ├── +page.svelte  login and registration
    └── (app)/        dashboard, notes, admin, profile, search, files
```

## Development

Requires Node.js 20 or newer and npm 10 or newer.

```sh
cd frontend
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

Build or preview the production version with:

```sh
npm run build
npm run preview
```
