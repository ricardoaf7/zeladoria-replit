# CMTU-LD Operations Dashboard - Design Guidelines

## Design Approach: Carbon Design System

**Selected Framework**: IBM Carbon Design System - optimized for enterprise, data-heavy government applications requiring clarity, efficiency, and information density.

**Rationale**: This operations dashboard serves the Mayor and city officials monitoring real-time urban services across 1125+ service areas. Carbon's enterprise-grade components excel at data visualization, complex interactions, and professional governmental interfaces while maintaining accessibility and scalability.

## Core Design Principles

1. **Information Clarity Over Decoration** - Every pixel serves a functional purpose
2. **Status-First Visual Language** - Service states must be instantly recognizable
3. **Spatial Efficiency** - Maximize map real estate while maintaining accessible controls
4. **Hierarchical Data Presentation** - Critical operations information prioritized
5. **Mobile-Ready Field Operations** - Responsive design for on-site team coordination

---

## Typography System

**Font Family**: IBM Plex Sans (Carbon's native typeface)
- Primary: IBM Plex Sans (400, 500, 600 weights)
- Monospace data: IBM Plex Mono for metrics/coordinates

**Type Scale**:
- Page Title (Dashboard Header): 24px / font-semibold
- Section Headers (Sidebar panels): 18px / font-medium
- Service Names & Area Labels: 16px / font-medium
- Body Text (Form labels, descriptions): 14px / font-normal
- Data Points (Metrics, dates, coordinates): 14px / font-mono
- Metadata (Status badges, timestamps): 12px / font-normal
- Map Tooltips: 13px / font-medium

**Line Height**: 1.5 for body text, 1.25 for headings, 1.4 for data tables

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, m-8, gap-6)

**Primary Layout Structure**:
```
[Collapsible Sidebar: 320px desktop, full-width mobile] | [Map: flex-1 full viewport height]
```

**Sidebar Internal Spacing**:
- Panel padding: p-6
- Section gaps: space-y-6
- Form field spacing: space-y-4
- Checkbox/filter groups: space-y-2
- Collapse button: p-4

**Map Container**:
- Full remaining viewport (100vh minus any top bars if added)
- Zero margin/padding for maximum map area
- Overlay controls positioned with absolute positioning

**Modal Dialogs**:
- Max width: max-w-2xl (area details), max-w-4xl (scheduling planner)
- Internal padding: p-8
- Content sections: space-y-6
- Action button groups: gap-4

**Responsive Breakpoints**:
- Mobile: Sidebar collapses to overlay drawer
- Tablet (md:): Sidebar toggleable, 280px when open
- Desktop (lg:+): Sidebar persistent at 320px

---

## Component Library

### Navigation & Controls

**Sidebar Header**:
- Height: h-16
- Contains: App title (text-xl font-semibold), collapse toggle button
- Sticky positioning when sidebar scrollable

**Layer Control Checkboxes**:
- Size: Standard Carbon checkbox (20px)
- Label layout: flex items-center gap-3
- Grouped by service type with subheadings
- Visual separator (border-b) between major groups

**Collapse/Expand Button**:
- Icon-only button on desktop (Heroicons chevron)
- Size: w-10 h-10
- Positioned top-right of sidebar or floating on map edge

### Forms & Data Entry

**Input Fields** (Cadastro/Edição Panel):
- Full width: w-full
- Height: h-10
- Label above input: mb-2
- Border radius: rounded-md
- Focus states with ring treatment

**Form Layout**:
- Single column for mobile
- Two-column grid (grid-cols-2 gap-4) for desktop on wider fields
- Required fields marked with asterisk
- Helper text: text-sm below inputs

**Buttons**:
- Primary action (Desenhar Área): h-10 px-6 rounded-md font-medium
- Secondary actions: h-10 px-4 rounded-md font-normal
- Icon buttons (map controls): w-10 h-10 rounded-md
- Button groups: flex gap-3

### Scheduling Panel (Agendamento)

**Timeline Visualization**:
- Horizontal scrollable timeline for 30-day view
- Date headers: sticky top positioning
- Two swim lanes (Lote 1, Lote 2) stacked vertically
- Area cards: compact (h-12), showing address + scheduled date
- Current day marker: vertical line spanning both lanes

**Production Rate Inputs**:
- Number inputs with suffix labels (m²/dia)
- Inline layout: label + input on same row
- Update button: triggers recalculation

### Map Elements

**Status Indicators** (Map Markers/Polygons):
- Circular markers: 12px diameter (default), 16px (selected/active)
- Polygon stroke width: 2px (default), 4px (selected)
- Pulsing animation: CSS keyframe for "Em Execução" status (2s infinite)

**Team Markers**:
- Custom icon treatment: 24px icons
- Idle state: 50% opacity
- Active assignment: 100% opacity + subtle shadow

**Map Tooltip/Popup**:
- Max width: max-w-xs
- Padding: p-3
- Content: Status badge + address (font-medium) + metadata (text-sm)
- Arrow indicator pointing to location

### Modal Dialogs

**Area Details Modal**:
- Header: h-14, border-b, contains close button
- Content sections: 
  - Detalhes (2-column grid for metadata pairs)
  - Histórico (timeline list with dates on left, events on right)
  - Próximo Serviço (prominent card with date/time)
- Footer: border-t, action buttons right-aligned

**Modal Overlay**: backdrop blur + semi-transparent background

### Status Badges

- Inline display: inline-flex items-center
- Height: h-6
- Padding: px-2.5
- Border radius: rounded-full
- Font: text-xs font-medium uppercase tracking-wide
- Icon prefix (Heroicons): mr-1.5

### Data Tables (Service History)

- Header row: border-b-2, font-medium
- Data rows: border-b, hover state with slight background change
- Cell padding: px-4 py-3
- Alternating rows for readability on longer lists
- Compact mode for mobile: stacked card layout instead of table

---

## Animations & Interactions

**Minimal Motion Philosophy** - Only functional animations:

1. **Sidebar collapse/expand**: 300ms ease transition on width
2. **Modal open/close**: 200ms fade + scale(0.95 to 1) transition
3. **Status pulse** (Em Execução): 2s infinite subtle scale animation
4. **Map zoom/pan**: Leaflet defaults (smooth but not distracting)
5. **Hover states**: 150ms transition on all interactive elements

**No animations on**:
- Data updates/refreshes
- Layer toggles
- Status changes

---

## Accessibility Standards

- **Keyboard Navigation**: Full tab order through sidebar → map controls → modals
- **Focus Indicators**: Visible focus rings (ring-2 ring-offset-2) on all interactive elements
- **ARIA Labels**: Comprehensive labels for icon-only buttons, map markers
- **Screen Reader**: Status announcements for service state changes
- **Contrast**: All text meets WCAG AA standards minimum
- **Touch Targets**: Minimum 44px × 44px for all buttons/checkboxes

---

## Responsive Behavior

**Mobile (< 768px)**:
- Sidebar becomes bottom sheet drawer (slides up from bottom or left)
- Map controls: Floating FAB-style buttons (bottom-right corner)
- Modals: Full-screen takeover (max-h-screen)
- Scheduling timeline: Vertical scroll instead of horizontal

**Tablet (768px - 1024px)**:
- Sidebar toggleable with overlay mode
- Map zoom controls larger touch targets
- Modal maintains max-width but centered

**Desktop (1024px+)**:
- Sidebar persistent and always visible
- Multi-column layouts in modals
- Scheduling panel can show side-by-side Lote comparison

---

## Professional Polish Elements

- **Loading States**: Skeleton screens for map tiles, spinner for data operations
- **Empty States**: Illustrated message when no areas match filters
- **Error Handling**: Toast notifications (bottom-right, auto-dismiss 4s)
- **Confirmation Dialogs**: For destructive actions (concluir serviço)
- **Search/Filter**: Debounced search in area selection dropdowns
- **Breadcrumbs**: Not needed (single-level navigation)
- **Export Function**: Button to download scheduling report (future consideration)