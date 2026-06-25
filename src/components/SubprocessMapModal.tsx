import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
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
  nodes?: any[];
  edges?: any[];
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
        {data.elements && data.elements.length > 0 && (
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
  nodes = [],
  edges = [],
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
    const activeSubprocesses = savedSubprocesses.filter(sub => nodesBySub[sub.id] && nodesBySub[sub.id].length > 0);
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

    // 3. Aggregate relationships from process edges (direct & via intermediate storage/departments)
    const connections: Record<string, { count: number; materials: Set<string>; tools: Set<string>; intermediates: Set<string> }> = {};

    activeSubprocesses.forEach(subA => {
      const startNodes = nodesBySub[subA.id];
      if (!startNodes) return;
      
      startNodes.forEach(startNode => {
        // BFS to find reachable subprocesses
        const queue: Array<{
          nodeId: string;
          edgesTraversed: any[];
          nodesVisited: string[];
        }> = [{ nodeId: startNode.id, edgesTraversed: [], nodesVisited: [startNode.id] }];
        
        const visitedInThisBfs = new Set<string>([startNode.id]);

        while (queue.length > 0) {
          const state = queue.shift()!;
          
          // Find outgoing edges
          const outgoing = edges.filter(e => e.source === state.nodeId && !e.hidden);
          
          outgoing.forEach(e => {
            const nextId = e.target;
            if (state.nodesVisited.includes(nextId)) return; // Avoid cyclic paths
            
            const nextNode = nodes.find(n => n.id === nextId);
            if (!nextNode) return;
            
            const nextSubId = nextNode.data?.subprocess;
            
            if (nextSubId) {
              // Reached another subprocess
              if (nextSubId !== subA.id && nodesBySub[nextSubId] && nodesBySub[nextSubId].length > 0) {
                const key = `${subA.id}->${nextSubId}`;
                if (!connections[key]) {
                  connections[key] = {
                    count: 0,
                    materials: new Set<string>(),
                    tools: new Set<string>(),
                    intermediates: new Set<string>(),
                  };
                }
                connections[key].count += 1;
                
                // Aggregate materials and tools along the whole path
                const allEdgesInPath = [...state.edgesTraversed, e];
                allEdgesInPath.forEach(pathEdge => {
                  if (pathEdge.data?.materialUrl && pathEdge.data.materialUrl.startsWith('text:')) {
                    connections[key].materials.add(pathEdge.data.materialUrl.substring(5));
                  } else if (pathEdge.data?.materialUrl) {
                    connections[key].materials.add('Slikica');
                  }
                  if (pathEdge.data?.tool) {
                    connections[key].tools.add(pathEdge.data.tool);
                  }
                });
                
                // Aggregate intermediate node labels
                state.nodesVisited.forEach((visitedNodeId, idx) => {
                  if (idx === 0) return; // Skip start node
                  const vNode = nodes.find(n => n.id === visitedNodeId);
                  if (vNode && vNode.data?.label) {
                    connections[key].intermediates.add(vNode.data.label);
                  }
                });
              }
            } else {
              // Intermediate node (e.g. storage, department, or node without subprocess)
              if (!visitedInThisBfs.has(nextId)) {
                visitedInThisBfs.add(nextId);
                queue.push({
                  nodeId: nextId,
                  edgesTraversed: [...state.edgesTraversed, e],
                  nodesVisited: [...state.nodesVisited, nextId],
                });
              }
            }
          });
        }
      });
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

      // Build label text with count, intermediate nodes, and materials
      let label = `${info.count} prenos${info.count > 1 ? 'ov' : ''}`;
      if (info.intermediates.size > 0) {
        label += ` preko ${Array.from(info.intermediates).join(', ')}`;
      }
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
      flexDirection: 'column',
      background: '#ffffff',
      width: '100vw',
      height: '100vh',
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
        height: '60px',
        boxSizing: 'border-box',
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
        height: '40px',
        boxSizing: 'border-box',
      }}>
        <span style={{ color: '#2563eb' }}>💡</span>
        Ta pogled samodejno agregira povezave med posameznimi elementi na platnu in jih prikazuje v obliki linearnega diagrama subprocesov.
      </div>

      {/* Map Canvas */}
      <div style={{ flexGrow: 1, width: '100%', height: 'calc(100vh - 100px)', position: 'relative', background: '#ffffff' }}>
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
          <ReactFlowProvider>
            <ReactFlow
              nodes={mapNodes}
              edges={mapEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              style={{ width: '100%', height: '100%' }}
            >
              <Background color="#cbd5e1" gap={24} size={1} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
};
