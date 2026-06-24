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
import { X, Network, Layers } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';

interface SubprocessMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  edges: any[];
}

// Custom Subprocess Node Component inside the map (White High-Contrast Theme)
const SubprocessNodeComponent = ({ data }: any) => {
  return (
    <div style={{
      background: '#ffffff',
      border: `2px solid ${data.color || '#cbd5e1'}`,
      borderRadius: '12px',
      padding: '16px',
      minWidth: '220px',
      color: '#0f172a',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Left} id="left" style={{ background: data.color, width: '8px', height: '8px' }} />
      <Handle type="target" position={Position.Top} id="top" style={{ background: data.color, width: '8px', height: '8px' }} />
      
      {/* Source Handles */}
      <Handle type="source" position={Position.Right} id="right" style={{ background: data.color, width: '8px', height: '8px' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: data.color, width: '8px', height: '8px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: data.color }} />
        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{data.label}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#475569' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Število elementov:</span>
          <strong style={{ color: '#0f172a' }}>{data.elementCount}</strong>
        </div>
        {data.elements.length > 0 && (
          <div style={{ marginTop: '4px', fontSize: '10px', maxHeight: '80px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.elements.map((elName: string, i: number) => (
              <div key={i} style={{ background: '#f8fafc', color: '#334155', padding: '4px 8px', borderRadius: '4px', borderLeft: `3px solid ${data.color}`, fontSize: '10px' }}>
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

    // 2. Generate flowchart-like grid layout for subprocess nodes
    const activeSubprocesses = savedSubprocesses.filter(sub => nodesBySub[sub.id].length > 0);
    const cols = 3;

    const newNodes: RFNode[] = activeSubprocesses.map((sub, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = 50 + col * 320;
      const y = 50 + row * 260;

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

      const sIdx = activeSubprocesses.findIndex(s => s.id === source);
      const tIdx = activeSubprocesses.findIndex(s => s.id === target);
      
      let sourceHandle = 'right';
      let targetHandle = 'left';

      if (activeSubprocesses.length > 1) {
        const sCol = sIdx % cols;
        const sRow = Math.floor(sIdx / cols);
        const tCol = tIdx % cols;
        const tRow = Math.floor(tIdx / cols);

        const dCol = tCol - sCol;
        const dRow = tRow - sRow;

        if (Math.abs(dCol) >= Math.abs(dRow)) {
          sourceHandle = dCol > 0 ? 'right' : 'left';
          targetHandle = dCol > 0 ? 'left' : 'right';
        } else {
          sourceHandle = dRow > 0 ? 'bottom' : 'top';
          targetHandle = dRow > 0 ? 'top' : 'bottom';
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
        style: { stroke: sSub?.color || '#64748b', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: sSub?.color || '#64748b',
          width: 15,
          height: 15,
        },
        label,
        labelStyle: { fill: '#0f172a', fontSize: '10px', fontWeight: 'bold' },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 6,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#e2e8f0', strokeWidth: 1 },
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
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1050px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={20} style={{ color: '#2563eb' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>
              Zemljevid odnosov med subprocesi
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Legend / Tip */}
        <div style={{
          padding: '12px 24px',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ color: '#2563eb' }}>💡</span>
          Ta pogled samodejno agregira povezave med posameznimi elementi na platnu in jih prikazuje v obliki linearnega diagrama subprocesov.
        </div>

        {/* Map Canvas */}
        <div style={{ flexGrow: 1, position: 'relative', background: '#ffffff' }}>
          {mapNodes.length === 0 ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              <Network size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0f172a' }}>
                Ni najdenih subprocesov
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
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
              <Background color="#cbd5e1" gap={24} size={1} />
              <Controls />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};
