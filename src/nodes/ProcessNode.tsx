import { memo, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Cog, Trash2, Package, Plus, Edit2, Play, Factory, User, FileText, Network, AlertTriangle } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import './nodes.css';

export interface MaterialColumn {
  materialUrl: string | null;
  capacity: number;
  items: (string | null)[];
}

export const ProcessNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();
  const { library, addMaterialToLibrary, removeMaterialFromLibrary, activeFilter, savedSubprocesses } = useMaterials();
  const [pickerOpen, setPickerOpen] = useState<{ type: 'inputColumns' | 'outputColumns', colIndex: number } | null>(null);
  
  type LightboxState = { src: string | null, type: 'inputColumns' | 'outputColumns', colIndex: number, slotIndex: number | null };
  const [lightboxData, setLightboxData] = useState<LightboxState | null>(null);

  // Soft migration from old data to keep canvas intact!
  let inputCols: MaterialColumn[] = Array.isArray(data.inputColumns) ? data.inputColumns : [];
  if (inputCols.length === 0 && Array.isArray(data.materialsBefore) && data.materialsBefore.length > 0) {
    inputCols = data.materialsBefore.map(mat => ({
      materialUrl: mat,
      capacity: (data.storageBefore as number) || 1,
      items: Array((data.storageBefore as number) || 1).fill(null)
    }));
  }

  let outputCols: MaterialColumn[] = Array.isArray(data.outputColumns) ? data.outputColumns : [];
  if (outputCols.length === 0 && Array.isArray(data.materialsAfter) && data.materialsAfter.length > 0) {
    outputCols = data.materialsAfter.map(mat => ({
      materialUrl: mat,
      capacity: (data.storageAfter as number) || 1,
      items: Array((data.storageAfter as number) || 1).fill(null)
    }));
  }

  const hasMaterial = (url: string) => {
    return inputCols.some(c => c.materialUrl === url || c.items?.includes(url)) ||
           outputCols.some(c => c.materialUrl === url || c.items?.includes(url));
  };

  const isFilteredOut = activeFilter && !hasMaterial(activeFilter);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  const updateData = (key: string, value: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, [key]: value } };
      }
      return n;
    }));
  };

  const addColumn = (type: 'inputColumns' | 'outputColumns') => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
        cols.push({ materialUrl: null, capacity: 1, items: [null] });
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));
  };

  const removeColumn = (type: 'inputColumns' | 'outputColumns', colIndex: number) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
        cols.splice(colIndex, 1);
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));
  };

  const updateColumnCapacity = (type: 'inputColumns' | 'outputColumns', colIndex: number, delta: number) => {
    const currentCols = Array.isArray(data[type]) ? data[type] : (type === 'inputColumns' ? inputCols : outputCols);
    if (!currentCols || !currentCols[colIndex]) return;

    const newCapVal = Math.max(0, currentCols[colIndex].capacity + delta);

    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : [...currentCols];
        if (cols[colIndex]) {
          if (newCapVal === 0) {
            cols.splice(colIndex, 1);
          } else {
            const newItems = Array.from(cols[colIndex].items || [], x => x === undefined ? null : x);
            if (newCapVal > newItems.length) {
              newItems.push(...Array(newCapVal - newItems.length).fill(null));
            } else {
              newItems.splice(newCapVal);
            }
            cols[colIndex] = { ...cols[colIndex], capacity: newCapVal, items: newItems };
          }
        }
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));

    const handlePrefix = type === 'inputColumns' ? 'input' : 'output';
    setEdges((eds) => eds.filter(e => {
      const isTarget = e.target === id && type === 'inputColumns';
      const isSource = e.source === id && type === 'outputColumns';
      if (!isTarget && !isSource) return true;
      
      const handleId = isTarget ? e.targetHandle : e.sourceHandle;
      if (!handleId || !handleId.startsWith(`${handlePrefix}-col-`)) return true;
      
      const parts = handleId.split('-');
      const edgeColIndex = parseInt(parts[2], 10);
      const edgeSlotIndex = parseInt(parts[4], 10);
      
      if (newCapVal === 0) {
        if (edgeColIndex === colIndex) return false;
      } else {
        if (edgeColIndex === colIndex && edgeSlotIndex >= newCapVal) return false;
      }
      return true;
    }).map(e => {
      if (newCapVal === 0) {
        const isTarget = e.target === id && type === 'inputColumns';
        const isSource = e.source === id && type === 'outputColumns';
        if (!isTarget && !isSource) return e;
        
        const handleId = isTarget ? e.targetHandle : e.sourceHandle;
        if (handleId && handleId.startsWith(`${handlePrefix}-col-`)) {
          const parts = handleId.split('-');
          const edgeColIndex = parseInt(parts[2], 10);
          if (edgeColIndex > colIndex) {
            const newHandle = `${handlePrefix}-col-${edgeColIndex - 1}-mat-${parts[4]}`;
            return { ...e, [isTarget ? 'targetHandle' : 'sourceHandle']: newHandle };
          }
        }
      }
      return e;
    }));
  };

  const selectFromLibrary = (dataUrl: string) => {
    if (!pickerOpen) return;
    const { type, colIndex } = pickerOpen;
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
        if (cols[colIndex]) {
          cols[colIndex] = { ...cols[colIndex], materialUrl: dataUrl };
        }
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));
    setPickerOpen(null);
  };

  const removeFromLibraryLocal = (e: React.MouseEvent, dataUrl: string) => {
    e.stopPropagation();
    removeMaterialFromLibrary(dataUrl);
  };

  const removeFromNode = () => {
    if (!lightboxData) return;
    const { type, colIndex, slotIndex } = lightboxData;
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
        if (slotIndex === null) {
          cols.splice(colIndex, 1);
        } else {
          const items = Array.isArray(cols[colIndex].items) ? [...cols[colIndex].items] : [];
          items[slotIndex] = null;
          cols[colIndex] = { ...cols[colIndex], items };
        }
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));
    setLightboxData(null);
  };

  const onUploadNewMaterial = () => {
    if (!pickerOpen) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 100;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          addMaterialToLibrary(dataUrl);
          selectFromLibrary(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const renderPicker = () => {
    if (!pickerOpen) return null;
    return (
      <div className="material-picker nodrag nopan">
        <div className="picker-header">
          <span>Izberi material stolpca</span>
          <button onClick={() => setPickerOpen(null)} className="picker-close">&times;</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <button className="picker-upload-btn" onClick={onUploadNewMaterial}>
            + Naloži z računalnika
          </button>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ALI:</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
              <input 
                id={`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`}
                type="text" 
                placeholder="Ime (brez slike)" 
                style={{ flexGrow: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', minWidth: '0' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const textUrl = `text:${e.currentTarget.value.trim()}`;
                    addMaterialToLibrary(textUrl);
                    selectFromLibrary(textUrl);
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById(`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const textUrl = `text:${input.value.trim()}`;
                    addMaterialToLibrary(textUrl);
                    selectFromLibrary(textUrl);
                  }
                }}
                style={{ padding: '4px 8px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
        {library.length > 0 && (
          <div className="picker-history">
            <div className="picker-subtitle">Zgodovina:</div>
            <div className="picker-grid">
              {library.map((item, i) => (
                <div key={i} className="picker-item" onClick={() => selectFromLibrary(item.url)}>
                  {item.url.startsWith('text:') ? (
                    <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', width: '100%', wordBreak: 'break-word', lineHeight: 1.1 }}>
                      {item.url.substring(5)}
                    </div>
                  ) : (
                    <img src={item.url} alt="History" className="picker-image" />
                  )}
                  <button className="picker-item-delete" onClick={(e) => removeFromLibraryLocal(e, item.url)} title="Izbriši iz knjižnice">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLightbox = () => {
    if (!lightboxData) return null;
    return (
      <div className="lightbox-overlay nodrag nopan" onClick={() => setLightboxData(null)}>
        <div className="lightbox-content" onClick={e => e.stopPropagation()}>
          {lightboxData.src ? (
            lightboxData.src.startsWith('text:') ? (
              <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', padding: '20px', background: 'var(--bg-dark)', borderRadius: '8px', color: 'var(--text-main)' }}>
                {lightboxData.src.substring(5)}
              </div>
            ) : (
              <img src={lightboxData.src} alt="Preview" className="lightbox-preview" />
            )
          ) : (
            <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <Package size={48} className="material-icon" />
            </div>
          )}
          <button className="lightbox-delete-btn" onClick={removeFromNode}>
            <Trash2 size={16} /> Počisti material
          </button>
        </div>
      </div>
    );
  };

  const renderColumns = (cols: MaterialColumn[], type: 'inputColumns' | 'outputColumns') => {
    return (
      <div className="process-columns-container">
        {cols.map((col, colIndex) => (
          <div key={colIndex} className="process-column">
            {/* Header Material */}
            <div 
              className="material-icon-wrapper header-material clickable" 
              style={{ position: 'relative' }}
              onClick={() => {
                if (!col.materialUrl) setPickerOpen({ type, colIndex });
                else setLightboxData({ src: col.materialUrl, type, colIndex, slotIndex: null });
              }}
              title="Tip materiala"
            >
              {col.materialUrl ? (
                col.materialUrl.startsWith('text:') ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '2px' }}>
                    {col.materialUrl.substring(5)}
                  </div>
                ) : (
                  <img src={col.materialUrl} alt="Tip" className="material-image" />
                )
              ) : <Plus size={14} className="material-icon" />}
              {type === 'inputColumns' && (
                <Handle type="target" position={Position.Left} id={`input-col-${colIndex}-mat-0`} className="material-handle material-handle-target" />
              )}
              {type === 'outputColumns' && (
                <Handle type="source" position={Position.Right} id={`output-col-${colIndex}-mat-0`} className="material-handle material-handle-source" />
              )}
              <button 
                className="column-delete-btn" 
                onClick={(e) => { e.stopPropagation(); updateColumnCapacity(type, colIndex, -col.capacity); }}
                title="Izbriši stolpec"
              >&times;</button>
            </div>

            {/* Capacity Controls & Slots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button className="control-btn material-plus" style={{ margin: 0, padding: 0, width: '14px', height: '14px', fontSize: '12px' }} onClick={() => updateColumnCapacity(type, colIndex, -1)} title="Zmanjšaj kapaciteto">-</button>
              
              <div className="process-column-slots" style={{ width: 'auto' }}>
                {col.capacity > 10 ? (
                  <div className="storage-square" title={`Kapaciteta: ${col.capacity}`}>
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{col.capacity}</span>
                  </div>
                ) : (
                  Array.from({ length: col.capacity }).map((_, slotIndex) => {
                    const itemsList = col.items || [];
                    const itemUrl = itemsList[slotIndex] || null;
                    return (
                      <div key={slotIndex} className="storage-square clickable" onClick={() => itemUrl && setLightboxData({ src: itemUrl, type, colIndex, slotIndex })}>
                        {itemUrl && (
                          itemUrl.startsWith('text:') ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '1px' }}>
                              {itemUrl.substring(5)}
                            </div>
                          ) : (
                            <img src={itemUrl} alt="Material" className="material-image" />
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              <button className="control-btn material-plus" style={{ margin: 0, padding: 0, width: '14px', height: '14px', fontSize: '12px' }} onClick={() => updateColumnCapacity(type, colIndex, 1)} title="Povečaj kapaciteto">+</button>
            </div>
          </div>
        ))}
        
        {/* Add new column button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '18px' }}>
          <button className="control-btn material-plus" onClick={() => addColumn(type)} title="Dodaj nov material">+</button>
        </div>
      </div>
    );
  };

  const activeSubprocess = savedSubprocesses?.find(s => s.id === data.subprocess);

  return (
    <div 
      className={`process-node-wrapper ${isFilteredOut ? 'filtered-out' : ''}`}
      title={data.description as string || undefined}
    >
      {renderLightbox()}
      {renderPicker()}
      
      <div className="columns-area left-columns">
        <Handle type="target" position={Position.Left} id="input" className="handle handle-target" />
        {renderColumns(inputCols, 'inputColumns')}
      </div>

      <div 
        className="process-node process-node-inner" 
        style={{ 
          position: 'relative',
          borderColor: activeSubprocess ? activeSubprocess.color : undefined 
        }}
      >
        {/* Vertical alignment handles */}
        <Handle type="target" position={Position.Top} id="input-top" style={{ left: '40%', zIndex: 10 }} className="handle handle-target" />
        <Handle type="source" position={Position.Top} id="output-top" style={{ left: '60%', zIndex: 10 }} className="handle handle-source" />
        
        <Handle type="target" position={Position.Bottom} id="input-bottom" style={{ left: '40%', zIndex: 10 }} className="handle handle-target" />
        <Handle type="source" position={Position.Bottom} id="output-bottom" style={{ left: '60%', zIndex: 10 }} className="handle handle-source" />

        <div className="process-header" style={activeSubprocess ? { 
          background: `linear-gradient(to right, ${activeSubprocess.color}30, rgba(15, 23, 42, 0))`,
          borderBottomColor: `${activeSubprocess.color}50`
        } : undefined}>
          <Cog size={18} className="process-icon" style={activeSubprocess ? { color: activeSubprocess.color } : {}} />
          <div style={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <input 
              className="node-input process-title-input nodrag"
              defaultValue={data.label as string || ''}
              onBlur={(e) => updateData('label', e.target.value)}
              placeholder="Ime procesa"
            />
            <Edit2 size={12} className="edit-indicator" />
          </div>
          <button className="delete-btn" onClick={onDelete} title="Odstrani proces">
            <Trash2 size={14} />
          </button>
        </div>
        
        <div className="process-details">
          <div className="detail-row">
            <Factory size={14} className="detail-icon" />
            <span className="detail-label">Sredstvo:</span>
            <input 
              className="node-input detail-input nodrag"
              defaultValue={data.equipment as string || ''}
              onBlur={(e) => updateData('equipment', e.target.value)}
              placeholder="Ni določeno"
            />
          </div>

          <div className="detail-row">
            <User size={14} className="detail-icon" />
            <span className="detail-label">Izvajalec:</span>
            <input 
              className="node-input detail-input nodrag"
              defaultValue={data.performer as string || ''}
              onBlur={(e) => updateData('performer', e.target.value)}
              placeholder="Ni določeno"
            />
          </div>

          <div className="detail-row">
            <Network size={14} className="detail-icon" style={activeSubprocess ? { color: activeSubprocess.color } : {}} />
            <span className="detail-label">Subproces:</span>
            <select
              className="node-input detail-input nodrag"
              value={data.subprocess as string || ''}
              onChange={(e) => updateData('subprocess', e.target.value)}
              style={{ background: 'transparent', cursor: 'pointer', appearance: 'auto', padding: '0 4px', width: '100%', height: '20px' }}
            >
              <option value="">Ni določeno</option>
              {savedSubprocesses?.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <FileText size={12} className="detail-icon" style={{ color: 'var(--text-muted)' }} />
              <span className="detail-label" style={{ fontSize: '10px' }}>Opis procesa:</span>
            </div>
            <textarea 
              className="node-input detail-input nodrag nopan"
              defaultValue={data.description as string || ''}
              onBlur={(e) => {
                updateData('description', e.target.value);
                e.target.style.height = '24px';
              }}
              onFocus={(e) => {
                e.target.style.height = '60px';
              }}
              placeholder="Dodaj daljši opis..."
              style={{ width: '100%', height: '24px', resize: 'vertical', fontSize: '11px', lineHeight: '1.3', padding: '4px', transition: 'height 0.2s', textAlign: 'left' }}
            />
          </div>

          <div className="detail-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openNodeIssues', { detail: { nodeId: id } }))}
              className="issues-btn nodrag"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              <AlertTriangle size={14} />
              Izzivi in odpadki
              {Boolean(data.issues && (data.issues as any[]).length > 0) && (
                <span style={{ background: 'var(--accent-warning)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', marginLeft: '4px' }}>
                  {((data.issues as any[]).length).toString()}
                </span>
              )}
            </button>
          </div>

          {Boolean(data.trigger) && (
            <div className="detail-row trigger-row">
              <Play size={14} className="detail-icon trigger-icon" />
              <span className="detail-label">Sprožilec:</span>
              <span className="detail-value">{String(data.trigger)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="columns-area right-columns">
        {renderColumns(outputCols, 'outputColumns')}
        <Handle type="source" position={Position.Right} id="output" className="handle handle-source" />
      </div>
    </div>
  );
});
