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
import { ArrowLeft, Share2, Download, Upload, AlertTriangle, FileText, Network, Workflow } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { IssuesModal } from './IssuesModal';
import { IssuesOverviewModal } from './IssuesOverviewModal';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { exportToWord } from '../utils/wordExport';
import { SubprocessFlowView } from './SubprocessFlowView';
import { SubprocessMapModal } from './SubprocessMapModal';
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
  const getNodeDimensions = (n: Node) => {
    if (n.type === 'department') {
      return {
        width: parseFloat(n.style?.width as string) || n.measured?.width || n.width || 300,
        height: parseFloat(n.style?.height as string) || n.measured?.height || n.height || 200,
      };
    }
    if (n.type === 'storage') {
      return {
        width: n.measured?.width || n.width || 260,
        height: n.measured?.height || n.height || 250,
      };
    }
    // Default to process node
    return {
      width: n.measured?.width || n.width || 250,
      height: n.measured?.height || n.height || 120,
    };
  };

  const { flowId } = useParams();
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [issuesNodeId, setIssuesNodeId] = useState<string | null>(null);
  const [issuesEdgeId, setIssuesEdgeId] = useState<string | null>(null);
  const [issuesOverviewOpen, setIssuesOverviewOpen] = useState(false);

  useEffect(() => {
    const handleOpenIssues = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      setIssuesNodeId(customEvent.detail.nodeId);
    };
    const handleOpenEdgeIssues = (e: Event) => {
      const customEvent = e as CustomEvent<{ edgeId: string }>;
      setIssuesEdgeId(customEvent.detail.edgeId);
    };
    window.addEventListener('openNodeIssues', handleOpenIssues);
    window.addEventListener('openEdgeIssues', handleOpenEdgeIssues);
    return () => {
      window.removeEventListener('openNodeIssues', handleOpenIssues);
      window.removeEventListener('openEdgeIssues', handleOpenEdgeIssues);
    };
  }, []);
  const { getIntersectingNodes, getNodes } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const { hiddenSubprocesses, savedSubprocesses } = useMaterials();
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = useFirebaseSync(flowId || 'default_flow', initialNodes, initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [subprocessViewOpen, setSubprocessViewOpen] = useState<boolean>(false);
  const [subprocessMapOpen, setSubprocessMapOpen] = useState<boolean>(false);
  const [pendingConnection, setPendingConnection] = useState<{
    params: Connection | Edge;
    availableMaterials: string[];
  } | null>(null);

  const completeConnection = useCallback(
    (params: Connection | Edge, materialUrl: string | null) => {
      const currentNodes = getNodes();
      const targetNode = currentNodes.find(n => n.id === params.target);
      const isGenericDrop = !params.targetHandle || !params.targetHandle.startsWith('input-col-');
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
              let targetKey = n.type === 'process' ? 'inputColumns' : 'columns';
              let isRightTarget = false;
              if (n.type === 'process' && params.targetHandle && params.targetHandle.includes('-right-')) {
                targetKey = 'outputColumns';
                isRightTarget = true;
              }
              
              let currentCols = Array.isArray(n.data[targetKey]) ? [...(n.data[targetKey] as any[])] : [];
              
              if (currentCols.length === 0) {
                if (n.type === 'process') {
                  if (targetKey === 'inputColumns' && Array.isArray(n.data.materialsBefore)) {
                    currentCols = (n.data.materialsBefore as any[]).map((mat: any) => ({ materialUrl: mat, capacity: (n.data.storageBefore as number) || 1, items: Array((n.data.storageBefore as number) || 1).fill(null) }));
                  } else if (targetKey === 'outputColumns' && Array.isArray(n.data.materialsAfter)) {
                    currentCols = (n.data.materialsAfter as any[]).map((mat: any) => ({ materialUrl: mat, capacity: (n.data.storageAfter as number) || 1, items: Array((n.data.storageAfter as number) || 1).fill(null) }));
                  }
                } else if (n.type === 'storage' && Array.isArray(n.data.materials)) {
                  currentCols = (n.data.materials as any[]).map((mat: any) => ({ materialUrl: mat, capacity: (n.data.storageCount as number) || 1, items: Array((n.data.storageCount as number) || 1).fill(null) }));
                }
              }

              if (isGenericDrop) {
                // User dropped onto the node -> append new column
                currentCols.push({ materialUrl: materialUrl, capacity: 1, items: [null] });
              } else if (params.targetHandle && params.targetHandle.startsWith('input-col-')) {
                // User dropped onto existing slot
                const parts = params.targetHandle.split('-');
                let colIndex = 0;
                let slotIndex = 0;
                if (isRightTarget) {
                  colIndex = parseInt(parts[3], 10);
                  slotIndex = parseInt(parts[5], 10);
                } else {
                  colIndex = parseInt(parts[2], 10);
                  slotIndex = parseInt(parts[4], 10);
                }
                
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
    [setEdges, setNodes, getNodes]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const currentNodes = getNodes();
      const sourceNode = currentNodes.find(n => n.id === params.source);
      const targetNode = currentNodes.find(n => n.id === params.target);
      
      // If connecting storage -> process, check if storage has multiple unique materials
      if (sourceNode && sourceNode.type === 'storage' && targetNode && targetNode.type === 'process') {
        const cols = Array.isArray(sourceNode.data.columns) ? (sourceNode.data.columns as any[]) : [];
        const mats = Array.isArray(sourceNode.data.materials) ? (sourceNode.data.materials as any[]) : [];
        
        const matSet = new Set<string>();
        cols.forEach(c => {
          if (c?.materialUrl) matSet.add(c.materialUrl);
          if (Array.isArray(c?.items)) {
            c.items.forEach((item: any) => {
              if (item) matSet.add(item);
            });
          }
        });
        mats.forEach(m => {
          if (m) matSet.add(m);
        });
        
        const availableMaterials = Array.from(matSet).filter(Boolean);
        
        if (availableMaterials.length > 1) {
          // Open connection select dialog instead of finishing immediately
          setPendingConnection({ params, availableMaterials });
          return;
        }
      }

      let materialUrl: string | null = null;
      if (sourceNode && params.sourceHandle) {
        if (params.sourceHandle.startsWith('output-col-')) {
          const parts = params.sourceHandle.split('-');
          let colIndex = 0;
          let slotIndex = 0;
          let isLeftSource = false;
          
          if (parts[2] === 'left') {
            isLeftSource = true;
            colIndex = parseInt(parts[3], 10);
            slotIndex = parseInt(parts[5], 10);
          } else {
            colIndex = parseInt(parts[2], 10);
            slotIndex = parseInt(parts[4], 10);
          }
          
          if (sourceNode.type === 'process') {
            let cols: any[] = [];
            if (isLeftSource) {
              cols = Array.isArray(sourceNode.data.inputColumns) ? (sourceNode.data.inputColumns as any[]) : [];
              if (cols.length === 0 && Array.isArray(sourceNode.data.materialsBefore)) {
                cols = (sourceNode.data.materialsBefore as any[]).map((mat: any) => ({ materialUrl: mat, items: [] }));
              }
            } else {
              cols = Array.isArray(sourceNode.data.outputColumns) ? (sourceNode.data.outputColumns as any[]) : [];
              if (cols.length === 0 && Array.isArray(sourceNode.data.materialsAfter)) {
                cols = (sourceNode.data.materialsAfter as any[]).map((mat: any) => ({ materialUrl: mat, items: [] }));
              }
            }
            
            const col = cols[colIndex];
            if (col) {
              materialUrl = (Array.isArray(col.items) ? col.items[slotIndex] : null) || col.materialUrl;
            }
          } else if (sourceNode.type === 'storage') {
            let cols = Array.isArray(sourceNode.data.columns) ? (sourceNode.data.columns as any[]) : [];
            if (cols.length === 0 && Array.isArray(sourceNode.data.materials)) {
              cols = (sourceNode.data.materials as any[]).map((mat: any) => ({ materialUrl: mat, items: [] }));
            }
            const col = cols[colIndex];
            if (col) {
              materialUrl = (Array.isArray(col.items) ? col.items[slotIndex] : null) || col.materialUrl;
            }
          }
        } else {
          // Fallback to first material if dragged from generic output handle or if sourceHandle is null
          const srcKey = sourceNode.type === 'process' ? 'outputColumns' : 'columns';
          let cols = Array.isArray(sourceNode.data[srcKey]) ? (sourceNode.data[srcKey] as any[]) : [];
          if (cols.length === 0) {
            const fbKey = sourceNode.type === 'process' ? 'materialsAfter' : 'materials';
            if (Array.isArray(sourceNode.data[fbKey])) {
              cols = sourceNode.data[fbKey].map((mat: any) => ({ materialUrl: mat, items: [] }));
            }
          }
          const colWithImage = cols.find(c => c && (c.materialUrl || (Array.isArray(c.items) && c.items.find(i => i))));
          if (colWithImage) {
            const firstItemImg = Array.isArray(colWithImage.items) ? colWithImage.items.find(i => i) : null;
            materialUrl = firstItemImg || colWithImage.materialUrl;
          } else if (cols.length > 0 && cols[0]) {
            materialUrl = (Array.isArray(cols[0].items) ? cols[0].items[0] : null) || cols[0].materialUrl;
          }
        }
      }

      completeConnection(params, materialUrl);
    },
    [completeConnection, getNodes],
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
        const width = parseFloat(n.style?.width as string) || n.measured?.width || n.width || 300;
        const height = parseFloat(n.style?.height as string) || n.measured?.height || n.height || 200;
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
        position: targetNode ? { x: position.x - targetNode.position.x, y: Math.max(170, position.y - targetNode.position.y) } : position,
        data: defaultData,
        zIndex: type === 'department' ? 0 : 1,
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
    let currentY = 170;

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
          const { width: cWidth, height: cHeight } = getNodeDimensions(c);
          
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

  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type !== 'department') return;

      const { width: deptWidth, height: deptHeight } = getNodeDimensions(node);
      const deptLeft = node.position.x;
      const deptTop = node.position.y;
      const deptRight = deptLeft + deptWidth;
      const deptBottom = deptTop + deptHeight;

      let changed = false;
      const nextNodes = nodes.map((n) => {
        if (n.type === 'department') return n;

        // Calculate absolute coordinates of node n
        let absX = n.position.x;
        let absY = n.position.y;
        if (n.parentId) {
          if (n.parentId === node.id) {
            return n;
          }
          const parentNode = nodes.find(p => p.id === n.parentId);
          if (parentNode) {
            absX += parentNode.position.x;
            absY += parentNode.position.y;
          }
        }

        const { width: nWidth, height: nHeight } = getNodeDimensions(n);
        const centerX = absX + nWidth / 2;
        const centerY = absY + nHeight / 2;

        const isInside = (
          centerX >= deptLeft &&
          centerX <= deptRight &&
          centerY >= deptTop &&
          centerY <= deptBottom
        );

        if (isInside) {
          changed = true;
          return {
            ...n,
            parentId: node.id,
            position: {
              x: absX - deptLeft,
              y: Math.max(170, absY - deptTop),
            }
          };
        }
        return n;
      });

      if (changed) {
        setNodes(nextNodes);
      }
    },
    [nodes, setNodes]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      let nextNodes = [...nodes];

      if (node.type === 'department') {
        // A department node was dragged.
        // We want to see if any free-floating (or child of other departments) processes/storages
        // are now visually inside this department's boundaries, and if so, attach them!
        const { width: deptWidth, height: deptHeight } = getNodeDimensions(node);
        const deptLeft = node.position.x;
        const deptTop = node.position.y;
        const deptRight = deptLeft + deptWidth;
        const deptBottom = deptTop + deptHeight;

        nextNodes = nodes.map((n) => {
          if (n.type === 'department') return n;

          // Calculate absolute coordinates of node n
          let absX = n.position.x;
          let absY = n.position.y;
          if (n.parentId) {
            // If it is already a child of this department, its relative position is fine,
            // and it was dragged along with it.
            if (n.parentId === node.id) {
              return n;
            }
            const parentNode = nodes.find(p => p.id === n.parentId);
            if (parentNode) {
              absX += parentNode.position.x;
              absY += parentNode.position.y;
            }
          }

          const { width: nWidth, height: nHeight } = getNodeDimensions(n);
          const centerX = absX + nWidth / 2;
          const centerY = absY + nHeight / 2;

          const isInside = (
            centerX >= deptLeft &&
            centerX <= deptRight &&
            centerY >= deptTop &&
            centerY <= deptBottom
          );

          if (isInside) {
            // Attach to this department!
            return {
              ...n,
              parentId: node.id,
              position: {
                x: absX - deptLeft,
                y: Math.max(170, absY - deptTop),
              }
            };
          }
          return n;
        });
      } else {
        // A process or storage node was dragged.
        // Calculate correct absolute position on the canvas
        let absolutePosition = { ...node.position };
        if (node.parentId) {
          const oldParent = nodes.find((n) => n.id === node.parentId);
          if (oldParent) {
            absolutePosition.x += oldParent.position.x;
            absolutePosition.y += oldParent.position.y;
          }
        }

        const { width: nWidth, height: nHeight } = getNodeDimensions(node);
        const centerX = absolutePosition.x + nWidth / 2;
        const centerY = absolutePosition.y + nHeight / 2;

        // Find parent department geometrically using the center point
        const targetDepartment = nodes.find((dept) => {
          if (dept.type !== 'department' || dept.id === node.id) return false;
          const { width: dWidth, height: dHeight } = getNodeDimensions(dept);
          
          return (
            centerX >= dept.position.x &&
            centerX <= dept.position.x + dWidth &&
            centerY >= dept.position.y &&
            centerY <= dept.position.y + dHeight
          );
        });

        nextNodes = nodes.map((n) => {
          if (n.id === node.id) {
            if (targetDepartment) {
              return {
                ...n,
                parentId: targetDepartment.id,
                position: {
                  x: absolutePosition.x - targetDepartment.position.x,
                  y: Math.max(170, absolutePosition.y - targetDepartment.position.y),
                }
              };
            } else {
              // Dragged completely outside of any department -> make it a top-level standalone node!
              const { parentId, ...rest } = n;
              return {
                ...rest,
                position: absolutePosition
              };
            }
          }
          return n;
        });
      }

      let nextEdges = [...edges];
      nextNodes = expandParentIfNeeded(nextNodes);

      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [nodes, edges, setNodes, setEdges]
  );

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const collapsedDeps = new Set(nodes.filter(n => n.type === 'department' && n.data.isCollapsed).map(n => n.id));
    
    // Helper to calculate absolute node coordinates
    const getNodeAbsolutePosition = (node: Node): { x: number; y: number } => {
      let x = node.position.x;
      let y = node.position.y;
      let curr = node;
      while (curr.parentId) {
        const parent = nodes.find(n => n.id === curr.parentId);
        if (!parent) break;
        x += parent.position.x;
        y += parent.position.y;
        curr = parent;
      }
      return { x, y };
    };

    const getDeptDimensions = (dept: Node) => {
      const width = parseFloat(dept.style?.width as string) || dept.measured?.width || dept.width || 300;
      const height = parseFloat(dept.style?.height as string) || dept.measured?.height || dept.height || 200;
      return { width, height };
    };

    const getNodeCenter = (node: Node) => {
      const absPos = getNodeAbsolutePosition(node);
      const { width, height } = getNodeDimensions(node);
      return {
        x: absPos.x + width / 2,
        y: absPos.y + height / 2,
      };
    };

    const lineSegmentsIntersect = (
      x1: number, y1: number, x2: number, y2: number,
      x3: number, y3: number, x4: number, y4: number
    ): boolean => {
      const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
      if (Math.abs(det) < 0.001) return false;
      const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
      const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
      return lambda >= 0 && lambda <= 1 && gamma >= 0 && gamma <= 1;
    };

    const lineIntersectsBox = (
      x1: number, y1: number, x2: number, y2: number,
      left: number, top: number, right: number, bottom: number
    ): boolean => {
      const p1Inside = x1 >= left && x1 <= right && y1 >= top && y1 <= bottom;
      const p2Inside = x2 >= left && x2 <= right && y2 >= top && y2 <= bottom;
      if (p1Inside || p2Inside) return true;
      if (lineSegmentsIntersect(x1, y1, x2, y2, left, top, right, top)) return true;
      if (lineSegmentsIntersect(x1, y1, x2, y2, left, bottom, right, bottom)) return true;
      if (lineSegmentsIntersect(x1, y1, x2, y2, left, top, left, bottom)) return true;
      if (lineSegmentsIntersect(x1, y1, x2, y2, right, top, right, bottom)) return true;
      return false;
    };

    const pathIntersectsBox = (
      x1: number, y1: number, x2: number, y2: number,
      left: number, top: number, right: number, bottom: number
    ): boolean => {
      // 1. Check straight line first
      if (lineIntersectsBox(x1, y1, x2, y2, left, top, right, bottom)) return true;

      // 2. Check orthogonal horizontal-first path segments
      const xMid = x1 + (x2 - x1) / 2;
      const yMid = y1 + (y2 - y1) / 2;

      // Horizontal-first: (x1,y1)->(xMid,y1)->(xMid,y2)->(x2,y2)
      if (lineIntersectsBox(x1, y1, xMid, y1, left, top, right, bottom)) return true;
      if (lineIntersectsBox(xMid, y1, xMid, y2, left, top, right, bottom)) return true;
      if (lineIntersectsBox(xMid, y2, x2, y2, left, top, right, bottom)) return true;

      // Vertical-first: (x1,y1)->(x1,yMid)->(x2,yMid)->(x2,y2)
      if (lineIntersectsBox(x1, y1, x1, yMid, left, top, right, bottom)) return true;
      if (lineIntersectsBox(x1, yMid, x2, yMid, left, top, right, bottom)) return true;
      if (lineIntersectsBox(x2, yMid, x2, y2, left, top, right, bottom)) return true;

      return false;
    };

    // Calculate z-indices for departments dynamically to handle overlap/crossings
    const deptZIndices: Record<string, number> = {};
    const departments = nodes.filter(n => n.type === 'department');
    departments.forEach(d => {
      deptZIndices[d.id] = 10;
    });

    for (let iter = 0; iter < Math.min(5, departments.length + 1); iter++) {
      let changed = false;
      edges.forEach(e => {
        const sNode = nodes.find(n => n.id === e.source);
        const tNode = nodes.find(n => n.id === e.target);
        if (!sNode || !tNode) return;

        const sParentId = sNode.parentId;
        const tParentId = tNode.parentId;
        const sParentZ = sParentId ? (deptZIndices[sParentId] ?? 10) : 10;
        const tParentZ = tParentId ? (deptZIndices[tParentId] ?? 10) : 10;
        const maxEndpointZ = Math.max(sParentZ, tParentZ);

        const sCenter = getNodeCenter(sNode);
        const tCenter = getNodeCenter(tNode);

        departments.forEach(dept => {
          if (dept.id === sParentId || dept.id === tParentId) return;

          const deptAbsPos = getNodeAbsolutePosition(dept);
          const { width: deptW, height: deptH } = getDeptDimensions(dept);
          const left = deptAbsPos.x;
          const top = deptAbsPos.y;
          const right = left + deptW;
          const bottom = top + deptH;

          if (pathIntersectsBox(sCenter.x, sCenter.y, tCenter.x, tCenter.y, left, top, right, bottom)) {
            const requiredZ = maxEndpointZ + 2;
            if (deptZIndices[dept.id] < requiredZ) {
              deptZIndices[dept.id] = requiredZ;
              changed = true;
            }
          }
        });
      });
      if (!changed) break;
    }

    // Process nodes with calculated z-indices
    const preparedNodes = nodes.map(n => {
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
        nodeObj.zIndex = deptZIndices[n.id] ?? 10;
      } else {
        delete nodeObj.dragHandle;
        delete nodeObj.className;
        nodeObj.zIndex = n.parentId ? (deptZIndices[n.parentId] ?? 10) + 2 : 12;
      }
      
      if (nodeObj.parentId === undefined || nodeObj.parentId === null || nodeObj.parentId === '') {
        delete nodeObj.parentId;
      }
      if (nodeObj.extent === undefined) delete nodeObj.extent;
      if (nodeObj.expandParent === undefined) delete nodeObj.expandParent;
      
      return nodeObj;
    });

    const getEffectiveId = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.parentId && collapsedDeps.has(node.parentId)) {
        return node.parentId;
      }
      return nodeId;
    };

    const preparedEdges = edges.map(e => {
      const effSource = getEffectiveId(e.source);
      const effTarget = getEffectiveId(e.target);
      
      if (effSource === effTarget && collapsedDeps.has(effSource)) {
        return { ...e, hidden: true };
      }
      
      const sNode = nodes.find(n => n.id === e.source);
      const tNode = nodes.find(n => n.id === e.target);
      
      const isSourceSubprocessHidden = sNode?.data?.subprocess && hiddenSubprocesses.includes(sNode.data.subprocess as string);
      const isTargetSubprocessHidden = tNode?.data?.subprocess && hiddenSubprocesses.includes(tNode.data.subprocess as string);
      
      if (isSourceSubprocessHidden || isTargetSubprocessHidden) {
        return { ...e, hidden: true };
      }
      
      const sParentId = sNode?.parentId;
      const tParentId = tNode?.parentId;
      const sParentZ = sParentId ? (deptZIndices[sParentId] ?? 10) : 10;
      const tParentZ = tParentId ? (deptZIndices[tParentId] ?? 10) : 10;
      const zIndex = Math.min(sParentZ, tParentZ) - 1;
      
      return { 
        ...e, 
        source: effSource, 
        target: effTarget, 
        hidden: false,
        sourceHandle: effSource !== e.source ? 'dep-source' : e.sourceHandle,
        targetHandle: effTarget !== e.target ? 'dep-target' : e.targetHandle,
        zIndex
      };
    });

    return { visibleNodes: preparedNodes, visibleEdges: preparedEdges };
  }, [nodes, edges, hiddenSubprocesses]);

  useEffect(() => {
    (window as any).debugNodes = nodes;
    (window as any).debugEdges = edges;
  }, [nodes, edges]);

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
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'movement' }}
          fitView
          minZoom={0.1}
          onlyRenderVisibleElements
          zIndexMode="manual"
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
                onClick={() => setSubprocessViewOpen(true)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Network size={16} style={{ color: 'var(--accent-primary)' }} />
                Zaporedni pogled
              </button>
              <button 
                onClick={() => setSubprocessMapOpen(true)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Workflow size={16} style={{ color: 'var(--accent-secondary)' }} />
                Zemljevid subprocesov
              </button>
              <button 
                onClick={() => exportToExcel(nodes, edges)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={() => exportToWord(nodes, edges, savedSubprocesses)}
                className="glass-panel" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
              >
                <FileText size={16} />
                Word (.doc)
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
      {(issuesNodeId || issuesEdgeId) && (
        <IssuesModal 
          nodeId={issuesNodeId} 
          edgeId={issuesEdgeId} 
          onClose={() => { setIssuesNodeId(null); setIssuesEdgeId(null); }} 
        />
      )}
      {issuesOverviewOpen && <IssuesOverviewModal onClose={() => setIssuesOverviewOpen(false)} />}
      {subprocessViewOpen && (
        <SubprocessFlowView 
          onClose={() => setSubprocessViewOpen(false)} 
          nodes={nodes} 
          edges={edges} 
        />
      )}
      {subprocessMapOpen && (
        <SubprocessMapModal 
          isOpen={subprocessMapOpen}
          onClose={() => setSubprocessMapOpen(false)} 
          nodes={nodes} 
          edges={edges} 
        />
      )}
      
      {pendingConnection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'var(--bg-panel, #1e293b)',
            border: '1px solid var(--border-subtle, #334155)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            color: 'var(--text-main, #f8fafc)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600 }}>
              Izberi izdelek za prenos
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
              Izberite material/izdelek, ki ga želite prenesti iz skladišča na izbrani proces:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }}>
              {pendingConnection.availableMaterials.map((url) => {
                const isText = url.startsWith('text:');
                const label = isText ? url.substring(5) : 'Slika';
                
                return (
                  <button
                    key={url}
                    onClick={() => {
                      completeConnection(pendingConnection.params, url);
                      setPendingConnection(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle, #334155)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #f8fafc)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                      e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle, #334155)';
                    }}
                  >
                    {isText ? (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '2px', textAlign: 'center', wordBreak: 'break-all' }}>
                        {label.substring(0, 4)}
                      </div>
                    ) : (
                      <img src={url} alt="Material" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                    )}
                    <span style={{ fontSize: '0.9rem', fontWeight: 550 }}>{label}</span>
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingConnection(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle, #334155)',
                  borderRadius: '6px',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Prekliči
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowCanvas;
