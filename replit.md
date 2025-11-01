# CMTU-LD Operations Dashboard

## Overview

This is a full-stack web application serving as an operational dashboard for CMTU-LD (municipal urban services management) in Londrina, Brazil. The application provides a map-centric interface for monitoring and managing urban service operations across 1125+ service areas, including mowing (roçagem), garden maintenance, and field team coordination. The primary user is the Mayor and city officials who need real-time visibility into service status, scheduling, and team deployment.

The application combines interactive mapping with service area management, automated scheduling algorithms, and team assignment capabilities. All user-facing content is in Brazilian Portuguese (pt-BR).

## Recent Changes (November 1, 2025)

### UI/UX Organization Improvements (Latest)
- **Selection Button Relocation**: Moved "Selecionar" button from global Services header into Capina e Roçagem tools panel
  - Button now appears as first item in tools panel (before Filtros, Registro Diário, and Legenda)
  - Better contextual organization - all service-specific tools grouped together
  - Full-width button styling for better touch targets on mobile
- **Service Selection Logic Fix**: Removed toggle behavior from service selection
  - Clicking a service item always selects it (no longer deselects if already selected)
  - Prevents accidentally hiding tools panel when clicking current service
  - Maintains consistent UI state for better user experience
- **Theme-Adaptive Logo System**: 
  - Positive version (light mode) with blue/green CMTU colors
  - Negative version (dark mode) with white text for better contrast
  - Automatic switching based on active theme
- **Accordion Behavior**: All service submenus (LIMPEZA URBANA, RESÍDUOS) start collapsed for cleaner initial state

### Daily Mowing Registration System
- **Real Data Import**: Successfully imported all 1125 real service areas from Google Sheets into PostgreSQL database
- **Holiday System**: Comprehensive Brazilian holiday calendar including:
  - National holidays: Ano Novo, Carnaval (mobile), Sexta-feira Santa (mobile), Tiradentes, Trabalhador, Corpus Christi (mobile), Independência, Nossa Senhora Aparecida, Finados, República, Natal
  - Londrina municipal holiday: December 10 (anniversary)
  - Business days calculator that skips both weekends and holidays
- **Automatic Prediction Algorithm**: Implemented in `shared/schedulingAlgorithm.ts` with:
  - Lote-specific production rates (110,000 m²/day for lote 1, 80,000 m²/day for lote 2)
  - Holiday-aware business days calculation
  - Automatic recalculation of all areas when any area is completed
  - Respects manual scheduling flags
- **Daily Registration Interface**: 
  - DailyRegistrationPanel component with "Iniciar Registro" button
  - Map-based area selection with purple visual feedback
  - Date input for registration
  - Batch registration of multiple areas at once
  - Automatic history tracking and forecast recalculation
- **Enhanced Area Information**:
  - Added `ultimaRocagem` field to track last mowing date
  - Complete mowing history display in AreaInfoCard
  - Shows next forecast (`proximaPrevisao`) calculated with business days
- **Database Schema Updates**: Added `ultimaRocagem` field to service_areas table
- **API Endpoints**: New POST /api/areas/register-daily endpoint for batch mowing registration with automatic recalculation

### Production Deployment Ready
- **Dual Storage Architecture**: Application now supports both in-memory (development) and PostgreSQL (production) storage via environment variable detection
- **DbStorage Implementation**: Full Drizzle ORM integration with Neon/Supabase PostgreSQL including all IStorage methods
- **Database Schema**: Created `db/schema.ts` with proper table definitions (service_areas, teams, app_config) using JSONB for complex fields
- **Migration System**: Drizzle Kit configured for schema generation and migration management
- **Seed Scripts**: Automated database population with sample data (20 areas, 6 teams, default config)
- **Vercel Configuration**: Complete `vercel.json` setup for serverless deployment with proper routing
- **Documentation**: Comprehensive DEPLOY.md with step-by-step Supabase and Vercel setup instructions

## Previous Changes (October 31, 2025)

### Color Palette Refinement
- Updated entire application to use deep blue (#1e1c3e) as primary brand color
- Sidebar, map legend, and tooltips now use consistent semi-transparent dark blue backgrounds (rgba(30, 28, 62, 0.95))
- CSS custom properties defined in :root for centralized palette management
- Theme works consistently across light and dark modes

### Manual Batch Scheduling System
- **Schema Extensions**: Added `proximaPrevisao` (next forecast date), `manualSchedule` (boolean flag), and `daysToComplete` fields to ServiceArea model
- **Automatic Scheduling Protection**: Modified `calculateMowingSchedule()` to skip areas flagged with `manualSchedule === true`, preventing automatic recalculation from overwriting user-defined schedules
- **Backend Methods**: Implemented `addHistoryEntry()` and `batchScheduleAreas()` in storage layer
- **API Endpoints**: 
  - `POST /api/areas/:id/history` - Add history entry to area
  - `PATCH /api/areas/batch-schedule` - Schedule multiple areas with manual flag

### Multi-Selection Interface
- **Selection Mode Toggle**: Added "Selecionar" button in sidebar that activates multi-select mode for roçagem areas
- **Visual Feedback**: Selected areas display in purple (#9333ea) to distinguish from status colors
- **Interactive Map**: Click areas to toggle selection; selected state persists across map interactions
- **BatchSchedulePanel Component**: New sidebar panel showing:
  - Selected area counter with purple highlight
  - Date input for scheduled start date
  - Optional days-to-complete input
  - "Limpar" and "Agendar Lote" action buttons
  - Real-time validation and toast notifications

### Enhanced Area Information Card
- **Scheduling Type Badge**: Shows "Manual" or "Automático" badge next to scheduled date
- **Next Forecast Display**: Shows `proximaPrevisao` field when available
- **History Timeline**: Displays last 5 maintenance events with dates and status
- **Inline Editing**: Click "Editar" to transform fields into editable inputs; changes save via PATCH /api/areas/:id with Zod validation
- **State Synchronization**: Implements onUpdate callback chain to ensure selectedArea state updates immediately after saving edits

### Sidebar Redesign
- Implemented dark-themed accordion-style sidebar with expandable sections for "LIMPEZA URBANA" (7 services) and "RESÍDUOS" (5 services)
- Added appropriate Lucide React icons for each service (Scissors for Roçagem, Flower2 for Jardins, etc.)
- Header displays "CMTU Dashboard / Operações em Tempo Real"
- Design matches IBM Carbon System principles with dark background and elevated containers

### Interactive Map Enhancements
- **Tooltips on Hover**: All map markers (areas and teams) display tooltips when hovering with mouse, showing relevant information
- **Draggable Markers**: Areas without polygons can be repositioned by dragging markers; position changes persist automatically
- **Layer Ordering**: Area markers and polygons render above team markers to ensure clickability
- **Selection Visual**: Purple color overlay for selected areas in batch selection mode

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript using Vite as the build tool and development server.

**UI Component System**: Radix UI primitives with shadcn/ui component library configured in "new-york" style. The design follows IBM Carbon Design System principles for enterprise data-heavy applications, prioritizing information clarity, spatial efficiency, and status-first visual language.

**Styling**: Tailwind CSS with custom design tokens defined in CSS variables. The theme supports both light and dark modes with a neutral base color palette. Custom spacing primitives (2, 4, 6, 8, 12, 16) and typography scale using IBM Plex Sans font family.

**Layout Pattern**: Full-screen split layout with a collapsible sidebar (320px desktop, full-width mobile) and a flex-fill map view occupying the remaining viewport. The sidebar contains layer filters, scheduling configuration, and data entry panels.

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. No global state library; component-level state using React hooks.

**Routing**: Wouter for lightweight client-side routing (single main dashboard route).

**Map Integration**: Leaflet.js for interactive mapping with Leaflet.draw plugin for polygon drawing capabilities. Maps display service areas with color-coded status indicators and support layer toggling for different service types and team locations.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript in ESM module format.

**API Design**: RESTful API with resource-based endpoints following conventional HTTP methods:
- GET endpoints for fetching service areas by type (roçagem, jardins), teams, and configuration
- PATCH endpoints for updating area status, schedules, polygons, and configuration
- JSON request/response format with Zod schema validation

**Middleware Stack**: 
- JSON body parsing with raw body preservation for webhook support
- URL-encoded form data parsing
- Request/response logging middleware for API endpoints
- Vite development middleware in development mode

**Development Setup**: Hot Module Replacement (HMR) via Vite with custom error overlays and development banners in Replit environment.

### Data Storage

**Storage Architecture**: Dual-mode storage system with automatic selection based on environment configuration:

**Storage Implementations**:
1. **MemStorage** (In-Memory): Used when `DATABASE_URL` is not set. Ideal for development and testing with zero external dependencies.
2. **DbStorage** (PostgreSQL via Drizzle ORM): Production-ready persistence using Neon/Supabase PostgreSQL. Automatically selected when `DATABASE_URL` environment variable is present.

**Storage Interface** (`IStorage`): Unified abstraction layer ensuring consistent API across both storage modes:
- Service Areas CRUD (get, update, batch operations)
- Team management and assignment
- Configuration persistence
- History tracking and manual scheduling

**Database Schema** (`db/schema.ts`):
- **service_areas**: Roçagem and jardins areas with geographic data, scheduling, history (JSONB), and polygon support
- **teams**: Field teams with real-time location tracking
- **app_config**: System-wide configuration including mowing production rates

**Data Models** (TypeScript types in `shared/schema.ts`):
- **ServiceArea**: Geographic coordinates, polygon boundaries, service type, status (Pendente/Em Execução/Concluído), manual/automatic scheduling flags, history array, next forecast
- **Team**: Service type, operational status, current assignment, location
- **AppConfig**: Production rates for scheduling calculations (m²/day per lote)

**Scheduling Algorithm**: Business logic calculating mowing schedules based on configurable production rates. Algorithm:
- Accounts for business days only (skips weekends)
- Sequences areas by ordem (priority order)
- Respects `manualSchedule` flag (skips manually scheduled areas)
- Calculates days based on area size and production rate

**Persistence Layer**:
- Drizzle ORM with PostgreSQL dialect
- Neon serverless driver (`@neondatabase/serverless`)
- JSONB columns for complex data (history, location, polygon)
- Automatic timestamp tracking (createdAt, updatedAt)

**Migration & Seeding**:
- Schema migrations via Drizzle Kit
- Seed script (`db/seed.ts`) populates initial data
- SQL scripts provided for manual setup in DEPLOY.md

### External Dependencies

**Database Provider**: Neon serverless PostgreSQL (configured but not actively used in current in-memory implementation). Connection via `@neondatabase/serverless` driver.

**ORM**: Drizzle ORM v0.39+ with `drizzle-kit` for schema migrations. Migration files output to `./migrations` directory.

**Session Management**: `connect-pg-simple` for PostgreSQL-backed session storage (available for future authentication implementation).

**Map Services**: 
- Leaflet.js v1.9.4 for base mapping functionality
- Leaflet.draw v1.0.4 for polygon editing tools
- CDN delivery for Leaflet assets in production

**UI Component Libraries**:
- Radix UI primitives (accordion, dialog, dropdown, select, toast, etc.)
- shadcn/ui component collection
- lucide-react for iconography
- class-variance-authority for variant-based component styling

**Form Handling**: React Hook Form with Hookform Resolvers for Zod schema validation integration.

**Utility Libraries**:
- date-fns for date manipulation in scheduling calculations
- clsx and tailwind-merge for className composition
- cmdk for command palette functionality
- Zod for runtime type validation across client and server

**Build Tools**:
- Vite for frontend bundling and development server
- esbuild for server-side bundling in production builds
- TypeScript compiler for type checking
- PostCSS with Autoprefixer for CSS processing

**Development Tools** (Replit-specific):
- `@replit/vite-plugin-runtime-error-modal` for enhanced error reporting
- `@replit/vite-plugin-cartographer` for code navigation
- `@replit/vite-plugin-dev-banner` for development environment indicators