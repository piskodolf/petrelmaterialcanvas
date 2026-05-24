import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';

export function useFirebaseSync(flowId: string, initialNodes: Node[], initialEdges: Edge[]) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const isLocalChange = useRef(false);

  useEffect(() => {
    const flowRef = ref(database, `flows/${flowId}`);
    
    const unsubscribe = onValue(flowRef, (snapshot) => {
      if (isLocalChange.current) {
        isLocalChange.current = false;
        return;
      }
      
      const data = snapshot.val();
      if (data) {
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      }
    });

    return () => unsubscribe();
  }, [flowId]);

  const updateNodes = useCallback((newNodesOrUpdater: Node[] | ((nds: Node[]) => Node[])) => {
    setNodes((currentNodes) => {
      const updated = typeof newNodesOrUpdater === 'function' ? newNodesOrUpdater(currentNodes) : newNodesOrUpdater;
      isLocalChange.current = true;
      set(ref(database, `flows/${flowId}/nodes`), updated);
      return updated;
    });
  }, [flowId]);

  const updateEdges = useCallback((newEdgesOrUpdater: Edge[] | ((eds: Edge[]) => Edge[])) => {
    setEdges((currentEdges) => {
      const updated = typeof newEdgesOrUpdater === 'function' ? newEdgesOrUpdater(currentEdges) : newEdgesOrUpdater;
      isLocalChange.current = true;
      set(ref(database, `flows/${flowId}/edges`), updated);
      return updated;
    });
  }, [flowId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      isLocalChange.current = true;
      set(ref(database, `flows/${flowId}/nodes`), updated);
      return updated;
    });
  }, [flowId]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      isLocalChange.current = true;
      set(ref(database, `flows/${flowId}/edges`), updated);
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
