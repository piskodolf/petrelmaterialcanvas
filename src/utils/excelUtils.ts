import * as XLSX from 'xlsx';
import type { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

export const exportToExcel = (nodes: Node[], edges: Edge[]) => {
  // Oddelki
  const departments = nodes.filter(n => n.type === 'department').map(n => ({
    ID: n.id,
    'Ime oddelka': n.data.label,
    X: Math.round(n.position.x),
    Y: Math.round(n.position.y),
    'Starševski oddelek': n.parentId || ''
  }));

  // Procesi
  const processes = nodes.filter(n => n.type === 'process').map(n => ({
    ID: n.id,
    'Ime procesa': n.data.label,
    'Delovno sredstvo': n.data.equipment || '',
    'Izvajalec': n.data.performer || '',
    'Sprožilec': n.data.trigger || '',
    'Opis': n.data.description || '',
    'Oddelek (ID)': n.parentId || '',
    X: Math.round(n.position.x),
    Y: Math.round(n.position.y)
  }));

  // Skladišča
  const storages = nodes.filter(n => n.type === 'storage').map(n => ({
    ID: n.id,
    'Ime skladišča': n.data.label,
    'Opis': n.data.description || '',
    'Oddelek (ID)': n.parentId || '',
    X: Math.round(n.position.x),
    Y: Math.round(n.position.y)
  }));

  // Povezave (Premiki in toki)
  const links = edges.map(e => ({
    ID: e.id,
    'Od kod (ID)': e.source,
    'Kam (ID)': e.target,
    'Vir točka': e.sourceHandle || '',
    'Cilj točka': e.targetHandle || '',
    'Vrsta povezave': e.data?.connectionType || 'movement',
    'Oblika črte': e.data?.pathType || 'smoothstep',
    'Premikalo (Orodje)': e.data?.tool || '',
    'Izvajalec': e.data?.performer || '',
    'Sprožilec': e.data?.trigger || '',
    'Opis': e.data?.description || ''
  }));

  const wb = XLSX.utils.book_new();
  
  if (departments.length > 0) {
    const wsDepartments = XLSX.utils.json_to_sheet(departments);
    XLSX.utils.book_append_sheet(wb, wsDepartments, 'Oddelki');
  }
  
  if (processes.length > 0) {
    const wsProcesses = XLSX.utils.json_to_sheet(processes);
    XLSX.utils.book_append_sheet(wb, wsProcesses, 'Procesi');
  }

  if (storages.length > 0) {
    const wsStorages = XLSX.utils.json_to_sheet(storages);
    XLSX.utils.book_append_sheet(wb, wsStorages, 'Skladišča');
  }

  if (links.length > 0) {
    const wsLinks = XLSX.utils.json_to_sheet(links);
    XLSX.utils.book_append_sheet(wb, wsLinks, 'Povezave');
  }

  XLSX.writeFile(wb, 'MaterialFlowCanvas_Izvoz.xlsx');
};

export const importFromExcel = (file: File, currentNodes: Node[], currentEdges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Oddelki
        if (wb.Sheets['Oddelki']) {
          const deps = XLSX.utils.sheet_to_json<any>(wb.Sheets['Oddelki']);
          deps.forEach(row => {
            const existingNode = currentNodes.find(n => n.id === row.ID);
            newNodes.push({
              ...existingNode,
              id: row.ID || uuidv4(),
              type: 'department',
              position: { x: Number(row.X) || existingNode?.position.x || 0, y: Number(row.Y) || existingNode?.position.y || 0 },
              parentId: row['Starševski oddelek'] || existingNode?.parentId || undefined,
              data: {
                ...(existingNode ? existingNode.data : {}),
                label: row['Ime oddelka'] || 'Nov Oddelek'
              },
              zIndex: 0
            });
          });
        }

        // Procesi
        if (wb.Sheets['Procesi']) {
          const procs = XLSX.utils.sheet_to_json<any>(wb.Sheets['Procesi']);
          procs.forEach(row => {
            const existingNode = currentNodes.find(n => n.id === row.ID);
            newNodes.push({
              ...existingNode,
              id: row.ID || uuidv4(),
              type: 'process',
              data: {
                ...(existingNode ? existingNode.data : { inputColumns: [], outputColumns: [] }),
                label: row['Ime procesa'] || 'Nov Proces',
                equipment: row['Delovno sredstvo'] || '',
                performer: row['Izvajalec'] || '',
                trigger: row['Sprožilec'] || '',
                description: row['Opis'] || ''
              },
              position: { x: Number(row.X) || existingNode?.position.x || 0, y: Number(row.Y) || existingNode?.position.y || 0 },
              parentId: row['Oddelek (ID)'] || existingNode?.parentId
            });
          });
        }

        // Skladišča
        if (wb.Sheets['Skladišča']) {
          const stores = XLSX.utils.sheet_to_json<any>(wb.Sheets['Skladišča']);
          stores.forEach(row => {
            const existingNode = currentNodes.find(n => n.id === row.ID);
            newNodes.push({
              ...existingNode,
              id: row.ID || uuidv4(),
              type: 'storage',
              data: {
                ...(existingNode ? existingNode.data : { columns: [] }),
                label: row['Ime skladišča'] || 'Novo Skladišče',
                description: row['Opis'] || ''
              },
              position: { x: Number(row.X) || existingNode?.position.x || 0, y: Number(row.Y) || existingNode?.position.y || 0 },
              parentId: row['Oddelek (ID)'] || existingNode?.parentId
            });
          });
        }

        // Povezave
        if (wb.Sheets['Povezave']) {
          const links = XLSX.utils.sheet_to_json<any>(wb.Sheets['Povezave']);
          links.forEach(row => {
            const existingEdge = currentEdges.find(e => e.id === row.ID);
            newEdges.push({
              ...existingEdge,
              id: row.ID || uuidv4(),
              sourceHandle: row['Vir točka'] || null,
              targetHandle: row['Cilj točka'] || null,
              type: 'movement',
              data: {
                ...(existingEdge ? existingEdge.data : {}),
                connectionType: row['Vrsta povezave'] || 'movement',
                pathType: row['Oblika črte'] || 'smoothstep',
                tool: row['Premikalo (Orodje)'] || '',
                performer: row['Izvajalec'] || '',
                trigger: row['Sprožilec'] || '',
                description: row['Opis'] || ''
              },
              source: String(row['Od kod (ID)'] || existingEdge?.source),
              target: String(row['Kam (ID)'] || existingEdge?.target)
            });
          });
        }

        resolve({ nodes: newNodes, edges: newEdges });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
