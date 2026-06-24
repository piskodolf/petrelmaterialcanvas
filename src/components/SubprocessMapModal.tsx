import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node as RFNode,
  type Edge as RFEdge,
  MarkerType,
} from '@xyflow/react';
import { X, Network, Layers, ArrowRight } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';

interface SubprocessMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  edges: any[];
}

// Custom Subprocess Node Component inside the map
const SubprocessNodeComponent = ({ data }: any) => {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      border: `2px solid ${data.color || 'var(--border-subtle)'}`,
      borderRadius: '12px',
      padding: '16px',
      minWidth: '200px',
      color: 'var(--text-main)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Left} id="left" style={{ background: data.color }} />
      <Handle type="target" position={Position.Top} id="top" style={{ background: data.color }} />
      
      {/* Source Handles */}
      <Handle type="source" position={Position.Right} id="right" style={{ background: data.color }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: data.color }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: data.color }} />
        <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.3px' }}>{data.label}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Število elementov:</span>
          <strong style={{ color: 'var(--text-main)' }}>{data.elementCount}</strong>
        </div>
        {data.elements.length > 0 && (
          <div style={{ marginTop: '4px', fontSize: '10px', maxHeight: '60px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {data.elements.map((elName: string, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', borderLeft: `2px solid ${data.color}` }}>
                {elName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  subprocessNode: SubprocessNodeComponent,
};

export const SubprocessMapModal: React.FC<SubprocessMapModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
}) => {
  const { savedSubprocesses } = useMaterials();

  // Compute High-Level Subprocess Graph
  const { mapNodes, mapEdges } = useMemo(() => {
    if (!isOpen) return { mapNodes: [], mapEdges: [] };

    // 1. Group nodes by subprocess
    const nodesBySub: Record<string, any[]> = {};
    savedSubprocesses.forEach(sub => {
      nodesBySub[sub.id] = [];
    });

    nodes.forEach(n => {
      if (n.type === 'process' && n.data?.subprocess) {
        const subId = n.data.subprocess;
        if (nodesBySub[subId]) {
          nodesBySub[subId].push(n);
        }
      }
    });

    // 2. Generate circular layout for subprocess nodes
    const activeSubprocesses = savedSubprocesses.filter(sub => nodesBySub[sub.id].length > 0);
    const N = activeSubprocesses.length;
    const centerX = 400;
    const centerY = 300;
    const radius = 220;

    const newNodes: RFNode[] = activeSubprocesses.map((sub, idx) => {
      const angle = N > 1 ? (2 * Math.PI * idx) / N : 0;
      const x = N > 1 ? centerX + radius * Math.cos(angle) - 100 : centerX - 100;
      const y = N > 1 ? centerY + radius * Math.sin(angle) - 50 : centerY - 50;

      const elements = nodesBySub[sub.id].map(n => n.data?.label || 'Brez imena');

      return {
        id: sub.id,
        type: 'subprocessNode',
        position: { x, y },
        data: {
          label: sub.name,
          color: sub.color,
          elementCount: nodesBySub[sub.id].length,
          elements,
        },
      };
    });

    // 3. Aggregate relationships from process edges
    const connections: Record<string, { count: number; materials: Set<string>; tools: Set<string> }> = {};

    edges.forEach(e => {
      const sNode = nodes.find(n => n.id === e.source);
      const tNode = nodes.find(n => n.id === e.target);
      if (!sNode || !tNode) return;

      const sourceSubId = sNode.data?.subprocess;
      const targetSubId = tNode.data?.subprocess;

      // Only check connections between different active subprocesses
      if (sourceSubId && targetSubId && sourceSubId !== targetSubId && nodesBySub[sourceSubId]?.length > 0 && nodesBySub[targetSubId]?.length > 0) {
        const key = `${sourceSubId}->${targetSubId}`;
        if (!connections[key]) {
          connections[key] = {
            count: 0,
            materials: new Set<string>(),
            tools: new Set<string>(),
          };
        }
        connections[key].count += 1;
        
        // Collect material details if present
        if (e.data?.materialUrl && e.data.materialUrl.startsWith('text:')) {
          connections[key].materials.add(e.data.materialUrl.substring(5));
        } else if (e.data?.materialUrl) {
          connections[key].materials.add('Material s slikico');
        }
        
        if (e.data?.tool) {
          connections[key].tools.add(e.data.tool);
        }
      }
    });

    // 4. Create High-Level edges
    const newEdges: RFEdge[] = Object.entries(connections).map(([key, info]) => {
      const [source, target] = key.split('->');
      const sSub = savedSubprocesses.find(s => s.id === source);
      const tSub = savedSubprocesses.find(s => s.id === target);

      // Determine clean handle position depending on layout positions
      const sIdx = activeSubprocesses.findIndex(s => s.id === source);
      const tIdx = activeSubprocesses.findIndex(s => s.id === target);
      
      let sourceHandle = 'right';
      let targetHandle = 'left';

      if (N > 1) {
        const sAngle = (2 * Math.PI * sIdx) / N;
        const tAngle = (2 * Math.PI * tIdx) / N;
        const dx = Math.cos(tAngle) - Math.cos(sAngle);
        const dy = Math.sin(tAngle) - Math.sin(sAngle);

        if (Math.abs(dx) > Math.abs(dy)) {
          sourceHandle = dx > 0 ? 'right' : 'left';
          targetHandle = dx > 0 ? 'left' : 'right';
        } else {
          sourceHandle = dy > 0 ? 'bottom' : 'top';
          targetHandle = dy > 0 ? 'top' : 'bottom';
        }
      }

      // Build label text with count and materials
      let label = `${info.count} prenos${info.count > 1 ? 'ov' : ''}`;
      if (info.materials.size > 0) {
        label += ` (${Array.from(info.materials).join(', ')})`;
      }

      return {
        id: `sub-edge-${key}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        animated: true,
        style: { stroke: sSub?.color || 'var(--border-subtle)', strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: sSub?.color || 'var(--border-subtle)',
          width: 20,
          height: 20,
        },
        label,
        labelStyle: { fill: 'var(--text-main)', fontSize: '10px', fontWeight: 'bold' },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: 'rgba(15, 23, 42, 0.85)', fillOpacity: 0.95 },
      };
    });

    return { mapNodes: newNodes, mapEdges: newEdges };
  }, [isOpen, nodes, edges, savedSubprocesses]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(30, 41, 59, 0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 600 }}>
              Zemljevid odnosov med subprocesi
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Legend */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(30, 41, 59, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ color: 'var(--accent-secondary)' }}>💡</span>
          Ta pogled samodejno agregira povezave med posameznimi elementi na platnu in jih prikazuje na nivoju celotnih subprocesov.
        </div>

        {/* Map Canvas */}
        <div style={{ flexGrow: 1, position: 'relative', background: '#090d16' }}>
          {mapNodes.length === 0 ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              <Network size={48} style={{ color: '#475569', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#f1f5f9' }}>
                Ni najdenih subprocesov
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Subprocese z elementi morate najprej ustvariti in dodeliti posameznim procesom na glavnem platnu.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={mapNodes}
              edges={mapEdges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.5}
              maxZoom={2}
            >
              <Background color="rgba(255, 255, 255, 0.05)" gap={24} size={1} />
              <Controls />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};
