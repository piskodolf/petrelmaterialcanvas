import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ref, onValue, set as firebaseSet } from 'firebase/database';
import { database } from '../firebase';

// Helper to intercept and mock DB writes under ?mockAuth=true or ?mock=true URL flags
const set = (refObj: any, value: any): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const isMockEnabled = params.get('mockAuth') === 'true' || params.get('mock') === 'true';
  if (isMockEnabled) {
    const key = `mock_db_${refObj.toString()}`;
    console.log("Mock DB Set:", key, value);
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }
  return firebaseSet(refObj, value);
};

export type MaterialVariant = {
  id: string;
  label: string;
};

export type MaterialItem = {
  url: string;
  group: string;
  description?: string;
  variants?: MaterialVariant[];
};

export type ToolItem = {
  url: string; // The URL/Name of the tool
  group: string;
  description?: string;
};

export type SubprocessItem = {
  id: string;
  name: string;
  color: string;
};

interface MaterialContextType {
  library: MaterialItem[];
  addMaterialToLibrary: (dataUrl: string, group?: string, description?: string) => void;
  removeMaterialFromLibrary: (dataUrl: string) => void;
  updateMaterialGroup: (dataUrl: string, newGroup: string) => void;
  updateMaterialDescription: (dataUrl: string, newDescription: string) => void;
  updateMaterialVariants: (dataUrl: string, variants: MaterialVariant[]) => void;
  renameMaterialGroup: (oldGroup: string, newGroup: string) => void;
  moveMaterialUp: (dataUrl: string) => void;
  moveMaterialDown: (dataUrl: string) => void;
  reorderMaterial: (draggedUrl: string, targetUrl: string) => void;
  sortMaterialsAlphabetically: () => void;
  activeFilter: string | null;
  setActiveFilter: (dataUrl: string | null) => void;
  
  savedPerformers: string[];
  addPerformer: (name: string) => void;
  removePerformer: (name: string) => void;
  
  savedTools: ToolItem[];
  addTool: (url: string, group?: string, description?: string) => void;
  removeTool: (url: string) => void;
  updateToolGroup: (url: string, newGroup: string) => void;
  updateToolDescription: (url: string, newDescription: string) => void;
  renameToolGroup: (oldGroup: string, newGroup: string) => void;
  moveToolUp: (url: string) => void;
  moveToolDown: (url: string) => void;
  reorderTool: (draggedUrl: string, targetUrl: string) => void;
  sortToolsAlphabetically: () => void;
  
  savedSubprocesses: SubprocessItem[];
  addSubprocess: (name: string, color: string) => void;
  removeSubprocess: (id: string) => void;
  updateSubprocess: (id: string, name: string, color: string) => void;
  moveSubprocessUp: (id: string) => void;
  moveSubprocessDown: (id: string) => void;
  hiddenSubprocesses: string[];
  toggleSubprocessVisibility: (id: string) => void;

  editItem: { url: string; group: string; description: string } | null;
  setEditItem: (item: { url: string; group: string; description: string } | null) => void;
  editVariants: MaterialVariant[];
  setEditVariants: (variants: MaterialVariant[]) => void;
  newVariantLabel: string;
  setNewVariantLabel: (val: string) => void;
  editToolItem: { url: string; group: string; description: string } | null;
  setEditToolItem: (tool: { url: string; group: string; description: string } | null) => void;
  openMaterialEditor: (url: string) => void;
  openToolEditor: (url: string) => void;
}

const MaterialContext = createContext<MaterialContextType | undefined>(undefined);

export const MaterialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState<MaterialItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [savedPerformers, setSavedPerformers] = useState<string[]>([]);
  const [savedTools, setSavedTools] = useState<ToolItem[]>([]);
  const [savedSubprocesses, setSavedSubprocesses] = useState<SubprocessItem[]>([]);
  const [hiddenSubprocesses, setHiddenSubprocesses] = useState<string[]>([]);

  const [editItem, setEditItem] = useState<{ url: string, group: string, description: string } | null>(null);
  const [editVariants, setEditVariants] = useState<MaterialVariant[]>([]);
  const [newVariantLabel, setNewVariantLabel] = useState('');
  const [editToolItem, setEditToolItem] = useState<{ url: string, group: string, description: string } | null>(null);

  const openMaterialEditor = (url: string) => {
    let libItem = library.find(m => m.url === url);
    if (!libItem) {
      const isText = url.startsWith('text:');
      const label = isText ? url.substring(5) : 'Nov Material';
      libItem = {
        url,
        group: 'Neuvrščeno',
        description: label,
        variants: []
      };
      setLibrary((prev) => {
        if (!prev.find(item => item.url === url)) {
          const next = [...prev, libItem!];
          if (user) {
            set(ref(database, `users/${user.uid}/materials`), next);
          }
          return next;
        }
        return prev;
      });
    }

    setEditVariants(libItem.variants ? [...libItem.variants] : []);
    setNewVariantLabel('');
    setEditItem({
      url: libItem.url,
      group: libItem.group || 'Neuvrščeno',
      description: libItem.description || ''
    });
  };

  const openToolEditor = (url: string) => {
    let tool = savedTools.find(t => t.url === url);
    if (!tool) {
      const isText = url.startsWith('text:');
      const label = isText ? url.substring(5) : 'Novo Orodje';
      tool = {
        url,
        group: 'Neuvrščeno',
        description: label
      };
      setSavedTools((prev) => {
        if (!prev.find(t => t.url === url)) {
          const next = [...prev, tool!];
          if (user) {
            set(ref(database, `users/${user.uid}/tools`), next);
          }
          return next;
        }
        return prev;
      });
    }

    setEditToolItem({
      url: tool.url,
      group: tool.group || 'Neuvrščeno',
      description: tool.description || ''
    });
  };
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const isMockEnabled = params.get('mockAuth') === 'true' || params.get('mock') === 'true';

    if (isMockEnabled) {
      const loadLocal = (refObj: any, fallback: any) => {
        const key = `mock_db_${refObj.toString()}`;
        const data = localStorage.getItem(key);
        if (data) {
          try { return JSON.parse(data); } catch(e) {}
        }
        return fallback;
      };

      const materialsRef = ref(database, `users/${user.uid}/materials`);
      const performersRef = ref(database, `users/${user.uid}/performers`);
      const toolsRef = ref(database, `users/${user.uid}/tools`);
      const subprocessesRef = ref(database, `users/${user.uid}/subprocesses`);

      const defaultMaterials = [
        { url: 'text:Aluminij', group: 'Kovinski', description: 'Aluminijasta plošča 2mm', variants: [{ id: 'var_1', label: 'Polirana' }, { id: 'var_2', label: 'Surova' }] },
        { url: 'text:Baker', group: 'Kovinski', description: 'Bakrena žica ⌀1.5mm', variants: [] },
        { url: 'text:Plastika', group: 'Plastika', description: 'ABS granulati', variants: [{ id: 'var_3', label: 'Črna' }, { id: 'var_4', label: 'Bela' }] }
      ];
      const defaultPerformers = ['Operater A', 'Operater B', 'Robot R1'];
      const defaultTools = [
        { url: 'text:CNC', group: 'Stroji', description: 'CNC rezkalni stroj' },
        { url: 'text:Stiskalnica', group: 'Stroji', description: 'Hidravlična stiskalnica' },
        { url: 'text:Ročno orodje', group: 'Orodja', description: 'Set ročnega orodja' }
      ];

      setLibrary(loadLocal(materialsRef, defaultMaterials));
      setSavedPerformers(loadLocal(performersRef, defaultPerformers));
      setSavedTools(loadLocal(toolsRef, defaultTools));
      setSavedSubprocesses(loadLocal(subprocessesRef, []));
      return () => {};
    }

    // References
    const materialsRef = ref(database, `users/${user.uid}/materials`);
    const performersRef = ref(database, `users/${user.uid}/performers`);
    const toolsRef = ref(database, `users/${user.uid}/tools`);
    const subprocessesRef = ref(database, `users/${user.uid}/subprocesses`);

    // Fetch and sync data
    const unsubMaterials = onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLibrary(data);
      } else {
        // Migration from local storage if Firebase is empty
        const localSaved = localStorage.getItem('materialLibrary');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.map((item: any) => {
                if (typeof item === 'string') return { url: item, group: 'Neuvrščeno' };
                if (item.group && item.group.length > 50) return { ...item, group: 'Neuvrščeno' };
                return item;
              });
              set(materialsRef, cleaned);
            }
          } catch (e) {}
        } else {
          setLibrary([]);
        }
      }
    });

    const unsubPerformers = onValue(performersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSavedPerformers(data);
      } else {
        const localPerf = localStorage.getItem('savedPerformers');
        if (localPerf) {
          try {
            const parsed = JSON.parse(localPerf);
            if (Array.isArray(parsed) && parsed.length > 0) {
              set(performersRef, parsed);
            }
          } catch (e) {}
        } else {
          setSavedPerformers([]);
        }
      }
    });

    const unsubTools = onValue(toolsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Soft migration if it contains pure strings
        if (Array.isArray(data)) {
          const migrated = data.map((item: any) => {
            if (typeof item === 'string') {
              return { url: item.startsWith('text:') ? item : `text:${item}`, group: 'Neuvrščeno', description: item.startsWith('text:') ? item.substring(5) : item };
            }
            return item;
          });
          setSavedTools(migrated);
        } else {
          setSavedTools([]);
        }
      } else {
        const localTls = localStorage.getItem('savedTools');
        if (localTls) {
          try {
            const parsed = JSON.parse(localTls);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const migrated = parsed.map((item: any) => {
                if (typeof item === 'string') {
                  return { url: item.startsWith('text:') ? item : `text:${item}`, group: 'Neuvrščeno', description: item.startsWith('text:') ? item.substring(5) : item };
                }
                return item;
              });
              set(toolsRef, migrated);
            }
          } catch (e) {}
        } else {
          setSavedTools([]);
        }
      }
    });

    const unsubSubprocesses = onValue(subprocessesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSavedSubprocesses(data);
      } else {
        setSavedSubprocesses([]);
      }
    });

    return () => {
      unsubMaterials();
      unsubPerformers();
      unsubTools();
      unsubSubprocesses();
    };
  }, [user]);

  const addPerformer = (name: string) => {
    if (!name || name.trim() === '' || !user) return;
    setSavedPerformers(prev => {
      if (prev.some(p => p.toLowerCase() === name.trim().toLowerCase())) return prev;
      const next = [...prev, name.trim()];
      setTimeout(() => set(ref(database, `users/${user.uid}/performers`), next), 0);
      return next;
    });
  };

  const removePerformer = (name: string) => {
    if (!user) return;
    setSavedPerformers(prev => {
      const next = prev.filter(p => p !== name);
      set(ref(database, `users/${user.uid}/performers`), next);
      return next;
    });
  };

  const addTool = (url: string, group: string = 'Neuvrščeno', description?: string) => {
    if (!url || !user) return;
    setSavedTools((prev) => {
      if (!prev.find(item => item.url === url)) {
        const next = [...prev, { url, group, description: description || (url.startsWith('text:') ? url.substring(5) : '') }];
        set(ref(database, `users/${user.uid}/tools`), next);
        return next;
      }
      return prev;
    });
  };

  const removeTool = (url: string) => {
    if (!user) return;
    setSavedTools((prev) => {
      const next = prev.filter(item => item.url !== url);
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const updateToolGroup = (url: string, newGroup: string) => {
    if (!user) return;
    setSavedTools((prev) => {
      const next = prev.map(item => item.url === url ? { ...item, group: newGroup || 'Neuvrščeno' } : item);
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const updateToolDescription = (url: string, newDescription: string) => {
    if (!user) return;
    setSavedTools((prev) => {
      const next = prev.map(item => item.url === url ? { ...item, description: newDescription } : item);
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const renameToolGroup = (oldGroup: string, newGroup: string) => {
    if (!newGroup || newGroup.trim() === '' || !user) return;
    setSavedTools((prev) => {
      const next = prev.map(item => item.group === oldGroup ? { ...item, group: newGroup } : item);
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const reorderTool = (draggedUrl: string, targetUrl: string) => {
    if (!user || draggedUrl === targetUrl) return;
    setSavedTools((prev) => {
      const draggedIndex = prev.findIndex(item => item.url === draggedUrl);
      const targetIndex = prev.findIndex(item => item.url === targetUrl);
      if (draggedIndex < 0 || targetIndex < 0) return prev;

      const next = [...prev];
      const draggedItem = { ...next[draggedIndex] };
      const targetItem = next[targetIndex];
      
      draggedItem.group = targetItem.group || 'Neuvrščeno';

      next.splice(draggedIndex, 1);
      const newTargetIndex = next.findIndex(item => item.url === targetUrl);
      next.splice(newTargetIndex, 0, draggedItem);

      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const moveToolUp = (url: string) => {
    if (!user) return;
    setSavedTools((prev) => {
      const index = prev.findIndex(item => item.url === url);
      if (index < 0) return prev;
      
      const item = prev[index];
      const groupName = item.group || 'Neuvrščeno';
      
      let prevIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        const otherGroup = prev[i].group || 'Neuvrščeno';
        if (otherGroup === groupName) {
          prevIndex = i;
          break;
        }
      }
      
      if (prevIndex < 0) return prev;
      
      const next = [...prev];
      [next[prevIndex], next[index]] = [next[index], next[prevIndex]];
      
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const moveToolDown = (url: string) => {
    if (!user) return;
    setSavedTools((prev) => {
      const index = prev.findIndex(item => item.url === url);
      if (index < 0) return prev;
      
      const item = prev[index];
      const groupName = item.group || 'Neuvrščeno';
      
      let nextIndex = -1;
      for (let i = index + 1; i < prev.length; i++) {
        const otherGroup = prev[i].group || 'Neuvrščeno';
        if (otherGroup === groupName) {
          nextIndex = i;
          break;
        }
      }
      
      if (nextIndex < 0) return prev;
      
      const next = [...prev];
      [next[nextIndex], next[index]] = [next[index], next[nextIndex]];
      
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const sortToolsAlphabetically = () => {
    if (!user) return;
    setSavedTools((prev) => {
      const next = [...prev].sort((a, b) => {
        const groupA = a.group || 'Neuvrščeno';
        const groupB = b.group || 'Neuvrščeno';
        
        if (groupA !== groupB) {
          return groupA.localeCompare(groupB, 'sl');
        }
        
        const descA = a.description || (a.url.startsWith('text:') ? a.url.substring(5) : 'ZZZ_BrezOpisa');
        const descB = b.description || (b.url.startsWith('text:') ? b.url.substring(5) : 'ZZZ_BrezOpisa');
        
        return descA.localeCompare(descB, 'sl');
      });
      
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const addMaterialToLibrary = (dataUrl: string, group: string = 'Neuvrščeno', description?: string) => {
    if (!user) return;
    setLibrary((prev) => {
      if (!prev.find(item => item.url === dataUrl)) {
        const next = [...prev, { 
          url: dataUrl, 
          group, 
          description: description || (dataUrl.startsWith('text:') ? dataUrl.substring(5) : '') 
        }];
        set(ref(database, `users/${user.uid}/materials`), next);
        return next;
      }
      return prev;
    });
  };

  const removeMaterialFromLibrary = (dataUrl: string) => {
    if (!user) return;
    setLibrary((prev) => {
      const next = prev.filter(item => item.url !== dataUrl);
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const updateMaterialGroup = (dataUrl: string, newGroup: string) => {
    if (!user) return;
    setLibrary((prev) => {
      const next = prev.map(item => item.url === dataUrl ? { ...item, group: newGroup || 'Neuvrščeno' } : item);
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const updateMaterialDescription = (dataUrl: string, newDescription: string) => {
    if (!user) return;
    setLibrary((prev) => {
      const next = prev.map(item => item.url === dataUrl ? { ...item, description: newDescription } : item);
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const updateMaterialVariants = (dataUrl: string, variants: MaterialVariant[]) => {
    if (!user) return;
    setLibrary((prev) => {
      const next = prev.map(item => item.url === dataUrl ? { ...item, variants } : item);
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const renameMaterialGroup = (oldGroup: string, newGroup: string) => {
    if (!newGroup || newGroup.trim() === '' || !user) return;
    setLibrary((prev) => {
      const next = prev.map(item => item.group === oldGroup ? { ...item, group: newGroup } : item);
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const reorderMaterial = (draggedUrl: string, targetUrl: string) => {
    if (!user || draggedUrl === targetUrl) return;
    setLibrary((prev) => {
      const draggedIndex = prev.findIndex(item => item.url === draggedUrl);
      const targetIndex = prev.findIndex(item => item.url === targetUrl);
      if (draggedIndex < 0 || targetIndex < 0) return prev;

      const next = [...prev];
      const draggedItem = { ...next[draggedIndex] };
      const targetItem = next[targetIndex];
      
      // Update group of dragged item to target item's group
      draggedItem.group = targetItem.group || 'Neuvrščeno';

      // Remove from old position
      next.splice(draggedIndex, 1);
      
      // Find new target index after removal
      const newTargetIndex = next.findIndex(item => item.url === targetUrl);
      
      // Insert at new position
      next.splice(newTargetIndex, 0, draggedItem);

      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const moveMaterialUp = (dataUrl: string) => {
    if (!user) return;
    setLibrary((prev) => {
      const index = prev.findIndex(item => item.url === dataUrl);
      if (index < 0) return prev;
      
      const item = prev[index];
      const groupName = item.group || 'Neuvrščeno';
      
      let prevIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        const otherGroup = prev[i].group || 'Neuvrščeno';
        if (otherGroup === groupName) {
          prevIndex = i;
          break;
        }
      }
      
      if (prevIndex < 0) return prev;
      
      const next = [...prev];
      [next[prevIndex], next[index]] = [next[index], next[prevIndex]];
      
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const moveMaterialDown = (dataUrl: string) => {
    if (!user) return;
    setLibrary((prev) => {
      const index = prev.findIndex(item => item.url === dataUrl);
      if (index < 0) return prev;
      
      const item = prev[index];
      const groupName = item.group || 'Neuvrščeno';
      
      let nextIndex = -1;
      for (let i = index + 1; i < prev.length; i++) {
        const otherGroup = prev[i].group || 'Neuvrščeno';
        if (otherGroup === groupName) {
          nextIndex = i;
          break;
        }
      }
      
      if (nextIndex < 0) return prev;
      
      const next = [...prev];
      [next[nextIndex], next[index]] = [next[index], next[nextIndex]];
      
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const sortMaterialsAlphabetically = () => {
    if (!user) return;
    setLibrary((prev) => {
      // Sort within the list, preserving groups but ordering by description / url name
      const next = [...prev].sort((a, b) => {
        // First group by group name
        const groupA = a.group || 'Neuvrščeno';
        const groupB = b.group || 'Neuvrščeno';
        
        if (groupA !== groupB) {
          return groupA.localeCompare(groupB, 'sl');
        }
        
        // Inside same group, sort by description
        const descA = a.description || (a.url.startsWith('text:') ? a.url.substring(5) : 'ZZZ_BrezOpisa');
        const descB = b.description || (b.url.startsWith('text:') ? b.url.substring(5) : 'ZZZ_BrezOpisa');
        
        return descA.localeCompare(descB, 'sl');
      });
      
      set(ref(database, `users/${user.uid}/materials`), next);
      return next;
    });
  };

  const addSubprocess = (name: string, color: string) => {
    if (!name || name.trim() === '' || !user) return;
    setSavedSubprocesses(prev => {
      if (prev.some(s => s.name.trim().toLowerCase() === name.trim().toLowerCase())) return prev;
      
      const newId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const next = [...prev, { id: newId, name: name.trim(), color }];
      
      // Perform side-effect safely
      setTimeout(() => {
        set(ref(database, `users/${user.uid}/subprocesses`), next);
      }, 0);
      
      return next;
    });
  };

  const removeSubprocess = (id: string) => {
    if (!user) return;
    setSavedSubprocesses(prev => {
      const next = prev.filter(s => s.id !== id);
      set(ref(database, `users/${user.uid}/subprocesses`), next);
      return next;
    });
    setHiddenSubprocesses(prev => prev.filter(hid => hid !== id));
  };

  const updateSubprocess = (id: string, name: string, color: string) => {
    if (!name || name.trim() === '' || !user) return;
    setSavedSubprocesses(prev => {
      const next = prev.map(s => s.id === id ? { ...s, name: name.trim(), color } : s);
      set(ref(database, `users/${user.uid}/subprocesses`), next);
      return next;
    });
  };

  const moveSubprocessUp = (id: string) => {
    if (!user) return;
    setSavedSubprocesses(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      setTimeout(() => set(ref(database, `users/${user.uid}/subprocesses`), next), 0);
      return next;
    });
  };

  const moveSubprocessDown = (id: string) => {
    if (!user) return;
    setSavedSubprocesses(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index < 0 || index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      setTimeout(() => set(ref(database, `users/${user.uid}/subprocesses`), next), 0);
      return next;
    });
  };

  const toggleSubprocessVisibility = (id: string) => {
    setHiddenSubprocesses(prev => {
      if (prev.includes(id)) return prev.filter(h => h !== id);
      return [...prev, id];
    });
  };

  return (
    <MaterialContext.Provider value={{ 
      library, addMaterialToLibrary, removeMaterialFromLibrary, 
      updateMaterialGroup, updateMaterialDescription, updateMaterialVariants, renameMaterialGroup, 
      moveMaterialUp, moveMaterialDown, reorderMaterial, sortMaterialsAlphabetically,
      activeFilter, setActiveFilter,
      
      savedPerformers, addPerformer, removePerformer,
      
      savedTools, addTool, removeTool,
      updateToolGroup, updateToolDescription, renameToolGroup,
      moveToolUp, moveToolDown, reorderTool, sortToolsAlphabetically,
      
      savedSubprocesses, addSubprocess, removeSubprocess, updateSubprocess,
      moveSubprocessUp, moveSubprocessDown,
      hiddenSubprocesses, toggleSubprocessVisibility,

      editItem, setEditItem,
      editVariants, setEditVariants,
      newVariantLabel, setNewVariantLabel,
      editToolItem, setEditToolItem,
      openMaterialEditor, openToolEditor
    }}>
      {children}
    </MaterialContext.Provider>
  );
};

export const useMaterials = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialProvider');
  }
  return context;
};
