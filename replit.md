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
**Layout Pattern**: Full-screen split layout with a collapsible sidebar for service selection and area details viewing. Primary workflow is map-centric (click marker → quick register).
**State Management**: TanStack Query for server state; component-level state via React hooks.
**Routing**: Wouter for client-side routing.
**Map Integration**: Leaflet.js for interactive mapping with draggable markers for repositioning service areas (PC/mobile support with NaN coordinate validation). Service areas displayed as L.marker with divIcon (16px circular, color-coded, draggable) with 6-tier **forward-looking forecast-based** color-coded visualization (45-day mowing cycle). Categories based on days **until** next scheduled mowing: (1) "Executando" status with subtle blink CSS animation in verde forte #10b981, (2) 0-5 days #10b981, (3) 6-15 days #34d399, (4) 16-25 days #6ee7b7, (5) 26-40 days #a7f3d0, (6) 41-45 days red #ef4444 (cycle end). Interactive legend with **exclusive** clickable category filters (when active, shows ONLY selected category areas) and custom date range picker (from-to dates) for targeted area inspection. CSS animation `marker-blink` (2s duration, opacity fade 1→0.5→1, no scale) applied to areas in execution status. MapLegend component appears first in Capina e Roçagem accordion with default "Todas" filter (shows all 1125+ areas).
**Smart Area Search**: MapHeaderBar autocomplete with intelligent dropdown suggestions (max 8 results) using React Portal for full visibility. Searches across endereço, bairro, and lote with instant local filtering. Features text highlighting with regex special character escaping, full keyboard navigation (ArrowUp/Down, Enter, Escape), and fixed positioning with z-index 1200. Dropdown uses createPortal to render in document.body, avoiding overflow-hidden constraints and ensuring complete visibility.
**Intelligent Map Labels**: Context-aware labeling system that displays permanent, discrete labels (10px font, semi-transparent background, max-width 180px) on map markers **only when active search is present**. Labels show area address or lot number, positioned above markers (direction: 'top', offset -8px). When search is cleared, labels automatically disappear, reverting to hover-only tooltips. CSS supports light/dark modes with `.search-tooltip` and `.search-label` classes. Labels help identify specific areas among filtered results, especially useful when multiple areas match search criteria (e.g., "Centro" returns 29 areas). Implementation uses conditional Leaflet tooltip binding based on `searchQuery` prop passed from dashboard to DashboardMap component.
**Quick Registration Workflow**: Optimized daily workflow for registering mowing operations. Single click on map marker → **MapInfoCard** (floating card over map, 320px width, z-index 1000) displays area info (endereço, bairro, metragem, última roçagem, previsão with relative days) plus primary action button "Registrar Roçagem" (green, prominent) and secondary "Ver Detalhes Completos" → **QuickRegisterModal** opens with required "Nome do Operador" field and date picker (defaults to today, auto-resets on close) → PATCH `/api/areas/:id` with `{ultimaRocagem, registradoPor, dataRegistro}` → invalidates cache → success toast → map updates instantly. Audit trail captures operator name and timestamp for every registration. MapInfoCard replaces sidebar opening for non-selection-mode clicks; "Ver Detalhes" opens sidebar/BottomSheet for full AreaInfoCard access.
**Backup System**: Header-mounted download button (desktop and mobile) exports complete database snapshot via GET `/api/backup`, returning JSON with all service areas, configuration, and statistics. File format: `zeladoria_backup_YYYY-MM-DD.json`.

### Backend Architecture

**Server Framework**: Express.js on Node.js with TypeScript (ESM).
**API Design**: RESTful API with resource-based endpoints (GET, PATCH) for areas, teams, and configuration, using JSON and Zod schema validation.
**Middleware Stack**: JSON body parsing, URL-encoded parsing, request/response logging, and Vite development middleware.
**Performance Optimization**: Hybrid data loading architecture with three specialized endpoints:
  - **GET /api/areas/light**: Returns lightweight area data for map visualization (id, lat, lng, status, proximaPrevisao, lote, servico, endereco, bairro) - ~70% payload reduction. Returns ALL areas in database without viewport bounds filtering (1128 areas currently). Dashboard loads complete dataset on initial render for instant filtering/search without additional API calls.
  - **GET /api/areas/search?q={query}&servico={type}**: Server-side search with database filtering using Drizzle ORM's `ilike` operator (50-result limit)
  - **GET /api/areas/:id**: On-demand full area details when user clicks marker or views details
**Database Search**: Optimized `searchAreas()` method in storage layer with SQL filtering directly in PostgreSQL using `ilike` (case-insensitive) on endereco, bairro, and lote fields.

### Data Storage

**Storage Architecture**: Dual-mode system, automatically switching between in-memory (`MemStorage`) for development and PostgreSQL (`DbStorage`) for production based on the `DATABASE_URL` environment variable.
**Storage Interface**: `IStorage` provides a unified abstraction for CRUD operations on service areas, team management, configuration, and history tracking.
**Database Schema**: Defined in `db/schema.ts` for `service_areas` (geographic data, scheduling, history via JSONB, audit fields), `teams` (real-time location), and `app_config` (mowing production rates).
**Data Models**: TypeScript types (`shared/schema.ts`) for `ServiceArea` (status, scheduling, history, forecast, audit), `Team` (type, status, assignment, location), and `AppConfig`.
**Audit Trail**: Every mowing registration captures `registrado_por` (operator name, TEXT) and `data_registro` (registration timestamp, TIMESTAMP) in `service_areas` table. Backend auto-generates timestamp; frontend enforces operator name input via QuickRegisterModal. Storage layer handles ISO string ↔ Date object conversion for database persistence.
**Scheduling Algorithm**: Calculates mowing schedules based on business days, area size, and production rates, respecting manual scheduling flags.
**Persistence Layer**: Drizzle ORM with PostgreSQL dialect and Neon serverless driver, utilizing JSONB columns and automatic timestamping.
**Migration & Seeding**: Drizzle Kit for schema migrations; `db/seed.ts` for initial data population. Initial service_areas table created via manual SQL due to Drizzle push limitations.
**Production Data Import**: Script `db/import-areas.ts` imports real service areas from CSV files, handling Brazilian number formats (comma decimals, dot thousands), coordinate conversion, automatic 45-day forecast calculation based on lote productivity rates, and batch insertion (100 areas per batch) to avoid timeouts. Currently loaded: 1128 total areas (1125 production + 3 test areas) - Lote 1: 581 areas (avg 5581 m²), Lote 2: 547 areas (avg 4955 m²). Script preserves existing records and validates coordinates before insertion.
**Admin Utilities**: GET `/api/admin/download-csv` (download original CSV), POST `/api/admin/recalculate-schedules` (recalculate mowing forecasts without data loss). Dangerous bulk import and data-clearing endpoints have been permanently removed to prevent accidental production data deletion.

## External Dependencies

**Database Provider**: Neon serverless PostgreSQL (via `@neondatabase/serverless` driver).
**ORM**: Drizzle ORM v0.39+ with `drizzle-kit`.
**Map Services**: Leaflet.js v1.9.4 and Leaflet.draw v1.0.4.
**UI Component Libraries**: Radix UI primitives, shadcn/ui, lucide-react, class-variance-authority.
**Form Handling**: React Hook Form with Hookform Resolvers for Zod validation.
**Utility Libraries**: date-fns, clsx, tailwind-merge, cmdk, Zod.
**Build Tools**: Vite (frontend), esbuild (server-side), TypeScript, PostCSS with Autoprefixer.