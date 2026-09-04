'use client';

import { motion } from 'motion/react';

/**
 * Small decorative evidence board: nodes fade in, then the connecting
 * lines draw themselves. Reused on the auth screens and the landing hero.
 */
const NODES = [
  { id: 'case', label: 'Case', x: 150, y: 96, accent: true },
  { id: 'person', label: 'Person', x: 40, y: 30 },
  { id: 'doc', label: 'Document', x: 258, y: 34 },
  { id: 'video', label: 'Interview', x: 44, y: 168 },
  { id: 'claim', label: 'Claim', x: 262, y: 166 },
];

const EDGES = [
  { from: 'person', to: 'case', label: 'works at' },
  { from: 'doc', to: 'case', label: 'mentions' },
  { from: 'video', to: 'case', label: 'evidence' },
  { from: 'claim', to: 'case', label: 'supports' },
];

const byId = (id) => NODES.find((n) => n.id === id);

export default function MiniGraph({ className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 360 230" className="h-full w-full overflow-visible">
        {EDGES.map((edge, i) => {
          const a = byId(edge.from);
          const b = byId(edge.to);
          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={a.x + 36}
              y1={a.y + 14}
              x2={b.x + 30}
              y2={b.y + 14}
              stroke="#b0b0aa"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.16, duration: 0.7, ease: 'easeInOut' }}
            />
          );
        })}

        {NODES.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 260, damping: 22 }}
            style={{ originX: '50%', originY: '50%' }}
          >
            <rect
              x={node.x}
              y={node.y}
              width={node.accent ? 60 : 72}
              height={28}
              rx={9}
              fill={node.accent ? '#e2445c' : '#ffffff'}
              stroke={node.accent ? '#e2445c' : '#d3d3cf'}
              strokeWidth="1"
            />
            <text
              x={node.x + (node.accent ? 30 : 36)}
              y={node.y + 18}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="500"
              fill={node.accent ? '#ffffff' : '#54544e'}
            >
              {node.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
