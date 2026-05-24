import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import '@xyflow/react/dist/style.css';

import { DepartmentNode } from '../nodes/DepartmentNode';
import { ProcessNode } from '../nodes/ProcessNode';
import { StorageNode } from '../nodes/StorageNode';
import { MovementEdge } from '../edges/MovementEdge';
import { Sidebar } from './Sidebar';
import { useMaterials } from '../contexts/MaterialContext';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Download, Upload, AlertTriangle } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { IssuesModal } from './IssuesModal';
import { IssuesOverviewModal } from './IssuesOverviewModal';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { ActiveUsers } from './ActiveUsers';

const nodeTypes = {
  department: DepartmentNode,
  process: ProcessNode,
  storage: StorageNode,
};

const edgeTypes = {
  movement: MovementEdge,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const FlowCanvas = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [issuesNodeId, setIssuesNodeId] = useState<string | null>(null);
  const [issuesOverviewOpen, setIssuesOverviewOpen] = useState(false);

  useEffect(() => {
    const handleOpenIssues = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      setIssuesNodeId(customEvent.detail.nodeId);
    };
    window.addEventListener('openNodeIssues', handleOpenIssues);
    return () => window.removeEventListener('openNodeIssues', handleOpenIssues);
  }, []);
  const { getIntersectingNodes, getNodes } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const { hiddenSubprocesses } = useMaterials();
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = useFirebaseSync(flowId || 'default_flow', initialNodes, initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const currentNodes = getNodes();
      let materialUrl: string | null = null;
      const sourceNode = currentNodes.find(n => n.id === params.source);
      
      if (sourceNode && params.sourceHandle) {
        if (params.sourceHandle.startsWith('output-col-')) {
          const parts = params.sourceHandle.split('-');
          const colIndex = parseInt(parts[2], 10);
          const slotIndex = parseInt(parts[4], 10);
          
          if (sourceNode.type === 'process') {
            let cols = Array.isArray(sourceNode.data.outputColumns) ? sourceNode.data.outputColumns : [];
            if (cols.length === 0 && Array.isArray(sourceNode.data.materialsAfter)) {
              cols = sourceNode.data.materialsAfter.map((mat: any) => ({ materialUrl: mat, items: [] }));
            }
            const col = cols[colIndex];
            if (col) {
              materialUrl = (Array.isArray(col.items) ? col.items[slotIndex] : null) || col.materialUrl;
            }
          } else if (sourceNode.type === 'storage') {
            let cols = Array.isArray(sourceNode.data.columns) ? sourceNode.data.columns : [];
            if (cols.length === 0 && Array.isArray(sourceNode.data.materials)) {
              cols = sourceNode.data.materials.map((mat: any) => ({ materialUrl: mat, items: [] }));
            }
            const col = cols[colIndex];
            if (col) {
              materialUrl = (Array.isArray(col.items) ? col.items[slotIndex] : null) || col.materialUrl;
            }
          }
        } else {
          // Fallback to first material if dragged from generic output handle or if sourceHandle is null
          const srcKey = sourceNode.type === 'process' ? 'outputColumns' : 'columns';
          let cols = Array.isArray(sourceNode.data[srcKey]) ? sourceNode.data[srcKey] : [];
          if (cols.length === 0) {
            const fbKey = sourceNode.type === 'process' ? 'materialsAfter' : 'materials';
            if (Array.isArray(sourceNode.data[fbKey])) {
              cols = sourceNode.data[fbKey].map((mat: any) => ({ materialUrl: mat, items: [] }));
            }
          }
          // Find the first column that actually has an image
          const colWithImage = cols.find(c => c && (c.materialUrl || (Array.isArray(c.items) && c.items.find(i => i))));
          if (colWithImage) {
            const firstItemImg = Array.isArray(colWithImage.items) ? colWithImage.items.find(i => i) : null;
            materialUrl = firstItemImg || colWithImage.materialUrl;
          } else if (cols.length > 0 && cols[0]) {
            materialUrl = (Array.isArray(cols[0].items) ? cols[0].items[0] : null) || cols[0].materialUrl;
          }
        }
      }

      const targetNode = currentNodes.find(n => n.id === params.target);
      const isGenericDrop = !params.targetHandle || params.targetHandle === 'input';
      const safeTargetHandle = params.targetHandle || 'input';

      setEdges((eds) => {
        const newEdge = { 
          ...params, 
          sourceHandle: params.sourceHandle || null,
          targetHandle: safeTargetHandle || null,
          type: 'movement',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#94a3b8',
          },
          data: { 
            tool: '', 
            trigger: '', 
            materialUrl: materialUrl || null,
            connectionType: 'movement',
            pathType: 'smoothstep',
            description: '',
            performer: ''
          }
        };
        return addEdge(newEdge, eds);
      });

      if (params.target) {
        setNodes((nds) => {
          return nds.map(n => {
            if (n.id === params.target) {
              const targetKey = n.type === 'process' ? 'inputColumns' : 'columns';
              let currentCols = Array.isArray(n.data[targetKey]) ? [...n.data[targetKey]] : [];
              
              if (currentCols.length === 0) {
                if (n.type === 'process' && Array.isArray(n.data.materialsBefore)) {
                  currentCols = n.data.materialsBefore.map((mat: any) => ({ materialUrl: mat, capacity: (n.data.storageBefore as number) || 1, items: Array((n.data.storageBefore as number) || 1).fill(null) }));
                } else if (n.type === 'storage' && Array.isArray(n.data.materials)) {
                  currentCols = n.data.materials.map((mat: any) => ({ materialUrl: mat, capacity: (n.data.storageCount as number) || 1, items: Array((n.data.storageCount as number) || 1).fill(null) }));
                }
              }

              if (isGenericDrop) {
                // User dropped onto the node -> append new column
                currentCols.push({ materialUrl: materialUrl, capacity: 1, items: [null] });
              } else if (params.targetHandle && params.targetHandle.startsWith('input-col-')) {
                // User dropped onto existing slot
                const parts = params.targetHandle.split('-');
                const colIndex = parseInt(parts[2], 10);
                const slotIndex = parseInt(parts[4], 10);
                
                if (currentCols[colIndex]) {
                  const col = { ...currentCols[colIndex] };
                  if (!col.materialUrl) {
                    col.materialUrl = materialUrl;
                  }
                  currentCols[colIndex] = col;
                }
              }
              
              return { ...n, data: { ...n.data, [targetKey]: currentCols } };
            }
            return n;
          });
        });
      }
    },
    [setEdges, setNodes, getNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Check if dropped inside a department
      const targetNode = nodes.find((n) => {
        if (n.type !== 'department') return false;
        const width = n.measured?.width ?? n.width ?? 300;
        const height = n.measured?.height ?? n.height ?? 200;
        return (
          position.x >= n.position.x &&
          position.x <= n.position.x + width &&
          position.y >= n.position.y &&
          position.y <= n.position.y + height
        );
      });

      const newNodeId = uuidv4();

      let defaultData = {};
      if (type === 'department') {
        defaultData = { label: `Oddelek ${nodes.filter(n => n.type === 'department').length + 1}` };
      } else if (type === 'process') {
        defaultData = { 
          label: `Proces ${nodes.filter(n => n.type === 'process').length + 1}`,
          equipment: 'Stroj A',
          inputColumns: [],
          outputColumns: [],
          trigger: 'Začetek prejšnjega'
        };
      } else if (type === 'storage') {
        defaultData = {
          label: `Skladišče ${nodes.filter(n => n.type === 'storage').length + 1}`,
          columns: []
        };
      }

      const newNode: Node = {
        id: newNodeId,
        type,
        position: targetNode ? { x: position.x - targetNode.position.x, y: position.y - targetNode.position.y } : position,
        data: defaultData,
        zIndex: type === 'department' ? -1 : 1,
      };

      if (targetNode) {
        newNode.parentId = targetNode.id;
      }

      let nextNodes = nodes.concat(newNode);
      let nextEdges = [...edges];

      nextNodes = expandParentIfNeeded(nextNodes);

      setNodes(nextNodes);
    },
    [reactFlowInstance, nodes, edges, setNodes, setEdges],
  );

  const autoLayoutDepartment = (departmentId: string, currentNodes: Node[], currentEdges: Edge[]) => {
    const children = currentNodes.filter(n => n.parentId === departmentId);
    if (children.length === 0) return { nodes: currentNodes, edges: currentEdges };

    const rows: { y: number, nodes: Node[] }[] = [];
    
    children.forEach(child => {
      const matchingRow = rows.find(r => Math.abs(r.y - child.position.y) < 80);
      if (matchingRow) {
        matchingRow.nodes.push(child);
        matchingRow.y = (matchingRow.y * (matchingRow.nodes.length - 1) + child.position.y) / matchingRow.nodes.length;
      } else {
        rows.push({ y: child.position.y, nodes: [child] });
      }
    });

    rows.sort((a, b) => a.y - b.y);

    const PADDING_X = 140; // Razmik med procesi vodoravno
    const PADDING_Y = 60;  // Razmik med procesi navpično (vzporedno)
    let currentY = 60;

    const newEdges = [...currentEdges];
    const nextNodes = currentNodes.map(n => ({ ...n }));

    rows.forEach((row) => {
      row.nodes.sort((a, b) => a.position.x - b.position.x);

      let currentX = 60;
      let maxHeightInRow = 0;

      row.nodes.forEach((node, colIndex) => {
        const nodeIndex = nextNodes.findIndex(n => n.id === node.id);
        if (nodeIndex > -1) {
          nextNodes[nodeIndex].position = { x: currentX, y: currentY };
          
          const nWidth = node.measured?.width || node.width || 250;
          const nHeight = node.measured?.height || node.height || 120;
          
          currentX += nWidth + PADDING_X;
          if (nHeight > maxHeightInRow) maxHeightInRow = nHeight;
        }
      });

      currentY += maxHeightInRow + PADDING_Y;
    });

    const deptIndex = nextNodes.findIndex(n => n.id === departmentId);
    if (deptIndex > -1) {
      let maxX = 300;
      let maxY = 200;
      nextNodes.filter(n => n.parentId === departmentId).forEach(c => {
        const cRight = c.position.x + (c.measured?.width || c.width || 250) + 40;
        const cBottom = c.position.y + (c.measured?.height || c.height || 120) + 40;
        if (cRight > maxX) maxX = cRight;
        if (cBottom > maxY) maxY = cBottom;
      });
      
      nextNodes[deptIndex] = {
        ...nextNodes[deptIndex],
        style: { ...nextNodes[deptIndex].style, width: maxX, height: maxY }
      };
    }

    return { nodes: nextNodes, edges: newEdges };
  };

  // Helper to automatically expand parent department if children overflow
  const expandParentIfNeeded = (currentNodes: Node[]) => {
    let changed = false;
    const nextNodes = currentNodes.map((n) => {
      if (n.type === 'department') {
        const children = currentNodes.filter(c => c.parentId === n.id);
        if (children.length === 0) return n;

        // Use n.style.width/height if present, else measured or default
        let currentWidth = parseFloat(n.style?.width as string) || n.measured?.width || n.width || 300;
        let currentHeight = parseFloat(n.style?.height as string) || n.measured?.height || n.height || 200;
        
        let minWidth = currentWidth;
        let minHeight = currentHeight;

        children.forEach(c => {
          const cWidth = c.measured?.width || c.width || 250;
          const cHeight = c.measured?.height || c.height || 120;
          
          // Child's position is relative to parent
          const childRight = c.position.x + cWidth + 30; // 30px padding
          const childBottom = c.position.y + cHeight + 30;

          if (childRight > minWidth) {
            minWidth = childRight;
          }
          if (childBottom > minHeight) {
            minHeight = childBottom;
          }
        });

        if (minWidth > currentWidth || minHeight > currentHeight) {
          changed = true;
          return {
            ...n,
            style: { ...(n.style || {}), width: minWidth, height: minHeight }
          };
        }
      }
      return n;
    });
    return changed ? nextNodes : currentNodes;
  };

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'department') return;

      const intersections = getIntersectingNodes(node).filter((n) => n.type === 'department');
      const targetDepartment = intersections[0];

      let absolutePosition = { ...node.position };
      if (node.parentId) {
        const oldParent = nodes.find((n) => n.id === node.parentId);
        if (oldParent) {
          absolutePosition.x += oldParent.position.x;
          absolutePosition.y += oldParent.position.y;
        }
      }

      const oldParentId = node.parentId;
      const newParentId = targetDepartment ? targetDepartment.id : undefined;

      let nextNodes = nodes.map((n) => {
        if (n.id === node.id) {
          if (targetDepartment && n.parentId !== targetDepartment.id) {
            return {
              ...n,
              parentId: targetDepartment.id,
              position: {
                x: absolutePosition.x - targetDepartment.position.x,
                y: absolutePosition.y - targetDepartment.position.y,
              }
            };
          } else if (!targetDepartment && n.parentId) {
             // Keep in the same parent so expandParentIfNeeded can resize it
             const parentNode = nodes.find(p => p.id === n.parentId);
             if (parentNode) {
               return {
                 ...n,
                 position: {
                   x: absolutePosition.x - parentNode.position.x,
                   y: absolutePosition.y - parentNode.position.y,
                 }
               }
             }
          } else if (targetDepartment && n.parentId === targetDepartment.id) {
            // Dragged within same parent
            return {
              ...n,
              position: {
                x: absolutePosition.x - targetDepartment.position.x,
                y: absolutePosition.y - targetDepartment.position.y,
              }
            };
          }
        }
        return n;
      });

      let nextEdges = [...edges];

      nextNodes = expandParentIfNeeded(nextNodes);

      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [getIntersectingNodes, nodes, edges, setNodes, setEdges]
  );

  const visibleNodes = useMemo(() => {
    const collapsedDeps = new Set(nodes.filter(n => n.type === 'department' && n.data.isCollapsed).map(n => n.id));
    return nodes.map(n => {
      const isHidden = Boolean((n.parentId && collapsedDeps.has(n.parentId)) || 
                       (n.data.subprocess && hiddenSubprocesses.includes(n.data.subprocess as string)));
      
      const nodeObj: any = { ...n };
      
      if (isHidden) {
        nodeObj.hidden = true;
      } else {
        delete nodeObj.hidden;
      }

      if (n.type === 'department') {
        nodeObj.dragHandle = '.custom-drag-handle';
        nodeObj.className = 'department-wrapper-node';
      } else {
        delete nodeObj.dragHandle;
        delete nodeObj.className;
      }
      
      // Clean up any other potentially undefined internal properties
      if (nodeObj.parentId === undefined) delete nodeObj.parentId;
      if (nodeObj.extent === undefined) delete nodeObj.extent;
      if (nodeObj.expandParent === undefined) delete nodeObj.expandParent;
      
      return nodeObj;
    });
  }, [nodes, hiddenSubprocesses]);

  const visibleEdges = useMemo(() => {
    const collapsedDeps = new Set(nodes.filter(n => n.type === 'department' && n.data.isCollapsed).map(n => n.id));
    
    const getEffectiveId = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.parentId && collapsedDeps.has(node.parentId)) {
        return node.parentId;
      }
      return nodeId;
    };

    return edges.map(e => {
      const effSource = getEffectiveId(e.source);
      const effTarget = getEffectiveId(e.target);
      
      if (effSource === effTarget && collapsedDeps.has(effSource)) {
        return { ...e, hidden: true };
      }
      
      return { 
        ...e, 
        source: effSource, 
        target: effTarget, 
        hidden: false,
        sourceHandle: effSource !== e.source ? 'dep-source' : e.sourceHandle,
        targetHandle: effTarget !== e.target ? 'dep-target' : e.targetHandle
      };
    });
  }, [edges, nodes]);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="canvas-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'movement' }}
          fitView
          minZoom={0.1}
        >
          <Background color="rgba(255, 255, 255, 0.1)" gap={20} size={1} />
          <Controls />

          <Panel position="top-left">
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => navigate('/')}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <ArrowLeft size={16} />
                Nazaj
              </button>
              <button 
                onClick={() => setShareModalOpen(true)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Share2 size={16} />
                Deli z drugimi
              </button>
              <button 
                onClick={() => exportToExcel(nodes, edges)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Download size={16} />
                Izvozi
              </button>
              <label 
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Upload size={16} />
                Uvozi
                <input 
                  type="file" 
                  accept=".xlsx" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const { nodes: newNodes, edges: newEdges } = await importFromExcel(file, nodes, edges);
                        setNodes(newNodes);
                        setEdges(newEdges);
                      } catch (err) {
                        console.error('Napaka pri uvozu:', err);
                        alert('Napaka pri branju Excel datoteke.');
                      }
                      e.target.value = '';
                    }
                  }} 
                />
              </label>
              <button 
                onClick={() => setIssuesOverviewOpen(true)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--accent-warning)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <AlertTriangle size={16} />
                Pregled izzivov
              </button>
            </div>
          </Panel>
          <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div className="glass-panel" style={{ padding: '10px 15px', fontSize: '0.8rem' }}>
              Material Flow & Process Tracker
            </div>
            <ActiveUsers />
          </Panel>
        </ReactFlow>
      </div>
      {shareModalOpen && flowId && <ShareModal flowId={flowId} onClose={() => setShareModalOpen(false)} />}
      {issuesNodeId && <IssuesModal nodeId={issuesNodeId} onClose={() => setIssuesNodeId(null)} />}
      {issuesOverviewOpen && <IssuesOverviewModal onClose={() => setIssuesOverviewOpen(false)} />}
    </div>
  );
};

export default FlowCanvas;
