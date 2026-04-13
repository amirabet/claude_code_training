# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack on port 3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests (watch mode)
npm run test -- --run # Run tests once (CI mode)
npm run setup        # Full setup: install + prisma generate + migrate
npm run db:reset     # Reset SQLite database
```

## Architecture

UIGen is an AI-powered React component generator with live preview built on Next.js 15 App Router.

### Core Data Flow

1. User sends a chat message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Server streams Claude responses via Vercel AI SDK `streamText`
3. Claude calls tools (`str_replace_editor`, `file_manager`) to manipulate the virtual file system
4. Updated files stream back to the client and update `FileSystemContext`
5. Preview iframe re-renders using Babel-transpiled JSX

### Virtual File System (`src/lib/file-system.ts`)

All generated code lives in-memory — no disk writes. The `FileSystem` class stores a tree of files and directories with methods: `createFile`, `viewFile`, `replaceInFile`, `deleteFile`, `rename`, `serialize`/`deserialize`. This is passed to the AI tools, persisted to the database as JSON on the `Project.data` field, and consumed by the preview iframe.

### AI Integration (`src/app/api/chat/route.ts`)

- Uses Anthropic claude-haiku-4-5 with prompt caching (ephemeral cache on system + first user message)
- Two AI tools defined in `src/lib/tools/`: `str_replace_editor` (view/create/edit files) and `file_manager` (rename/delete)
- Falls back to a mock provider (`src/lib/provider.ts`) when `ANTHROPIC_API_KEY` is not set
- Saves project state (messages + file system) to SQLite for authenticated users only

### UI Layout (`src/app/main-content.tsx`)

Three-panel resizable layout using `react-resizable-panels`:
- **Left (35%)**: Chat interface (`src/components/chat/`)
- **Right-Top (65%)**: Preview iframe or Code view tabs
- **Right-Bottom** (Code view only): File tree (30%) + Monaco editor (70%)

### JSX Transformation (`src/lib/transform/jsx-transformer.ts`)

Client-side Babel (babel-standalone) transpiles JSX/TSX inside an iframe for safe sandboxed preview. Handles `@/` import aliases and strips CSS imports. The generated component must have `/App.jsx` as the root entry point.

### Authentication (`src/lib/auth.ts`)

JWT-based sessions with httpOnly cookies (7-day expiry). Auth actions live in `src/actions/auth.ts`. Route protection is handled in `src/middleware.ts`. Users and projects are stored in SQLite via Prisma (`prisma/schema.prisma`).

### Generation Prompt (`src/lib/prompts/generation.tsx`)

System prompt rules enforced for all AI generation:
- Root component must be `/App.jsx`
- Use Tailwind CSS only (no inline styles)
- Use `@/` import aliases for local files
- Keep responses brief unless user asks for a summary

## Versioning

On every commit, always state whether a new version should be released. Use [SemVer](https://semver.org/) (MAJOR.MINOR.PATCH) and maintain a changelog entry describing what changed.

## Environment Variables

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Uses mock provider |
| `JWT_SECRET` | No | Insecure dev default |

Database is SQLite at `prisma/dev.db`.
