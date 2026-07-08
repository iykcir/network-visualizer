# Network Visualizer

A ministry network visualization tool for planning and managing org structure across regions, cities, and ministries. Built with React + Vite.

## Features

- **3-level navigation** — Region tabs → City cards → Ministry DAG
- **Membership API integration** — Pulls live data directly from [tribe.gracepointonline.org](https://tribe.gracepointonline.org) via Vite proxy (no CORS issues, read-only)
- **Ministry DAG** — Draw directed relationships between ministries within a city using dagre layout; edges persist across sessions
- **Role auto-assignment** — `ft_lead` → Driver; `team` / `staff` / `lead` → Team; everything else → Member; fully overridable per value in the mapping screen
- **People listing** — Sorted by peer class (oldest first); married couples displayed side-by-side
- **City region overrides** — Pin any city to one or more regions via a per-card dropdown; overrides are persistent and survive re-imports
- **City filter pills** — Header filter scopes the city cards row and updates region tab counts in real time
- **Drag-and-drop** — Reassign people between role sections; changes tracked and exportable
- **Export plan** — Download a CSV of all manual reassignments for offline review

## Setup

### Prerequisites

- Node.js 18+
- Access to the membership API (API key stored on your membership profile)

### Install

```bash
npm install
```

### Configure the membership server

Create `.env.local` (gitignored):

```
MEMBERSHIP_URL=https://tribe.gracepointonline.org
```

Leave this out or set to `http://localhost:3000` if running the membership server locally.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Connecting to membership data

1. Click **Membership API** tab on the import screen
2. Leave the URL as `/membership-api` (Vite proxies it to the configured server)
3. Enter your `api_key` attribute value from your membership profile
4. Click **Load from membership** — all attributes are fetched; known fields are pre-mapped automatically
5. Confirm the column mapping and click **Import**

Once imported, click **Refresh from API** in the header to pull fresh data without going through the mapping screen again.

### Field mapping defaults

| Visualizer field | Membership attribute |
|-----------------|---------------------|
| Name | `name` |
| City | `church` |
| Ministry | `ministry` |
| Role | `ministry_level` |
| Peer class | `peer_class` |
| Region | `region` |
| Children | `children_count` |
| Spouse pairing | `spouse` (membership ID) |

## Ministry DAG

Within each city, ministries are laid out as a directed acyclic graph using [dagre](https://github.com/dagrejs/dagre). To draw a relationship:

1. Click the **⟶** button on the source ministry card
2. Click the **↗** button on the target ministry card
3. Click **×** on an edge midpoint to remove it

DAG edges are stored per `region::city` key and persist across sessions.

## City region overrides

If a city's `region` attribute is missing or incorrect in membership data, you can pin it manually:

- Click the region label at the bottom of any city card
- Check one or more regions in the dropdown
- The city immediately appears in those region tabs
- A city can belong to multiple regions simultaneously
- Overrides survive re-imports and page reloads

## Architecture

```
src/
  components/
    Board.jsx          # 3-level navigation: region tabs, city cards, DAG view
    CityDAG.jsx        # Dagre-based ministry graph with SVG edge overlay
    Header.jsx         # Search, city filter pills, refresh, export
    ImportScreen.jsx   # File upload + Membership API connection + column mapping
    MinistryCard.jsx   # Collapsible card with role sections
    PersonChip.jsx     # Draggable person chip
    PersonDetailModal.jsx
    RoleSection.jsx    # Driver / Team / Member drop zones with couple pairing
  store/
    useStore.js        # Zustand store with persist middleware
  utils/
    membershipApi.js   # Fetch + transform membership API response
    colors.js          # City color palette and role styles
    fileParser.js      # CSV / XLSX / ODS parser
```

State is persisted to `localStorage` under the key `network-visualizer-v1`. All data is local — the app never writes back to the membership API.

## Development

```bash
npm run dev      # start dev server with HMR
npm run build    # production build
npm run lint     # ESLint
```
