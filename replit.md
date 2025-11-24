# CMTU-LD Operations Dashboard - "Zeladoria em Tempo Real"

## 🏗️ Arquitetura Modular (v1.0 - Nov 2025)

**IMPORTANTE**: Sistema refatorado para isolamento completo de módulos. Cada serviço (Rocagem, Jardins, etc.) é independente. Ao trocar de serviço, o anterior é 100% desmontado. Veja `DIRETRIZES_ARQUITETURA.md` e `MODULOS_GUIA_PRATICO.md` para detalhes.

## Overview

This full-stack web application, branded as "Zeladoria em Tempo Real," is an operational dashboard for CMTU-LD in Londrina, Brazil. It monitors and manages urban services like mowing and garden maintenance across 1125+ service areas through a map-centric interface. The primary users are the Mayor and city officials, who require real-time visibility into service status, scheduling, and team deployment. The application features interactive mapping, service area management, automated scheduling, and team assignment, with all content presented in Brazilian Portuguese. It is also implemented as a Progressive Web App (PWA) for native-like mobile experience.

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
**Map Integration**: Leaflet.js for interactive mapping with draggable markers for repositioning service areas (PC/mobile support with NaN coordinate validation). Service areas displayed as L.marker with divIcon (16px circular, color-coded, draggable) with 7-tier **backward-looking (days since last mowing)** color-coded visualization (60-day mowing cycle). Categories based on days **since** last mowing: (1) "Executando" status with subtle blink CSS animation in verde forte #10b981, (2) 1-5 days Azul #0086ff, (3) 6-15 days Verde-azulado #139b89, (4) 16-30 dias Laranja #fe8963, (5) 31-45 dias Bege/Marrom #b79689, (6) 46-60 dias Roxo #a08ee9, (7) +60 dias Vermelho #ea3c27, (8) "Sem Registro" (areas never mowed) Cinza #c0c0c0. Interactive legend with **exclusive** clickable category filters (when active, shows ONLY selected category areas) and custom date range picker (from-to dates) for targeted area inspection. CSS animation `marker-blink` (2s duration, opacity fade 1→0.5→1, no scale) applied to areas in execution status. MapLegend component appears first in Capina e Roçagem accordion with default "Todas" filter (shows all 1128 areas).
**Smart Area Search**: MapHeaderBar autocomplete with intelligent dropdown suggestions (max 8 results) using React Portal for full visibility. Searches across endereço, bairro, and lote with instant local filtering. Features text highlighting with regex special character escaping, full keyboard navigation (ArrowUp/Down, Enter, Escape), and fixed positioning with z-index 1200. Dropdown uses createPortal to render in document.body, avoiding overflow-hidden constraints and ensuring complete visibility.
**Intelligent Map Labels**: Context-aware labeling system that displays permanent, discrete labels (10px font, semi-transparent background, max-width 180px) on map markers **only when active search is present**. Labels show area address or lot number, positioned above markers (direction: 'top', offset -8px). When search is cleared, labels automatically disappear, reverting to hover-only tooltips. CSS supports light/dark modes with `.search-tooltip` and `.search-label` classes. Labels help identify specific areas among filtered results, especially useful when multiple areas match search criteria (e.g., "Centro" returns 29 areas). Implementation uses conditional Leaflet tooltip binding based on `searchQuery` prop passed from dashboard to DashboardMap component.
**Quick Registration Workflow**: Optimized daily workflow for registering mowing operations. Single click on map marker → **MapInfoCard** (floating card over map, 320px width, z-index 1000) displays area info (endereço, bairro, metragem, última roçagem, previsão with relative days) plus primary action button "Registrar Roçagem" (green, prominent) and secondary "Ver Detalhes Completos" → **QuickRegisterModal** opens with date input featuring **automatic numeric masking** (user types only numbers like "301025" → auto-formats to "30/10/2025" with slash insertion and year expansion for 2-digit years: 00-49→20xx, 50-99→19xx) for 50% faster data entry, defaults to today, auto-resets on close → PATCH `/api/areas/:id` with `{ultimaRocagem, registradoPor, dataRegistro}` → invalidates cache (both light areas and individual area queries) → success toast → map updates instantly. Audit trail captures operator name and timestamp for every registration. MapInfoCard replaces sidebar opening for non-selection-mode clicks; "Ver Detalhes" opens sidebar/BottomSheet for full AreaInfoCard access.
**New Area Registration**: Click anywhere on map (outside existing markers) → **NewAreaModal** opens with captured coordinates → automatic **reverse geocoding** (Nominatim/OpenStreetMap) pre-fills endereço and bairro → user completes form using **React Hook Form + zodResolver** with Zod validation (tipo, endereço*, bairro, metragem_m2, lote 1-2) → sanitization prevents NaN submissions → POST `/api/areas` with automatic `proximaPrevisao` calculation (if ultimaRocagem provided), servico="rocagem" default, status="Pendente" → backend validates via Zod schema (lote 1-2, metragem positive, servico enum) → new marker appears on map → cache invalidated for all services (rocagem + jardins) → success toast. Supports both desktop and mobile with full RHF integration and error handling.
**Backup System**: Header-mounted download button (desktop and mobile) exports complete database snapshot via GET `/api/backup`, returning JSON with all service areas, configuration, and statistics. File format: `zeladoria_backup_YYYY-MM-DD.json`.
**CSV Export System**: Header-mounted CSV export button (FileText icon) opens ExportDialog modal with two modes: (1) **Full Export** - exports all service_areas records for initial Supabase migration, (2) **Incremental Export** - exports only records modified since last export (based on `updatedAt` timestamp), with automatic fallback to full export if no previous export exists. Endpoint GET `/api/export/csv?mode={full|incremental}` generates CSV optimized for Supabase import with proper JSONB/array escaping, lowercase_underscore headers, and ISO timestamps. Each export is tracked in `export_history` table (scope, export_type, record_count, duration_ms, exported_at) for incremental filtering. Toast notifications provide user feedback; files downloaded as `supabase_export_YYYY-MM-DD_HHmmss.csv`.

### Backend Architecture

**Server Framework**: Express.js on Node.js with TypeScript (ESM).
**API Design**: RESTful API with resource-based endpoints (GET, POST, PATCH) for areas, teams, and configuration, using JSON and Zod schema validation. Includes geocoding integration (GET `/api/geocode/search`, GET `/api/geocode/reverse`) via Nominatim/OpenStreetMap for address lookup and reverse geocoding.
**Middleware Stack**: JSON body parsing, URL-encoded parsing, request/response logging, and Vite development middleware.
**Performance Optimization**: Hybrid data loading architecture with three specialized endpoints:
  - **GET /api/areas/light**: Returns lightweight area data for map visualization (id, lat, lng, status, proximaPrevisao, lote, servico, endereco, bairro) - ~70% payload reduction. Returns ALL areas in database without viewport bounds filtering (1128 areas currently). Dashboard loads complete dataset on initial render for instant filtering/search without additional API calls.
  - **GET /api/areas/search?q={query}&servico={type}**: Server-side search with database filtering using Drizzle ORM's `ilike` operator (50-result limit)
  - **GET /api/areas/:id**: On-demand full area details when user clicks marker or views details
**Database Search**: Optimized `searchAreas()` method in storage layer with SQL filtering directly in PostgreSQL using `ilike` (case-insensitive) on endereco, bairro, and lote fields.

### Data Storage

**Storage Architecture**: Dual-mode system, automatically switching between in-memory (`MemStorage`) for development and PostgreSQL (`DbStorage`) for production based on the `DATABASE_URL` environment variable. **Important**: Development and production environments share the same PostgreSQL database (Neon) - data imported or modified in development is immediately available in production.
**Storage Interface**: `IStorage` provides a unified abstraction for CRUD operations on service areas, team management, configuration, and history tracking.
**Database Schema**: Defined in `shared/schema.ts` (consolidated Zod types + Drizzle table definitions) for `service_areas` (geographic data, scheduling, history via JSONB, audit fields), `teams` (real-time location), `app_config` (mowing production rates), and `export_history` (CSV export tracking for incremental exports).
**Data Models**: TypeScript types (`shared/schema.ts`) for `ServiceArea` (status, scheduling, history, forecast, audit), `Team` (type, status, assignment, location), and `AppConfig`.
**Audit Trail**: Every mowing registration captures `registrado_por` (operator name, TEXT) and `data_registro` (registration timestamp, TIMESTAMP) in `service_areas` table. Backend auto-generates timestamp; frontend enforces operator name input via QuickRegisterModal. Storage layer handles ISO string ↔ Date object conversion for database persistence.
**Scheduling Algorithm**: Calculates mowing schedules based on 60-day fixed cycles. Próxima roçagem = Última roçagem + 60 dias. Respects manual scheduling flags when set. For areas that have never been mowed, no forecast is calculated until first registration.
**Persistence Layer**: Drizzle ORM with PostgreSQL dialect and Neon serverless driver, utilizing JSONB columns and automatic timestamping.
**Migration & Seeding**: Drizzle Kit for schema migrations; `db/seed.ts` for initial data population. Initial service_areas table created via manual SQL due to Drizzle push limitations.
**Production Data Import**: Script `db/import-areas.ts` imports real service areas from CSV files, handling Brazilian number formats (comma decimals, dot thousands), coordinate conversion, automatic 60-day forecast calculation based on lote productivity rates, and batch insertion (100 areas per batch) to avoid timeouts. Currently loaded: 1128 total areas (1125 production + 3 test areas) - Lote 1: 581 areas (avg 5581 m²), Lote 2: 547 areas (avg 4955 m²). Script preserves existing records and validates coordinates before insertion.
**Admin Utilities**: GET `/api/admin/download-csv` (download original CSV), POST `/api/admin/recalculate-schedules` (recalculate mowing forecasts without data loss). Dangerous bulk import and data-clearing endpoints have been permanently removed to prevent accidental production data deletion.

## External Dependencies

**Database Provider**: Neon serverless PostgreSQL (via `@neondatabase/serverless` driver).
**ORM**: Drizzle ORM v0.39+ with `drizzle-kit`.
**Map Services**: Leaflet.js v1.9.4 and Leaflet.draw v1.0.4.
**UI Component Libraries**: Radix UI primitives, shadcn/ui, lucide-react, class-variance-authority.
**Form Handling**: React Hook Form with Hookform Resolvers for Zod validation.
**Utility Libraries**: date-fns, clsx, tailwind-merge, cmdk, Zod.
**Build Tools**: Vite (frontend), esbuild (server-side), TypeScript, PostCSS with Autoprefixer.