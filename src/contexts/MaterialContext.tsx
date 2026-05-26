import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';

export type MaterialItem = {
  url: string;
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
  addMaterialToLibrary: (dataUrl: string, group?: string) => void;
  removeMaterialFromLibrary: (dataUrl: string) => void;
  updateMaterialGroup: (dataUrl: string, newGroup: string) => void;
  updateMaterialDescription: (dataUrl: string, newDescription: string) => void;
  renameMaterialGroup: (oldGroup: string, newGroup: string) => void;
  moveMaterialUp: (dataUrl: string) => void;
  moveMaterialDown: (dataUrl: string) => void;
  sortMaterialsAlphabetically: () => void;
  activeFilter: string | null;
  setActiveFilter: (dataUrl: string | null) => void;
  savedPerformers: string[];
  addPerformer: (name: string) => void;
  removePerformer: (name: string) => void;
  savedTools: string[];
  addTool: (name: string) => void;
  removeTool: (name: string) => void;
  savedSubprocesses: SubprocessItem[];
  addSubprocess: (name: string, color: string) => void;
  removeSubprocess: (id: string) => void;
  updateSubprocess: (id: string, name: string, color: string) => void;
  moveSubprocessUp: (id: string) => void;
  moveSubprocessDown: (id: string) => void;
  hiddenSubprocesses: string[];
  toggleSubprocessVisibility: (id: string) => void;
}

const MaterialContext = createContext<MaterialContextType | undefined>(undefined);

export const MaterialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState<MaterialItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [savedPerformers, setSavedPerformers] = useState<string[]>([]);
  const [savedTools, setSavedTools] = useState<string[]>([]);
  const [savedSubprocesses, setSavedSubprocesses] = useState<SubprocessItem[]>([]);
  const [hiddenSubprocesses, setHiddenSubprocesses] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

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
        setSavedTools(data);
      } else {
        const localTls = localStorage.getItem('savedTools');
        if (localTls) {
          try {
            const parsed = JSON.parse(localTls);
            if (Array.isArray(parsed) && parsed.length > 0) {
              set(toolsRef, parsed);
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

  const addTool = (name: string) => {
    if (!name || name.trim() === '' || !user) return;
    setSavedTools(prev => {
      if (prev.some(t => t.toLowerCase() === name.trim().toLowerCase())) return prev;
      const next = [...prev, name.trim()];
      setTimeout(() => set(ref(database, `users/${user.uid}/tools`), next), 0);
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

  const removeTool = (name: string) => {
    if (!user) return;
    setSavedTools(prev => {
      const next = prev.filter(t => t !== name);
      set(ref(database, `users/${user.uid}/tools`), next);
      return next;
    });
  };

  const addMaterialToLibrary = (dataUrl: string, group: string = 'Neuvrščeno') => {
    if (!user) return;
    setLibrary((prev) => {
      if (!prev.find(item => item.url === dataUrl)) {
        const next = [...prev, { url: dataUrl, group }];
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

  const renameMaterialGroup = (oldGroup: string, newGroup: string) => {
    if (!newGroup || newGroup.trim() === '' || !user) return;
    setLibrary((prev) => {
      const next = prev.map(item => item.group === oldGroup ? { ...item, group: newGroup } : item);
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
      updateMaterialGroup, updateMaterialDescription, renameMaterialGroup, 
      moveMaterialUp, moveMaterialDown, sortMaterialsAlphabetically,
      activeFilter, setActiveFilter,
      savedPerformers, addPerformer, removePerformer, savedTools, addTool, removeTool,
      savedSubprocesses, addSubprocess, removeSubprocess, updateSubprocess,
      moveSubprocessUp, moveSubprocessDown,
      hiddenSubprocesses, toggleSubprocessVisibility
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
