import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Cog, Trash2, Package, Plus, Edit2, Play, Factory, User, FileText, Network, AlertTriangle, Layers, HelpCircle } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import './nodes.css';

export interface MaterialColumn {
  materialUrl: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  capacity: number;
  items: (string | null)[];
}

export const ArrowIcon = ({ direction, type }: { direction: 'left' | 'right' | 'up' | 'down', type: 'target' | 'source' }) => {
  const color = type === 'target' ? '#22c55e' : '#c084fc';
  
  const getPoints = () => {
    switch (direction) {
      case 'left':
        return (
          <>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </>
        );
      case 'right':
        return (
          <>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </>
        );
      case 'up':
        return (
          <>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </>
        );
      case 'down':
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </>
        );
    }
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      width="16" 
      height="16" 
      stroke={color} 
      strokeWidth="3.5" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ display: 'block', filter: `drop-shadow(0 0 2px ${color}80)` }}
    >
      {getPoints()}
    </svg>
  );
};

export const ProcessNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();
  const { library, addMaterialToLibrary, removeMaterialFromLibrary, activeFilter, savedSubprocesses, savedTools, addTool, savedPerformers, addPerformer, openMaterialEditor } = useMaterials();
  const [pickerOpen, setPickerOpen] = useState<{ type: 'inputColumns' | 'outputColumns', colIndex: number } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [variantSubMenu, setVariantSubMenu] = useState<{ itemUrl: string } | null>(null);
  
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
    const hasInCols = inputCols.some(c => c && (c.materialUrl === url || c.items?.includes(url))) ||
                     outputCols.some(c => c && (c.materialUrl === url || c.items?.includes(url)));
    if (hasInCols) return true;

    // Legacy fallback
    const before = Array.isArray(data.materialsBefore) ? data.materialsBefore : [];
    const after = Array.isArray(data.materialsAfter) ? data.materialsAfter : [];
    return before.includes(url) || after.includes(url);
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

    const parseColHandle = (handleId: string | null | undefined) => {
      if (!handleId) return null;
      const parts = handleId.split('-');
      if (parts.length < 5) return null;
      
      if (parts[0] === 'input' && parts[1] === 'col' && parts[2] === 'right') {
        return {
          type: 'right-target',
          colIndex: parseInt(parts[3], 10),
          slotIndex: parseInt(parts[5], 10),
          prefix: 'input-col-right'
        };
      }
      if (parts[0] === 'output' && parts[1] === 'col' && parts[2] === 'left') {
        return {
          type: 'left-source',
          colIndex: parseInt(parts[3], 10),
          slotIndex: parseInt(parts[5], 10),
          prefix: 'output-col-left'
        };
      }
      if (parts[0] === 'input' && parts[1] === 'col') {
        return {
          type: 'left-target',
          colIndex: parseInt(parts[2], 10),
          slotIndex: parseInt(parts[4], 10),
          prefix: 'input-col'
        };
      }
      if (parts[0] === 'output' && parts[1] === 'col') {
        return {
          type: 'right-source',
          colIndex: parseInt(parts[2], 10),
          slotIndex: parseInt(parts[4], 10),
          prefix: 'output-col'
        };
      }
      return null;
    };

    setEdges((eds) => eds.filter(e => {
      if (e.target === id) {
        const parsed = parseColHandle(e.targetHandle);
        if (parsed) {
          const isLeftTarget = parsed.type === 'left-target' && type === 'inputColumns';
          const isRightTarget = parsed.type === 'right-target' && type === 'outputColumns';
          if (isLeftTarget || isRightTarget) {
            if (newCapVal === 0) {
              if (parsed.colIndex === colIndex) return false;
            } else {
              if (parsed.colIndex === colIndex && parsed.slotIndex >= newCapVal) return false;
            }
          }
        }
      }
      if (e.source === id) {
        const parsed = parseColHandle(e.sourceHandle);
        if (parsed) {
          const isLeftSource = parsed.type === 'left-source' && type === 'inputColumns';
          const isRightSource = parsed.type === 'right-source' && type === 'outputColumns';
          if (isLeftSource || isRightSource) {
            if (newCapVal === 0) {
              if (parsed.colIndex === colIndex) return false;
            } else {
              if (parsed.colIndex === colIndex && parsed.slotIndex >= newCapVal) return false;
            }
          }
        }
      }
      return true;
    }).map(e => {
      if (newCapVal === 0) {
        if (e.target === id) {
          const parsed = parseColHandle(e.targetHandle);
          if (parsed) {
            const isLeftTarget = parsed.type === 'left-target' && type === 'inputColumns';
            const isRightTarget = parsed.type === 'right-target' && type === 'outputColumns';
            if ((isLeftTarget || isRightTarget) && parsed.colIndex > colIndex) {
              const newHandle = `${parsed.prefix}-col-${parsed.colIndex - 1}-mat-${parsed.slotIndex}`;
              return { ...e, targetHandle: newHandle };
            }
          }
        }
        if (e.source === id) {
          const parsed = parseColHandle(e.sourceHandle);
          if (parsed) {
            const isLeftSource = parsed.type === 'left-source' && type === 'inputColumns';
            const isRightSource = parsed.type === 'right-source' && type === 'outputColumns';
            if ((isLeftSource || isRightSource) && parsed.colIndex > colIndex) {
              const newHandle = `${parsed.prefix}-col-${parsed.colIndex - 1}-mat-${parsed.slotIndex}`;
              return { ...e, sourceHandle: newHandle };
            }
          }
        }
      }
      return e;
    }));
  };

  const selectFromLibrary = (dataUrl: string, variantId?: string, variantLabel?: string) => {
    if (!pickerOpen) return;
    const { type, colIndex } = pickerOpen;
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
        if (cols[colIndex]) {
          cols[colIndex] = { 
            ...cols[colIndex], 
            materialUrl: dataUrl,
            variantId: variantId ?? null,
            variantLabel: variantLabel ?? null
          };
        }
        return { ...n, data: { ...n.data, [type]: cols } };
      }
      return n;
    }));
    setPickerOpen(null);
    setVariantSubMenu(null);
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px dashed var(--border-subtle)', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', width: '100%' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'left' }}>USTVARI NOV POLIZDELEK (BREZ SLIKE):</div>
            
            <input 
              id={`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`}
              type="text" 
              placeholder="Ime polizdelka" 
              style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', width: '100%' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const inputName = document.getElementById(`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                  const inputCat = document.getElementById(`text-material-category-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                  if (inputName && inputName.value.trim()) {
                    const nameVal = inputName.value.trim();
                    const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                    const textUrl = `text:${nameVal}`;
                    addMaterialToLibrary(textUrl, catVal, nameVal);
                    selectFromLibrary(textUrl);
                    updateData('description', nameVal);
                  }
                }
              }}
            />
            
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <input 
                id={`text-material-category-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`}
                type="text" 
                placeholder="Kategorija (npr. Embalaža)" 
                list={`categories-list-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`}
                style={{ flexGrow: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', minWidth: '0' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const inputName = document.getElementById(`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                    const inputCat = document.getElementById(`text-material-category-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                    if (inputName && inputName.value.trim()) {
                      const nameVal = inputName.value.trim();
                      const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                      const textUrl = `text:${nameVal}`;
                      addMaterialToLibrary(textUrl, catVal, nameVal);
                      selectFromLibrary(textUrl);
                      updateData('description', nameVal);
                    }
                  }
                }}
              />
              <datalist id={`categories-list-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`}>
                {Array.from(new Set(library.map(item => item.group || 'Neuvrščeno'))).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              
              <button 
                onClick={() => {
                  const inputName = document.getElementById(`text-material-input-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                  const inputCat = document.getElementById(`text-material-category-${id}-${pickerOpen.type}-${pickerOpen.colIndex}`) as HTMLInputElement;
                  if (inputName && inputName.value.trim()) {
                    const nameVal = inputName.value.trim();
                    const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                    const textUrl = `text:${nameVal}`;
                    addMaterialToLibrary(textUrl, catVal, nameVal);
                    selectFromLibrary(textUrl);
                    updateData('description', nameVal);
                  }
                }}
                style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
        {library.length > 0 && (
          <div className="picker-history" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            <div className="picker-subtitle" style={{ marginBottom: '8px', textAlign: 'left' }}>Skupine materialov:</div>
            {Object.entries(
              library.reduce((acc, item) => {
                const grp = item.group || 'Neuvrščeno';
                if (!acc[grp]) acc[grp] = [];
                acc[grp].push(item);
                return acc;
              }, {} as Record<string, typeof library>)
            ).map(([groupName, items]) => {
              const isExpanded = !!expandedGroups[groupName];
              return (
                <div key={groupName} style={{ marginBottom: '10px' }}>
                  <div 
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '9px', 
                      fontWeight: 'bold', 
                      color: 'var(--accent-secondary)', 
                      marginBottom: '4px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em', 
                      textAlign: 'left', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)', 
                      paddingBottom: '4px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{groupName} ({items.length})</span>
                    <span style={{ fontSize: '8px', opacity: 0.6 }}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                  {isExpanded && (
                    <div className="picker-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {items.map((item, i) => {
                        const hasVariants = item.variants && item.variants.length > 0;
                        const isSubMenuOpen = variantSubMenu?.itemUrl === item.url;
                        return (
                          <div key={i} style={{ position: 'relative' }}>
                            <div
                              className="picker-item"
                              style={{ width: '38px', height: '38px', position: 'relative', outline: isSubMenuOpen ? '2px solid var(--accent-primary)' : undefined }}
                              onClick={() => {
                                if (hasVariants) {
                                  setVariantSubMenu(isSubMenuOpen ? null : { itemUrl: item.url });
                                } else {
                                  selectFromLibrary(item.url);
                                }
                              }}
                              title={hasVariants ? 'Klikni za izbiro pod-statusa' : item.description || item.url}
                            >
                              {item.url.startsWith('text:') ? (
                                <div style={{ fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', width: '100%', wordBreak: 'break-word', lineHeight: 1.1, padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  {item.url.substring(5)}
                                </div>
                              ) : (
                                <img src={item.url} alt="History" className="picker-image" />
                              )}
                              {hasVariants && (
                                <div style={{ position: 'absolute', bottom: 1, right: 1, background: 'var(--accent-primary)', borderRadius: '50%', width: '8px', height: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Layers size={5} color="white" />
                                </div>
                              )}
                              <button 
                                className="picker-item-delete" 
                                onClick={(e) => removeFromLibraryLocal(e, item.url)} 
                                title="Izbriši iz knjižnice"
                              >
                                &times;
                              </button>
                            </div>
                            {/* Variant sub-menu */}
                            {isSubMenuOpen && hasVariants && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 100,
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--accent-primary)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '140px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                marginTop: '4px'
                              }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>
                                  Izberi pod-status:
                                </div>
                                <button
                                  onClick={() => selectFromLibrary(item.url)}
                                  style={{ textAlign: 'left', padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontStyle: 'italic' }}
                                >
                                  Brez pod-statusa
                                </button>
                                {item.variants!.map(v => (
                                  <button
                                    key={v.id}
                                    onClick={() => selectFromLibrary(item.url, v.id, v.label)}
                                    style={{ textAlign: 'left', padding: '4px 8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, display: 'inline-block' }} />
                                    {v.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderLightbox = () => {
    if (!lightboxData) return null;
    const { src, type, colIndex } = lightboxData;

    // Find the current column to get variantId
    const currentCols = type === 'inputColumns'
      ? (Array.isArray(data.inputColumns) ? data.inputColumns : inputCols)
      : (Array.isArray(data.outputColumns) ? data.outputColumns : outputCols);
    const currentCol = currentCols[colIndex] as MaterialColumn | undefined;
    const currentVariantId = currentCol?.variantId ?? null;

    // Look up material from library
    const libItem = src ? library.find((m: any) => m.src === src || m.url === src) : null;
    const hasVariants = libItem?.variants && libItem.variants.length > 0;

    const changeVariant = (variantId: string | null, variantLabel: string | null) => {
      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
          const cols = Array.isArray(n.data[type]) ? [...n.data[type]] : (type === 'inputColumns' ? inputCols : outputCols);
          if (cols[colIndex]) {
            cols[colIndex] = { ...cols[colIndex], variantId, variantLabel };
          }
          return { ...n, data: { ...n.data, [type]: cols } };
        }
        return n;
      }));
      setLightboxData(null);
    };

    return createPortal(
      <div className="lightbox-overlay nodrag nopan" onClick={() => setLightboxData(null)}>
        <div className="lightbox-content" onClick={e => e.stopPropagation()} style={{ padding: '0', minWidth: '220px', maxWidth: '280px', overflow: 'hidden', borderRadius: '10px' }}>
          
          {/* Header with image */}
          <div style={{ background: 'var(--bg-dark)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {src ? (
                src.startsWith('text:') ? (
                  <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', padding: '4px', wordBreak: 'break-word', lineHeight: 1.1, color: 'var(--text-main)' }}>
                    {src.substring(5)}
                  </div>
                ) : (
                  <img src={src} alt="Material" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )
              ) : (
                <Package size={28} style={{ opacity: 0.3 }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {libItem?.description || (src?.startsWith('text:') ? src.substring(5) : 'Material')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {libItem?.group || 'Neuvrščeno'}
              </div>
              {currentCol?.variantLabel && (
                <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '10px', padding: '2px 8px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{currentCol.variantLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Variant switcher */}
          {hasVariants && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={11} /> Pod-status:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => changeVariant(null, null)}
                  style={{
                    textAlign: 'left', padding: '5px 10px',
                    background: !currentVariantId ? 'rgba(56,189,248,0.15)' : 'transparent',
                    border: `1px solid ${!currentVariantId ? 'rgba(56,189,248,0.5)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px', color: !currentVariantId ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontSize: '0.75rem', cursor: 'pointer', fontStyle: 'italic'
                  }}
                >
                  Brez pod-statusa
                </button>
                {libItem!.variants!.map(v => (
                  <button
                    key={v.id}
                    onClick={() => changeVariant(v.id, v.label)}
                    style={{
                      textAlign: 'left', padding: '5px 10px',
                      background: currentVariantId === v.id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${currentVariantId === v.id ? 'rgba(56,189,248,0.5)' : 'var(--border-subtle)'}`,
                      borderRadius: '6px', color: currentVariantId === v.id ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: currentVariantId === v.id ? 600 : 400
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: currentVariantId === v.id ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0, display: 'inline-block' }} />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '10px 14px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => { setLightboxData(null); openMaterialEditor(src!); }}
              style={{ flex: 1, padding: '7px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              title="Uredi material (ime, skupino, variante)"
            >
              <Edit2 size={12} /> Uredi
            </button>
            <button
              onClick={() => { setLightboxData(null); setPickerOpen({ type, colIndex }); }}
              style={{ flex: 1, padding: '7px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              title="Zamenjaj material"
            >
              <Plus size={12} /> Zamenjaj
            </button>
            <button
              onClick={removeFromNode}
              style={{ padding: '7px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Odstrani material"
            >
              <Trash2 size={12} /> Odstrani
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderColumns = (cols: MaterialColumn[], type: 'inputColumns' | 'outputColumns') => {
    return (
      <div className="process-columns-container">
        {cols.map((col, colIndex) => (
          <div key={colIndex} className="process-column">
            {/* Header Material */}
            <div 
              className="material-icon-wrapper header-material clickable nodrag" 
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
              {col.variantLabel && (
                <div style={{ position: 'absolute', bottom: -18, left: 0, width: '100%', fontSize: '7px', textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {col.variantLabel}
                </div>
              )}
               {type === 'inputColumns' && (
                <>
                  <Handle 
                    type="target" 
                    position={Position.Left} 
                    id={`input-col-${colIndex}-mat-0`} 
                    style={{ top: '30%' }} 
                    className="material-handle material-handle-target material-handle-left" 
                  />
                  <Handle 
                    type="source" 
                    position={Position.Left} 
                    id={`output-col-left-${colIndex}-mat-0`} 
                    style={{ top: '70%' }} 
                    className="material-handle material-handle-source material-handle-left" 
                  />
                </>
              )}
              {type === 'outputColumns' && (
                <>
                  <Handle 
                    type="target" 
                    position={Position.Right} 
                    id={`input-col-right-${colIndex}-mat-0`} 
                    style={{ top: '30%' }} 
                    className="material-handle material-handle-target material-handle-right" 
                  />
                  <Handle 
                    type="source" 
                    position={Position.Right} 
                    id={`output-col-${colIndex}-mat-0`} 
                    style={{ top: '70%' }} 
                    className="material-handle material-handle-source material-handle-right" 
                  />
                </>
              )}
              <button 
                className="column-delete-btn nodrag" 
                onClick={(e) => { e.stopPropagation(); updateColumnCapacity(type, colIndex, -col.capacity); }}
                title="Izbriši stolpec"
              >&times;</button>
            </div>

            {/* Capacity Controls & Slots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button className="control-btn material-plus nodrag" style={{ margin: 0, padding: 0, width: '14px', height: '14px', fontSize: '12px' }} onClick={() => updateColumnCapacity(type, colIndex, -1)} title="Zmanjšaj kapaciteto">-</button>
              
              <div className="process-column-slots" style={{ width: 'auto' }}>
                {col.capacity > 10 ? (
                  <div className="storage-square nodrag" title={`Kapaciteta: ${col.capacity}`}>
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{col.capacity}</span>
                  </div>
                ) : (
                  Array.from({ length: col.capacity }).map((_, slotIndex) => {
                    const itemsList = col.items || [];
                    const itemUrl = itemsList[slotIndex] || null;
                    return (
                      <div key={slotIndex} className="storage-square clickable nodrag" onClick={() => itemUrl && setLightboxData({ src: itemUrl, type, colIndex, slotIndex })}>
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
              
              <button className="control-btn material-plus nodrag" style={{ margin: 0, padding: 0, width: '14px', height: '14px', fontSize: '12px' }} onClick={() => updateColumnCapacity(type, colIndex, 1)} title="Povečaj kapaciteto">+</button>
            </div>
          </div>
        ))}
        
        {/* Add new column button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '18px' }}>
          <button className="control-btn material-plus nodrag" onClick={() => addColumn(type)} title="Dodaj nov material">+</button>
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
        <Handle type="target" position={Position.Left} id="input" style={{ top: '60%', zIndex: 10 }} className="handle handle-target">
          <ArrowIcon direction="right" type="target" />
        </Handle>
        <Handle type="source" position={Position.Left} id="output-left" style={{ top: '40%', zIndex: 10 }} className="handle handle-source">
          <ArrowIcon direction="left" type="source" />
        </Handle>
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
        <Handle type="target" position={Position.Top} id="input-top" style={{ left: '60%', zIndex: 10 }} className="handle handle-target">
          <ArrowIcon direction="down" type="target" />
        </Handle>
        <Handle type="source" position={Position.Top} id="output-top" style={{ left: '40%', zIndex: 10 }} className="handle handle-source">
          <ArrowIcon direction="up" type="source" />
        </Handle>
        
        <Handle type="target" position={Position.Bottom} id="input-bottom" style={{ left: '40%', zIndex: 10 }} className="handle handle-target">
          <ArrowIcon direction="up" type="target" />
        </Handle>
        <Handle type="source" position={Position.Bottom} id="output-bottom" style={{ left: '60%', zIndex: 10 }} className="handle handle-source">
          <ArrowIcon direction="down" type="source" />
        </Handle>

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
          {Boolean(data.issues && (data.issues as any[]).filter(i => i.type !== 'vprasanje').length > 0) && (
            <span 
              style={{ background: 'var(--accent-warning)', color: '#000', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}
              title={`${(data.issues as any[]).filter(i => i.type !== 'vprasanje').length} izzivov/odpadkov`}
            >
              <AlertTriangle size={10} /> {((data.issues as any[]).filter(i => i.type !== 'vprasanje').length).toString()}
            </span>
          )}
          {Boolean(data.issues && (data.issues as any[]).filter(i => i.type === 'vprasanje').length > 0) && (
            <span 
              style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}
              title={`${(data.issues as any[]).filter(i => i.type === 'vprasanje').length} odprtih vprašanj`}
            >
              <HelpCircle size={10} /> {((data.issues as any[]).filter(i => i.type === 'vprasanje').length).toString()}
            </span>
          )}
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
              onBlur={(e) => {
                const val = e.target.value.trim();
                updateData('equipment', val);
                if (val) {
                  addTool(`text:${val}`, 'Neuvrščeno', val);
                }
              }}
              list={`sredstva-list-${id}`}
              placeholder="Ni določeno"
              autoComplete="off"
            />
            <datalist id={`sredstva-list-${id}`}>
              {savedTools.map((t, idx) => {
                const name = t.description || (t.url.startsWith('text:') ? t.url.substring(5) : t.url);
                return <option key={idx} value={name} />;
              })}
            </datalist>
          </div>

          <div className="detail-row">
            <User size={14} className="detail-icon" />
            <span className="detail-label">Izvajalec:</span>
            <input 
              className="node-input detail-input nodrag"
              defaultValue={data.performer as string || ''}
              onBlur={(e) => {
                const val = e.target.value.trim();
                updateData('performer', val);
                if (val) {
                  addPerformer(val);
                }
              }}
              list={`performers-list-${id}`}
              placeholder="Ni določeno"
              autoComplete="off"
            />
            <datalist id={`performers-list-${id}`}>
              {savedPerformers.map((p, idx) => (
                <option key={idx} value={p} />
              ))}
            </datalist>
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
              }}
              placeholder="Dodaj daljši opis..."
              style={{ width: '100%', height: '100px', resize: 'vertical', fontSize: '11px', lineHeight: '1.3', padding: '4px', textAlign: 'left' }}
            />
          </div>

          <div className="detail-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openNodeIssues', { detail: { nodeId: id } }))}
              className="issues-btn nodrag"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              <AlertTriangle size={14} />
              Izzivi, odpadki & vprašanja
              {Boolean(data.issues && (data.issues as any[]).length > 0) && (
                <span style={{ background: 'var(--accent-warning)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', marginLeft: '4px' }}>
                  {((data.issues as any[]).length).toString()}
                </span>
              )}
            </button>
          </div>

          <div className="detail-row trigger-row" style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
            <Play size={14} className="detail-icon trigger-icon" />
            <span className="detail-label">Sprožilec:</span>
            <input 
              className="node-input detail-input nodrag"
              defaultValue={data.trigger as string || ''}
              onBlur={(e) => updateData('trigger', e.target.value.trim())}
              list={`trigger-list-${id}`}
              placeholder="Ni določen"
              autoComplete="off"
            />
            <datalist id={`trigger-list-${id}`}>
              <option value="Začetek prejšnjega" />
              <option value="Konec prejšnjega" />
              <option value="Na zahtevo" />
              <option value="Urnik (dnevno)" />
              <option value="Urnik (tedensko)" />
            </datalist>
          </div>
        </div>
      </div>

      <div className="columns-area right-columns">
        {renderColumns(outputCols, 'outputColumns')}
        <Handle type="target" position={Position.Right} id="input-right" style={{ top: '40%', zIndex: 10 }} className="handle handle-target">
          <ArrowIcon direction="left" type="target" />
        </Handle>
        <Handle type="source" position={Position.Right} id="output" style={{ top: '60%', zIndex: 10 }} className="handle handle-source">
          <ArrowIcon direction="right" type="source" />
        </Handle>
      </div>
    </div>
  );
});
