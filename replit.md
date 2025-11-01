# CMTU-LD Operations Dashboard

## Overview

This full-stack web application, branded as "Zeladoria LD," is an operational dashboard for CMTU-LD in Londrina, Brazil. It monitors and manages urban services like mowing and garden maintenance across 1125+ service areas through a map-centric interface. The primary users are the Mayor and city officials, who require real-time visibility into service status, scheduling, and team deployment. The application features interactive mapping, service area management, automated scheduling, and team assignment, with all content presented in Brazilian Portuguese. It is also implemented as a Progressive Web App (PWA) for native-like mobile experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript using Vite.
**UI Component System**: Radix UI primitives and shadcn/ui components, adhering to IBM Carbon Design System principles for enterprise data applications.
**Styling**: Tailwind CSS with custom design tokens, supporting light/dark modes and using IBM Plex Sans font.
**Layout Pattern**: Full-screen split layout with a collapsible sidebar for filters, scheduling, and data entry, and a map view.
**State Management**: TanStack Query for server state; component-level state via React hooks.
**Routing**: Wouter for client-side routing.
**Map Integration**: Leaflet.js for interactive mapping, including Leaflet.draw for polygon editing. Displays color-coded service areas and team locations.

### Backend Architecture

**Server Framework**: Express.js on Node.js with TypeScript (ESM).
**API Design**: RESTful API with resource-based endpoints (GET, PATCH) for areas, teams, and configuration, using JSON and Zod schema validation.
**Middleware Stack**: JSON body parsing, URL-encoded parsing, request/response logging, and Vite development middleware.

### Data Storage

**Storage Architecture**: Dual-mode system, automatically switching between in-memory (`MemStorage`) for development and PostgreSQL (`DbStorage`) for production based on the `DATABASE_URL` environment variable.
**Storage Interface**: `IStorage` provides a unified abstraction for CRUD operations on service areas, team management, configuration, and history tracking.
**Database Schema**: Defined in `db/schema.ts` for `service_areas` (geographic data, scheduling, history via JSONB), `teams` (real-time location), and `app_config` (mowing production rates).
**Data Models**: TypeScript types (`shared/schema.ts`) for `ServiceArea` (status, scheduling, history, forecast), `Team` (type, status, assignment, location), and `AppConfig`.
**Scheduling Algorithm**: Calculates mowing schedules based on business days, area size, and production rates, respecting manual scheduling flags.
**Persistence Layer**: Drizzle ORM with PostgreSQL dialect and Neon serverless driver, utilizing JSONB columns and automatic timestamping.
**Migration & Seeding**: Drizzle Kit for schema migrations; `db/seed.ts` for initial data population.

## External Dependencies

**Database Provider**: Neon serverless PostgreSQL (via `@neondatabase/serverless` driver).
**ORM**: Drizzle ORM v0.39+ with `drizzle-kit`.
**Map Services**: Leaflet.js v1.9.4 and Leaflet.draw v1.0.4.
**UI Component Libraries**: Radix UI primitives, shadcn/ui, lucide-react, class-variance-authority.
**Form Handling**: React Hook Form with Hookform Resolvers for Zod validation.
**Utility Libraries**: date-fns, clsx, tailwind-merge, cmdk, Zod.
**Build Tools**: Vite (frontend), esbuild (server-side), TypeScript, PostCSS with Autoprefixer.