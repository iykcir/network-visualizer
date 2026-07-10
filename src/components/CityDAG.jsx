import { useState, useMemo, useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import MinistryCard from './MinistryCard';
import useStore from '../store/useStore';

// Approximate card height used by dagre for spacing.
// Actual rendered heights may vary; cards won't overlap because
// we use overflow-visible and the estimate is generous.
const NODE_W = 260;
const NODE_H = 240;

const EMPTY_EDGES = [];

function computeLayout(ministries, edges) {
  if (ministries.length === 0) return { positions: {}, canvasW: 0, canvasH: 0 };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 40, marginx: 0, marginy: 0 });

  ministries.forEach(m => g.setNode(m, { width: NODE_W, height: NODE_H }));
  edges.forEach(({ source, target }) => {
    if (ministries.includes(source) && ministries.includes(target)) {
      g.setEdge(source, target);
    }
  });

  dagre.layout(g);

  const positions = {};
  let maxX = 0, maxY = 0;
  ministries.forEach(m => {
    const n = g.node(m);
    positions[m] = { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 };
    maxX = Math.max(maxX, n.x + NODE_W / 2);
    maxY = Math.max(maxY, n.y + NODE_H / 2);
  });

  return { positions, canvasW: maxX, canvasH: maxY };
}

export default function CityDAG({ city, region, cityColor }) {
  const getMinistriesInCity = useStore(s => s.getMinistriesInCity);
  const ministryEdges = useStore(s => s.ministryEdges);
  const setMinistryEdges = useStore(s => s.setMinistryEdges);

  const [connecting, setConnecting] = useState(null);

  const cityKey = `${region ?? ''}::${city}`;
  const ministries = getMinistriesInCity(city, region);
  const edges = ministryEdges[cityKey] ?? EMPTY_EDGES;

  // ministries/edges are new array references on every render, so key them
  // by content to avoid re-running the dagre layout unnecessarily.
  const ministriesKey = ministries.join('\x00');
  const edgesKey = useMemo(() => JSON.stringify(edges), [edges]);

  const { positions, canvasW, canvasH } = useMemo(
    () => computeLayout(ministries, edges),
    [ministriesKey, edgesKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleNodeClick = useCallback((m) => {
    if (!connecting) {
      setConnecting(m);
      return;
    }
    if (connecting === m) {
      setConnecting(null);
      return;
    }
    const id = `${connecting}→${m}`;
    if (!edges.some(e => e.id === id)) {
      setMinistryEdges(cityKey, [...edges, { id, source: connecting, target: m }]);
    }
    setConnecting(null);
  }, [connecting, edges, cityKey, setMinistryEdges]);

  const removeEdge = useCallback((id, evt) => {
    evt.stopPropagation();
    setMinistryEdges(cityKey, edges.filter(e => e.id !== id));
  }, [edges, cityKey, setMinistryEdges]);

  if (ministries.length === 0) {
    return <div className="text-center text-slate-500 text-sm py-8">No ministries</div>;
  }

  // Unique marker ID per city so multiple cities on screen don't clash
  const markerId = `dag-arrow-${city.replace(/\s+/g, '-')}`;

  return (
    <div
      className="relative pb-4 pr-1"
      style={{ minWidth: canvasW, minHeight: canvasH + 16 }}
      onClick={() => connecting && setConnecting(null)}
    >
      {/* SVG edge layer — sits behind the cards */}
      <svg
        style={{
          position: 'absolute', top: 0, left: 0,
          width: canvasW, height: canvasH,
          pointerEvents: 'none', overflow: 'visible',
        }}
      >
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
          </marker>
        </defs>

        {edges.map(edge => {
          const src = positions[edge.source];
          const tgt = positions[edge.target];
          if (!src || !tgt) return null;

          const x1 = src.x + NODE_W / 2;
          const y1 = src.y + NODE_H;
          const x2 = tgt.x + NODE_W / 2;
          const y2 = tgt.y;
          const midCy = (y1 + y2) / 2;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          return (
            <g key={edge.id}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midCy}, ${x2} ${midCy}, ${x2} ${y2}`}
                stroke="#64748b"
                strokeWidth={2}
                fill="none"
                markerEnd={`url(#${markerId})`}
              />
              {/* Delete badge — re-enable pointer events for this element only */}
              <g
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={e => removeEdge(edge.id, e)}
                title="Remove connection"
              >
                <circle cx={mx} cy={my} r={9} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#94a3b8">×</text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Ministry card nodes */}
      {ministries.map(m => {
        const pos = positions[m];
        if (!pos) return null;
        const isSource = connecting === m;
        const isTarget = !!connecting && connecting !== m;

        return (
          <div
            key={m}
            style={{ position: 'absolute', left: pos.x, top: pos.y, width: NODE_W }}
          >
            <MinistryCard
              region={region}
              city={city}
              ministryName={m}
              cityColor={cityColor}
            />

            {/* Connect button — top-right corner of each card */}
            <button
              title={
                isSource ? 'Cancel connection'
                  : isTarget ? `Connect from "${connecting}" → "${m}"`
                  : 'Connect to another ministry'
              }
              onClick={e => { e.stopPropagation(); handleNodeClick(m); }}
              className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center
                border shadow transition-colors z-10
                ${isSource
                  ? 'bg-indigo-500 border-indigo-300 text-white'
                  : isTarget
                  ? 'bg-emerald-500 border-emerald-300 text-white animate-pulse'
                  : 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
            >
              {isSource ? '✕' : isTarget ? '↗' : '⟶'}
            </button>
          </div>
        );
      })}

      {/* Connecting hint */}
      {connecting && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
          <span className="text-xs bg-indigo-900/80 text-indigo-200 rounded-full px-3 py-1">
            Click another ministry to connect · click elsewhere to cancel
          </span>
        </div>
      )}
    </div>
  );
}
