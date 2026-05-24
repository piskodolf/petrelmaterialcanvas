import React, { useState, useMemo } from 'react';
import { Building2, Cog, ArrowRightLeft, Database, HardDrive, Edit2, Check, Sun, Moon, User, Truck, X, Network, Eye, EyeOff, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import { useTheme } from '../contexts/ThemeContext';
import type { MaterialItem, SubprocessItem } from '../contexts/MaterialContext';

export const Sidebar = () => {
  const { 
    library, activeFilter, setActiveFilter, updateMaterialGroup, renameMaterialGroup,
    savedPerformers, removePerformer, savedTools, removeTool,
    savedSubprocesses, addSubprocess, removeSubprocess, updateSubprocess,
    moveSubprocessUp, moveSubprocessDown,
    hiddenSubprocesses, toggleSubprocessVisibility
  } = useMaterials();
  const { theme, toggleTheme } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [editItem, setEditItem] = useState<{ url: string, group: string } | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [newSubprocessName, setNewSubprocessName] = useState('');
  const [newSubprocessColor, setNewSubprocessColor] = useState('#3b82f6');

  const handleAddSubprocess = () => {
    if (newSubprocessName.trim()) {
      addSubprocess(newSubprocessName, newSubprocessColor);
      setNewSubprocessName('');
    }
  };

  const groupedLibrary = useMemo(() => {
    return library.reduce((acc, item) => {
      const group = item.group || 'Neuvrščeno';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, MaterialItem[]>);
  }, [library]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <aside className="sidebar glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sidebar-title">
          <Building2 />
          Elementi
        </div>
        <button 
          onClick={toggleTheme} 
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s' }}
          title={theme === 'light' ? 'Preklopi na temno temo' : 'Preklopi na svetlo temo'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Povleci elemente na platno za gradnjo procesa.
      </div>
      
      <div className="drag-item" onDragStart={(event) => onDragStart(event, 'department')} draggable>
        <Building2 className="department-icon" size={20} />
        <span>Oddelek (Kontejner)</span>
      </div>
      
      <div className="drag-item" onDragStart={(event) => onDragStart(event, 'process')} draggable>
        <Cog className="process-icon" size={20} />
        <span>Proces (Korak)</span>
      </div>

      <div className="drag-item" onDragStart={(event) => onDragStart(event, 'storage')} draggable>
        <HardDrive className="storage-icon" size={20} style={{ color: 'var(--accent-success)' }} />
        <span>Skladišče</span>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Network size={18} />
          Subprocesi
        </div>
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
        Ustvari pod-procese za vizualno združevanje.
      </div>
      
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <input 
          type="color" 
          value={newSubprocessColor}
          onChange={(e) => setNewSubprocessColor(e.target.value)}
          style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          title="Izberi barvo"
        />
        <input 
          type="text"
          value={newSubprocessName}
          onChange={(e) => setNewSubprocessName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubprocess(); }}
          placeholder="Ime subprocesa"
          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.75rem' }}
        />
        <button 
          onClick={handleAddSubprocess}
          style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}
          title="Dodaj"
        >
          <Plus size={14} />
        </button>
      </div>

      {savedSubprocesses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {savedSubprocesses.map(sub => {
            const isHidden = hiddenSubprocesses.includes(sub.id);
            return (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${sub.color}`, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-main)', flex: 1, opacity: isHidden ? 0.5 : 1 }}>{sub.name}</span>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <button onClick={() => moveSubprocessUp(sub.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px' }} title="Premakni gor">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveSubprocessDown(sub.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px' }} title="Premakni dol">
                    <ChevronDown size={14} />
                  </button>
                  <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }}></div>
                  <button onClick={() => toggleSubprocessVisibility(sub.id)} style={{ background: 'transparent', border: 'none', color: isHidden ? 'var(--text-muted)' : 'var(--text-main)', cursor: 'pointer', padding: '2px' }} title={isHidden ? "Prikaži" : "Skrij"}>
                    {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => removeSubprocess(sub.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title="Odstrani">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={18} />
          Izvajalci in Orodja
        </div>
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Baza za hitro izbiro. Element se shrani ob prvem vpisu.
      </div>
      
      {savedPerformers.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {savedPerformers.map(p => (
            <div key={p} style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={10} style={{ color: '#a855f7' }} /> {p}
              <button onClick={() => removePerformer(p)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: '2px' }} title="Odstrani"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      
      {savedTools.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {savedTools.map(t => (
            <div key={t} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-primary)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={10} style={{ color: 'var(--accent-primary)' }} /> {t}
              <button onClick={() => removeTool(t)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: '2px' }} title="Odstrani"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database />
          Baza Materialov
        </div>
        {library.length > 0 && (
          <button 
            onClick={() => setEditMode(!editMode)} 
            style={{ 
              background: editMode ? 'rgba(56, 189, 248, 0.2)' : 'transparent', 
              border: `1px solid ${editMode ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, 
              color: editMode ? 'var(--accent-primary)' : 'var(--text-main)', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {editMode ? <><Check size={12}/> Končaj</> : <><Edit2 size={12}/> Uredi</>}
          </button>
        )}
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {editMode ? 'Klikni na sliko za premik ali ikono za preimenovanje skupine.' : 'Klikni na material za filtriranje po procesu.'}
      </div>
      
      <div className="sidebar-library-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {library.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Baza je prazna. Naloži slike na procese.</div>}
        
        {Object.entries(groupedLibrary).map(([groupName, items]) => (
          <div key={groupName} className="library-group">
            <div className="library-group-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              {renamingGroup === groupName ? (
                <input 
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onBlur={() => { renameMaterialGroup(groupName, newGroupName); setRenamingGroup(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { renameMaterialGroup(groupName, newGroupName); setRenamingGroup(null); } }}
                  autoFocus
                  style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--accent-primary)', borderRadius: '2px', padding: '2px 4px', fontSize: '0.8rem', width: '100%' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.8 }}>
                    {groupName}
                  </span>
                  {editMode && (
                    <button 
                      onClick={() => { setRenamingGroup(groupName); setNewGroupName(groupName); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      title="Preimenuj skupino"
                    >
                      <Edit2 size={10} />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="sidebar-library-grid">
              {items.map((item, i) => (
                <div key={i} className="library-item-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <div 
                    className={`library-item ${activeFilter === item.url ? 'active-filter' : ''}`} 
                    onClick={() => {
                      if (editMode) {
                        setEditItem({ url: item.url, group: item.group || 'Neuvrščeno' });
                      } else {
                        setActiveFilter(activeFilter === item.url ? null : item.url);
                      }
                    }}
                    title={editMode ? 'Klikni za urejanje skupine' : 'Prikaži samo procese s tem materialom'}
                    style={{ cursor: 'pointer', width: '34px', height: '34px', border: editMode ? '1px dashed var(--accent-primary)' : undefined }}
                  >
                    {item.url.startsWith('text:') ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '2px', color: 'var(--text-main)' }}>
                        {item.url.substring(5)}
                      </div>
                    ) : (
                      <img src={item.url} alt="Material" className="library-image" style={{ opacity: editMode ? 0.5 : 1 }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </aside>

      {editItem && (
        <div className="lightbox-overlay nodrag nopan" onClick={() => setEditItem(null)} style={{ zIndex: 1000 }}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', minWidth: '250px' }}>
            <img src={editItem.url} alt="Preview" className="lightbox-preview" style={{ maxHeight: '150px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ime skupine:</label>
              <input 
                type="text" 
                value={editItem.group} 
                onChange={(e) => setEditItem({ ...editItem, group: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateMaterialGroup(editItem.url, editItem.group);
                    setEditItem(null);
                  }
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={() => { updateMaterialGroup(editItem.url, editItem.group); setEditItem(null); }}
                  style={{ flex: 1, padding: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Shrani
                </button>
                <button 
                  onClick={() => setEditItem(null)}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Prekliči
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
