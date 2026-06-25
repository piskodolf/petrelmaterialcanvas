import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';

const sortNodes = (nds: Node[]): Node[] => {
  return [...nds].sort((a, b) => {
    if (a.type === 'department' && b.type !== 'department') return -1;
    if (a.type !== 'department' && b.type === 'department') return 1;
    return 0;
  });
};

const cleanUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  
  const seen = new WeakSet();
  const jsonStr = JSON.stringify(obj, (key, value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return null; // Circular reference fallback
      }
      seen.add(value);
    }
    return value;
  });
  
  return JSON.parse(jsonStr);
};


export function useFirebaseSync(flowId: string, initialNodes: Node[], initialEdges: Edge[]) {
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
      return [
        { id: 'dept', type: 'department', position: { x: 200, y: 30 }, style: { width: 350, height: 400 }, data: { label: 'Department X' } },
        { id: 'n1', type: 'process', position: { x: 50, y: 150 }, data: { label: 'Process 1', subprocess: 'sub_1' } },
        { id: 'n2', type: 'process', position: { x: 600, y: 150 }, data: { label: 'Process 2', subprocess: 'sub_2' } },
        { id: 'n3', type: 'process', parentId: 'dept', position: { x: 20, y: 20 }, data: { label: 'Process 3', subprocess: 'sub_1' } },
        { id: 'n4', type: 'process', parentId: 'dept', position: { x: 20, y: 220 }, data: { label: 'Process 4', subprocess: 'sub_2' } },
      ];
    }
    return initialNodes;
  });

  const [edges, setEdges] = useState<Edge[]>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
      return [
        { 
          id: 'e1', 
          source: 'n1', 
          target: 'n2', 
          sourceHandle: 'output',
          targetHandle: 'input',
          type: 'movement', 
          zIndex: 1, 
          data: { connectionType: 'movement', pathType: 'straight', materialUrl: 'text:Aluminij' } 
        },
        { 
          id: 'e2', 
          source: 'n3', 
          target: 'n4', 
          sourceHandle: 'output-bottom',
          targetHandle: 'input-top',
          type: 'movement', 
          zIndex: 3, 
          data: { connectionType: 'movement', pathType: 'straight' } 
        },
      ];
    }
    return initialEdges;
  });

  const isLocalChange = useRef(false);

  const lastWriteTime = useRef<number>(0);
  const pendingNodesUpdate = useRef<Node[] | null>(null);
  const throttleTimeout = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, []);

  const executeFirebaseNodesWrite = useCallback((sortedNodes: Node[]) => {
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
      return;
    }
    isLocalChange.current = true;
    set(ref(database, `flows/${flowId}/nodes`), cleanUndefined(sortedNodes));
    lastWriteTime.current = Date.now();
    pendingNodesUpdate.current = null;
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, [flowId]);

  const throttledNodesWrite = useCallback((sortedNodes: Node[], immediate = false) => {
    if (immediate) {
      executeFirebaseNodesWrite(sortedNodes);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastWrite = now - lastWriteTime.current;
    const THROTTLE_MS = 150;
    
    pendingNodesUpdate.current = sortedNodes;
    
    if (timeSinceLastWrite >= THROTTLE_MS) {
      executeFirebaseNodesWrite(sortedNodes);
    } else {
      if (!throttleTimeout.current) {
        throttleTimeout.current = setTimeout(() => {
          if (pendingNodesUpdate.current) {
            executeFirebaseNodesWrite(pendingNodesUpdate.current);
          }
        }, THROTTLE_MS - timeSinceLastWrite);
      }
    }
  }, [executeFirebaseNodesWrite]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
      return;
    }
    const flowRef = ref(database, `flows/${flowId}`);
    
    const unsubscribe = onValue(flowRef, (snapshot) => {
      if (isLocalChange.current) {
        isLocalChange.current = false;
        return;
      }
      
      const data = snapshot.val();
      if (data) {
        if (data.nodes) setNodes(sortNodes(data.nodes));
        if (data.edges) setEdges(data.edges);
      }
    });

    return () => unsubscribe();
  }, [flowId]);

  const updateNodes = useCallback((newNodesOrUpdater: Node[] | ((nds: Node[]) => Node[])) => {
    setNodes((currentNodes) => {
      const updated = typeof newNodesOrUpdater === 'function' ? newNodesOrUpdater(currentNodes) : newNodesOrUpdater;
      const sorted = sortNodes(updated);
      isLocalChange.current = true;
      if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
        // Skip write during mock
      } else {
        set(ref(database, `flows/${flowId}/nodes`), cleanUndefined(sorted));
      }
      return sorted;
    });
  }, [flowId]);

  const updateEdges = useCallback((newEdgesOrUpdater: Edge[] | ((eds: Edge[]) => Edge[])) => {
    setEdges((currentEdges) => {
      const updated = typeof newEdgesOrUpdater === 'function' ? newEdgesOrUpdater(currentEdges) : newEdgesOrUpdater;
      isLocalChange.current = true;
      if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
        // Skip write during mock
      } else {
        set(ref(database, `flows/${flowId}/edges`), cleanUndefined(updated));
      }
      return updated;
    });
  }, [flowId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      const sorted = sortNodes(updated);
      
      const isDragging = changes.some(c => c.type === 'position' && (c as any).dragging);
      
      if (isDragging) {
        throttledNodesWrite(sorted, false);
      } else {
        throttledNodesWrite(sorted, true);
      }
      
      return sorted;
    });
  }, [flowId, throttledNodesWrite]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      isLocalChange.current = true;
      set(ref(database, `flows/${flowId}/edges`), cleanUndefined(updated));
      return updated;
    });
  }, [flowId]);

  return { 
    nodes, 
    edges, 
    setNodes: updateNodes, 
    setEdges: updateEdges, 
    onNodesChange, 
    onEdgesChange 
  };
}
