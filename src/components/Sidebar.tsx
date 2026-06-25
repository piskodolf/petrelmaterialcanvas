import React, { useState, useMemo } from 'react';
import { Building2, Cog, ArrowRightLeft, Database, HardDrive, Edit2, Check, Sun, Moon, User, Truck, X, Network, Eye, EyeOff, Plus, ChevronUp, ChevronDown, Trash2, Layers } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import { useTheme } from '../contexts/ThemeContext';
import type { MaterialItem, ToolItem, SubprocessItem, MaterialVariant } from '../contexts/MaterialContext';

interface MaterialEditorModalProps {
  editItem: { url: string; group: string; description: string };
  editVariants: MaterialVariant[];
  materialGroups: string[];
  activeFilter: string | null;
  setActiveFilter: (url: string | null) => void;
  onSave: (group: string, description: string, variants: MaterialVariant[]) => void;
  onCancel: () => void;
}

const MaterialEditorModal: React.FC<MaterialEditorModalProps> = ({
  editItem,
  editVariants,
  materialGroups,
  activeFilter,
  setActiveFilter,
  onSave,
  onCancel
}) => {
  const [description, setDescription] = useState(editItem.description);
  const [group, setGroup] = useState(editItem.group);
  const [variants, setVariants] = useState(editVariants);
  const [newVariantLabel, setNewVariantLabel] = useState('');

  return (
    <div className="editor-overlay nodrag nopan" onClick={onCancel}>
      <div className="editor-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <div className="editor-title">
            <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
            Urejanje materiala
          </div>
          <button className="editor-close-btn" onClick={onCancel} title="Zapri">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          {/* Preview + fields */}
          <div className="editor-meta-section">
            <div className="editor-preview-container">
              {editItem.url.startsWith('text:') ? (
                <div className="editor-preview-text">{editItem.url.substring(5)}</div>
              ) : (
                <img src={editItem.url} alt="Preview" className="editor-preview-image" />
              )}
            </div>
            <div className="editor-fields-stack">
              <div className="editor-field-group">
                <label className="editor-label">Ime / Opis materiala</label>
                <input
                  type="text"
                  className="editor-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Npr. Bakrena žica ⌀1.5mm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSave(group, description, variants);
                    }
                  }}
                />
              </div>
              <div className="editor-field-group">
                <label className="editor-label">Skupina</label>
                <select
                  className="editor-select"
                  value={group === 'Neuvrščeno' || materialGroups.includes(group) ? group : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGroup(val === 'custom' ? '' : val);
                  }}
                >
                  <option value="Neuvrščeno">Neuvrščeno</option>
                  {materialGroups.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                  <option value="custom">+ Nova skupina...</option>
                </select>
                {!(group === 'Neuvrščeno' || materialGroups.includes(group)) && (
                  <input
                    type="text"
                    className="editor-input"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    placeholder="Vpiši ime nove skupine..."
                    style={{ marginTop: '6px' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Variants section */}
          <div className="editor-variants-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
              <span className="editor-label" style={{ textTransform: 'none', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: 0 }}>Pod-statusi / Variante</span>
              {variants.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '8px', padding: '1px 7px' }}>
                  {variants.length}
                </span>
              )}
            </div>

            <div className="editor-variants-list-wrapper">
              {variants.length === 0 ? (
                <div className="editor-empty-variants">Ni pod-statusov. Dodaj spodaj.</div>
              ) : (
                variants.map((v, idx) => (
                  <div key={v.id} className="editor-variant-row">
                    <div className="editor-variant-bullet" />
                    <input
                      type="text"
                      className="editor-variant-input"
                      value={v.label}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[idx] = { ...v, label: e.target.value };
                        setVariants(updated);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder="Naziv pod-statusa"
                    />
                    <button
                      className="editor-variant-delete-btn"
                      onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                      title="Izbriši pod-status"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="editor-add-variant-row">
              <input
                type="text"
                className="editor-add-variant-input"
                value={newVariantLabel}
                onChange={(e) => setNewVariantLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newVariantLabel.trim()) {
                    setVariants([...variants, { id: `var_${Date.now()}_${Math.random().toString(36).substr(2,6)}`, label: newVariantLabel.trim() }]);
                    setNewVariantLabel('');
                  }
                }}
                placeholder="Nov pod-status (npr. Zavita v folijo)…"
              />
              <button
                className="editor-add-variant-btn"
                onClick={() => {
                  if (newVariantLabel.trim()) {
                    setVariants([...variants, { id: `var_${Date.now()}_${Math.random().toString(36).substr(2,6)}`, label: newVariantLabel.trim() }]);
                    setNewVariantLabel('');
                  }
                }}
                title="Dodaj pod-status"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button
            className="editor-btn-secondary"
            style={{ marginRight: 'auto', opacity: activeFilter === editItem.url ? 1 : 0.6, color: activeFilter === editItem.url ? 'var(--accent-primary)' : undefined, borderColor: activeFilter === editItem.url ? 'var(--accent-primary)' : undefined }}
            onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === editItem.url ? null : editItem.url); }}
            title={activeFilter === editItem.url ? 'Odstrani filter' : 'Filtriraj platno po tem materialu'}
          >
            {activeFilter === editItem.url ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="editor-btn-secondary" onClick={onCancel}>Prekliči</button>
          <button
            className="editor-btn-primary"
            onClick={() => onSave(group, description, variants)}
          >
            Shrani
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToolEditorModalProps {
  editToolItem: { url: string; group: string; description: string };
  toolGroups: string[];
  onSave: (group: string, description: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const ToolEditorModal: React.FC<ToolEditorModalProps> = ({
  editToolItem,
  toolGroups,
  onSave,
  onDelete,
  onCancel
}) => {
  const [description, setDescription] = useState(editToolItem.description);
  const [group, setGroup] = useState(editToolItem.group);

  return (
    <div className="editor-overlay nodrag nopan" onClick={onCancel}>
      <div className="editor-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <div className="editor-title">
            <Cog size={16} style={{ color: 'var(--accent-secondary)' }} />
            Urejanje delovnega sredstva
          </div>
          <button className="editor-close-btn" onClick={onCancel} title="Zapri">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          <div className="editor-meta-section">
            <div className="editor-preview-container">
              {editToolItem.url.startsWith('text:') ? (
                <div className="editor-preview-text">{editToolItem.url.substring(5)}</div>
              ) : (
                <img src={editToolItem.url} alt="Preview" className="editor-preview-image" />
              )}
            </div>
            <div className="editor-fields-stack">
              <div className="editor-field-group">
                <label className="editor-label">Ime / Opis sredstva</label>
                <input
                  type="text"
                  className="editor-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Npr. Stroj za stiskanje A"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSave(group, description);
                    }
                  }}
                />
              </div>
              <div className="editor-field-group">
                <label className="editor-label">Skupina</label>
                <select
                  className="editor-select"
                  value={group === 'Neuvrščeno' || toolGroups.includes(group) ? group : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGroup(val === 'custom' ? '' : val);
                  }}
                >
                  <option value="Neuvrščeno">Neuvrščeno</option>
                  {toolGroups.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                  <option value="custom">+ Nova skupina...</option>
                </select>
                {!(group === 'Neuvrščeno' || toolGroups.includes(group)) && (
                  <input
                    type="text"
                    className="editor-input"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    placeholder="Vpiši ime nove skupine..."
                    style={{ marginTop: '6px' }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button
            style={{ marginRight: 'auto', padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--accent-danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
            onClick={onDelete}
            title="Izbriši iz baze"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
          >
            <Trash2 size={14} /> Izbriši
          </button>
          <button className="editor-btn-secondary" onClick={onCancel}>Prekliči</button>
          <button
            className="editor-btn-primary"
            style={{ background: 'var(--accent-secondary)', boxShadow: '0 2px 4px rgba(192,132,252,0.25)' }}
            onClick={() => onSave(group, description)}
          >
            Shrani
          </button>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const { 
    library, activeFilter, setActiveFilter, updateMaterialGroup, updateMaterialDescription, updateMaterialVariants, renameMaterialGroup,
    moveMaterialUp, moveMaterialDown, reorderMaterial, sortMaterialsAlphabetically,
    savedPerformers, removePerformer, 
    savedTools, addTool, removeTool, updateToolGroup, updateToolDescription, renameToolGroup,
    moveToolUp, moveToolDown, reorderTool, sortToolsAlphabetically,
    savedSubprocesses, addSubprocess, removeSubprocess, updateSubprocess,
    moveSubprocessUp, moveSubprocessDown,
    hiddenSubprocesses, toggleSubprocessVisibility,
    editItem, setEditItem,
    editVariants, setEditVariants,
    newVariantLabel, setNewVariantLabel,
    editToolItem, setEditToolItem
  } = useMaterials();
  const { theme, toggleTheme } = useTheme();

  const materialGroups = useMemo(() => {
    const groups = library.map(item => item.group || 'Neuvrščeno');
    return Array.from(new Set(groups)).filter(g => g !== 'Neuvrščeno');
  }, [library]);

  const toolGroups = useMemo(() => {
    const groups = savedTools.map(item => item.group || 'Neuvrščeno');
    return Array.from(new Set(groups)).filter(g => g !== 'Neuvrščeno');
  }, [savedTools]);
  
  // Materials states
  const [editMode, setEditMode] = useState(false);
  const [draggedMaterialUrl, setDraggedMaterialUrl] = useState<string | null>(null);
  const [dragOverItemUrl, setDragOverItemUrl] = useState<string | null>(null);
  const [dragOverGroupName, setDragOverGroupName] = useState<string | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Tools/Sredstva states
  const [editToolMode, setEditToolMode] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [draggedToolUrl, setDraggedToolUrl] = useState<string | null>(null);
  const [dragOverToolUrl, setDragOverToolUrl] = useState<string | null>(null);
  const [dragOverToolGroupName, setDragOverToolGroupName] = useState<string | null>(null);
  const [renamingToolGroup, setRenamingToolGroup] = useState<string | null>(null);
  const [newToolGroupName, setNewToolGroupName] = useState('');
  
  const [newSubprocessName, setNewSubprocessName] = useState('');
  const [newSubprocessColor, setNewSubprocessColor] = useState('#3b82f6');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState<string>('');

  const handleAddSubprocess = () => {
    if (newSubprocessName.trim()) {
      addSubprocess(newSubprocessName, newSubprocessColor);
      setNewSubprocessName('');
    }
  };

  const handleAddTool = () => {
    if (newToolName.trim()) {
      addTool(`text:${newToolName.trim()}`, 'Neuvrščeno', newToolName.trim());
      setNewToolName('');
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

  const groupedTools = useMemo(() => {
    return savedTools.reduce((acc, item) => {
      const group = item.group || 'Neuvrščeno';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, ToolItem[]>);
  }, [savedTools]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <aside className="sidebar glass-panel" style={{ overflowY: 'auto' }}>
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

      {/* Subprocesses */}
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
                {editingSubId === sub.id ? (
                  <input
                    type="text"
                    value={editingSubName}
                    onChange={(e) => setEditingSubName(e.target.value)}
                    onBlur={() => {
                      if (editingSubName.trim()) {
                        updateSubprocess(sub.id, editingSubName.trim(), sub.color);
                      }
                      setEditingSubId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingSubName.trim()) {
                          updateSubprocess(sub.id, editingSubName.trim(), sub.color);
                        }
                        setEditingSubId(null);
                      } else if (e.key === 'Escape') {
                        setEditingSubId(null);
                      }
                    }}
                    autoFocus
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-active)',
                      borderRadius: '4px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      padding: '2px 6px',
                      flex: 1,
                      outline: 'none',
                      marginRight: '6px'
                    }}
                  />
                ) : (
                  <span 
                    style={{ color: 'var(--text-main)', flex: 1, opacity: isHidden ? 0.5 : 1, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                      setEditingSubId(sub.id);
                      setEditingSubName(sub.name);
                    }}
                    title="Klikni za urejanje imena"
                  >
                    {sub.name}
                  </span>
                )}
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

      {/* Performers */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={18} />
          Izvajalci
        </div>
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Baza izvajalcev nalogov. Element se shrani ob prvem vpisu.
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

      {/* Baza Sredstev (Structured Tools) */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck size={18} style={{ color: 'var(--accent-primary)' }} />
          Baza Sredstev
        </div>
        {savedTools.length > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => sortToolsAlphabetically()}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Razvrsti po abecedi znotraj skupin"
            >
              Sortiraj
            </button>
            <button 
              onClick={() => setEditToolMode(!editToolMode)} 
              style={{ 
                background: editToolMode ? 'rgba(56, 189, 248, 0.2)' : 'transparent', 
                border: `1px solid ${editToolMode ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, 
                color: editToolMode ? 'var(--accent-primary)' : 'var(--text-main)', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {editToolMode ? <><Check size={12}/> Končaj</> : <><Edit2 size={12}/> Uredi</>}
            </button>
          </div>
        )}
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
        {editToolMode ? 'Premikaj sredstva s puščicami ali uredi opis in skupino.' : 'Klikni na vrstico za urejanje opisa in skupine.'}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <input 
          type="text"
          value={newToolName}
          onChange={(e) => setNewToolName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddTool(); }}
          placeholder="Novo sredstvo (npr. Stroj A)"
          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.75rem' }}
        />
        <button 
          onClick={handleAddTool}
          style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}
          title="Dodaj sredstvo"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="sidebar-library-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {savedTools.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Baza je prazna. Vpiši novo sredstvo zgoraj.</div>}
        
        {Object.entries(groupedTools).map(([groupName, items]) => {
          const isGroupHovered = dragOverToolGroupName === groupName;
          return (
            <div 
              key={groupName} 
              className="library-group"
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedToolUrl) {
                  setDragOverToolGroupName(groupName);
                }
              }}
              onDragLeave={() => {
                setDragOverToolGroupName(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedToolUrl) {
                  updateToolGroup(draggedToolUrl, groupName);
                }
                setDraggedToolUrl(null);
                setDragOverToolGroupName(null);
              }}
              style={{
                background: isGroupHovered ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                borderRadius: '8px',
                padding: isGroupHovered ? '6px' : '0px',
                border: isGroupHovered ? '1px dashed var(--accent-primary)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div className="library-group-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                {renamingToolGroup === groupName ? (
                  <input 
                    type="text"
                    value={newToolGroupName}
                    onChange={e => setNewToolGroupName(e.target.value)}
                    onBlur={() => { renameToolGroup(groupName, newToolGroupName); setRenamingToolGroup(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { renameToolGroup(groupName, newToolGroupName); setRenamingToolGroup(null); } }}
                    autoFocus
                    style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--accent-primary)', borderRadius: '2px', padding: '2px 4px', fontSize: '0.8rem', width: '100%' }}
                  />
                ) : (
                  <>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.8 }}>
                      {groupName} {isGroupHovered && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 'normal', marginLeft: '6px' }}>(Spusti za uvrstitev)</span>}
                    </span>
                    {editToolMode && (
                      <button 
                        onClick={() => { setRenamingToolGroup(groupName); setNewToolGroupName(groupName); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Preimenuj skupino"
                      >
                        <Edit2 size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="sidebar-library-rows">
                {items.map((item, i) => {
                  const isDragged = draggedToolUrl === item.url;
                  const isOver = dragOverToolUrl === item.url;
                  return (
                    <div 
                      key={i} 
                      className="library-row-item"
                      draggable
                      onDragStart={(e) => {
                        setDraggedToolUrl(item.url);
                        e.dataTransfer.setData('application/tool-url', item.url);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedToolUrl(null);
                        setDragOverToolUrl(null);
                        setDragOverToolGroupName(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedToolUrl && draggedToolUrl !== item.url) {
                          setDragOverToolUrl(item.url);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverToolUrl(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedToolUrl && draggedToolUrl !== item.url) {
                          reorderTool(draggedToolUrl, item.url);
                        }
                        setDraggedToolUrl(null);
                        setDragOverToolUrl(null);
                      }}
                      onClick={() => {
                        setEditToolItem({ 
                          url: item.url, 
                          group: item.group || 'Neuvrščeno', 
                          description: item.description || '' 
                        });
                      }}
                      title={editToolMode ? 'Premakni s puščicami ali klikni za urejanje opisa' : 'Klikni za urejanje opisa in skupine'}
                      style={{
                        opacity: isDragged ? 0.3 : 1,
                        borderTop: isOver ? '2px solid var(--accent-primary)' : undefined,
                        transform: isOver ? 'translateY(2px)' : undefined,
                        transition: 'all 0.1s'
                      }}
                    >
                      <div 
                        className="library-item-square" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)' }}
                      >
                        {item.url.startsWith('text:') ? (
                          <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', padding: '2px', wordBreak: 'break-word', lineHeight: 1 }}>
                            {item.url.substring(5, 7)}
                          </div>
                        ) : (
                          <img src={item.url} alt="Tool" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      
                      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span 
                          style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 500, 
                            color: item.description ? 'var(--text-main)' : 'var(--text-muted)',
                            fontStyle: item.description ? 'normal' : 'italic',
                            width: '100%',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.description || (item.url.startsWith('text:') ? item.url.substring(5) : item.url)}
                        </span>
                        {item.url.startsWith('text:') && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Oznaka: {item.url.substring(5)}
                          </span>
                        )}
                      </div>
  
                      {editToolMode ? (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => moveToolUp(item.url)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} 
                            title="Premakni gor"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={() => moveToolDown(item.url)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} 
                            title="Premakni dol"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      ) : (
                        <Edit2 size={11} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Baza Materialov */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="sidebar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database />
          Baza Materialov
        </div>
        {library.length > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => sortMaterialsAlphabetically()}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Razvrsti po abecedi znotraj skupin"
            >
              Sortiraj
            </button>
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
          </div>
        )}
      </div>
      <div className="sidebar-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {editMode ? 'Premikaj materiale s puščicami ali uredi opis in skupino.' : 'Klikni na sličico za filtriranje ali na vrstico za urejanje.'}
      </div>
      
      <div className="sidebar-library-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {library.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Baza je prazna. Naloži slike na procese.</div>}
        
        {Object.entries(groupedLibrary).map(([groupName, items]) => {
          const isGroupHovered = dragOverGroupName === groupName;
          return (
            <div 
              key={groupName} 
              className="library-group"
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedMaterialUrl) {
                  setDragOverGroupName(groupName);
                }
              }}
              onDragLeave={() => {
                setDragOverGroupName(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedMaterialUrl) {
                  updateMaterialGroup(draggedMaterialUrl, groupName);
                }
                setDraggedMaterialUrl(null);
                setDragOverGroupName(null);
              }}
              style={{
                background: isGroupHovered ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                borderRadius: '8px',
                padding: isGroupHovered ? '6px' : '0px',
                border: isGroupHovered ? '1px dashed var(--accent-primary)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
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
                      {groupName} {isGroupHovered && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 'normal', marginLeft: '6px' }}>(Spusti za uvrstitev)</span>}
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
              <div className="sidebar-library-rows">
                {items.map((item, i) => {
                  const isFiltered = activeFilter === item.url;
                  const isDragged = draggedMaterialUrl === item.url;
                  const isOver = dragOverItemUrl === item.url;
                  return (
                    <div 
                      key={i} 
                      className={`library-row-item ${isFiltered ? 'active-filter' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedMaterialUrl(item.url);
                        e.dataTransfer.setData('application/material-url', item.url);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedMaterialUrl(null);
                        setDragOverItemUrl(null);
                        setDragOverGroupName(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedMaterialUrl && draggedMaterialUrl !== item.url) {
                          setDragOverItemUrl(item.url);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverItemUrl(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedMaterialUrl && draggedMaterialUrl !== item.url) {
                          reorderMaterial(draggedMaterialUrl, item.url);
                        }
                        setDraggedMaterialUrl(null);
                        setDragOverItemUrl(null);
                      }}
                      onClick={() => {
                        const libItem = library.find(m => m.url === item.url);
                        setEditVariants(libItem?.variants ? [...libItem.variants] : []);
                        setNewVariantLabel('');
                        setEditItem({ 
                          url: item.url, 
                          group: item.group || 'Neuvrščeno', 
                          description: item.description || '' 
                        });
                      }}
                      title={editMode ? 'Povleci za sortiranje/grupiranje ali klikni za urejanje opisa' : 'Klikni za urejanje opisa in skupine'}
                      style={{
                        opacity: isDragged ? 0.3 : 1,
                        borderTop: isOver ? '2px solid var(--accent-primary)' : undefined,
                        transform: isOver ? 'translateY(2px)' : undefined,
                        transition: 'all 0.1s'
                      }}
                    >
                      <div 
                        className="library-item-square" 
                        style={{ opacity: editMode ? 0.6 : 1 }}
                        title="Klikni vrstico za urejanje materiala"
                      >
                        {item.url.startsWith('text:') ? (
                          <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', padding: '2px', wordBreak: 'break-word', lineHeight: 1, color: 'var(--text-main)' }}>
                            {item.url.substring(5)}
                          </div>
                        ) : (
                          <img src={item.url} alt="Material" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      
                      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span 
                          style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 500, 
                            color: item.description ? 'var(--text-main)' : 'var(--text-muted)',
                            fontStyle: item.description ? 'normal' : 'italic',
                            width: '100%',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.description || 'Brez opisa / klikni za vpis...'}
                        </span>
                        {item.url.startsWith('text:') && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Koda: {item.url.substring(5)}
                          </span>
                        )}
                        {/* Variant chips */}
                        {item.variants && item.variants.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                            {item.variants.map(v => (
                              <span key={v.id} style={{
                                fontSize: '0.6rem',
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: 'var(--accent-primary)',
                                borderRadius: '8px',
                                padding: '1px 5px',
                                whiteSpace: 'nowrap',
                                maxWidth: '80px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={v.label}>● {v.label}</span>
                            ))}
                          </div>
                        )}
                      </div>
  
                      {editMode ? (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => moveMaterialUp(item.url)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} 
                            title="Premakni gor"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={() => moveMaterialDown(item.url)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} 
                            title="Premakni dol"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveFilter(isFiltered ? null : item.url)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center', color: isFiltered ? 'var(--accent-primary)' : 'var(--text-muted)', opacity: isFiltered ? 1 : 0.45, transition: 'all 0.15s' }}
                            title={isFiltered ? 'Odstrani filter' : 'Filtriraj platno po tem materialu'}
                          >
                            {isFiltered ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </aside>

      {/* Material Editor Modal */}
      {editItem && (
        <MaterialEditorModal
          editItem={editItem}
          editVariants={editVariants}
          materialGroups={materialGroups}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onSave={(group, description, variants) => {
            updateMaterialGroup(editItem.url, group);
            updateMaterialDescription(editItem.url, description);
            updateMaterialVariants(editItem.url, variants);
            setEditItem(null);
          }}
          onCancel={() => setEditItem(null)}
        />
      )}

      {/* Tool Editor Modal */}
      {editToolItem && (
        <ToolEditorModal
          editToolItem={editToolItem}
          toolGroups={toolGroups}
          onSave={(group, description) => {
            updateToolGroup(editToolItem.url, group);
            updateToolDescription(editToolItem.url, description);
            setEditToolItem(null);
          }}
          onDelete={() => {
            removeTool(editToolItem.url);
            setEditToolItem(null);
          }}
          onCancel={() => setEditToolItem(null)}
        />
      )}
    </>
  );
};
