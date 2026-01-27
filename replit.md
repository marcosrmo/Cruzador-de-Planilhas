# Cruzador de Planilhas

## Overview

A web application that helps businesses cross-reference client spreadsheets with debtor spreadsheets to extract phone numbers for debt collection purposes. Users upload two Excel files (one with client names and phone numbers, another with debtor names), and the system generates a third spreadsheet containing only the matching records with their phone numbers.

The application processes everything client-side in the browser using JavaScript/TypeScript, with no server-side data processing required for the core functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server**: Node.js HTTP server
- **Development**: Vite dev server middleware for HMR during development
- **Production**: Static file serving from built assets

### Data Processing
- **Excel Processing**: XLSX library for reading/writing Excel files (runs entirely in browser)
- **Matching Algorithm**: Fuzzy text matching using Levenshtein distance for name comparison
- **Text Normalization**: Unicode normalization to handle accented characters

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Users table for authentication (prepared but authentication not fully implemented)
- **Storage**: In-memory storage interface with database-ready abstraction

### Build System
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs`
- **Deployment**: Configured for Render static site or full-stack deployment

## External Dependencies

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable
- **Drizzle Kit**: For database migrations and schema management

### Authentication (Planned)
- **Passport.js**: Local strategy for username/password auth
- **Express Session**: Session management with PostgreSQL store via connect-pg-simple
- **Password Hashing**: scrypt for secure password storage

### Key NPM Packages
- `xlsx`: Excel file parsing and generation
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod schema integration
- `@tanstack/react-query`: Data fetching and caching
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework

### Deployment Platforms
- **Render**: Primary deployment target (static site or web service)
- **Replit**: Development and alternative hosting platform