import { memo, useState } from 'react';
import { 
  getBezierPath, 
  getSmoothStepPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  Position,
  type EdgeProps
} from '@xyflow/react';
import { getSmartEdge, svgDrawSmoothLinePath, svgDrawStraightLinePath } from '@jalez/react-flow-smart-edge';
import { Truck, Box, Trash2, Zap, Package, User, Activity, ArrowRight, Settings, FileText, AlertTriangle, HelpCircle } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import './edges.css';

export const MovementEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  id,
  selected,
}: EdgeProps) => {
  const { deleteElements, setEdges, getNodes, getEdges } = useReactFlow();
  const { 
    library, addMaterialToLibrary, removeMaterialFromLibrary, activeFilter,
    savedPerformers, addPerformer, savedTools, addTool 
  } = useMaterials();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isFilteredOut = activeFilter && data?.materialUrl !== activeFilter;
  const connectionType = data?.connectionType as string || 'flow';
  const isMovement = connectionType === 'movement';
  const hasPerformerAndTool = connectionType === 'movement' || connectionType === 'delivery';

  const updateData = (key: string, value: any) => {
    setEdges((eds) => eds.map((e) => {
      if (e.id === id) {
        if (key === 'connectionType') {
          let mColor = '#94a3b8';
          if (value === 'movement') mColor = '#3b82f6';
          else if (value === 'core') mColor = '#f59e0b';
          else if (value === 'delivery') mColor = '#06b6d4';
          return { 
            ...e, 
            data: { ...e.data, [key]: value },
            markerEnd: typeof e.markerEnd === 'object' ? { ...e.markerEnd, color: mColor } : e.markerEnd
          };
        }
        return { ...e, data: { ...e.data, [key]: value } };
      }
      return e;
    }));
  };

  const onDeleteEdge = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const onUploadNewMaterial = () => {
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
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          addMaterialToLibrary(dataUrl);
          updateData('materialUrl', dataUrl);
          setPickerOpen(false);
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
      <div className="material-picker nodrag nopan" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '10px' }}>
        <div className="picker-header">
          <span>Izberi polizdelek</span>
          <button onClick={() => setPickerOpen(false)} className="picker-close">&times;</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <button className="picker-upload-btn" onClick={onUploadNewMaterial}>
            + Naloži sliko
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px dashed var(--border-subtle)', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>USTVARI NOV POLIZDELEK (BREZ SLIKE):</div>
            
            <input 
              id={`text-material-input-edge-${id}`}
              type="text" 
              placeholder="Ime polizdelka" 
              style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', width: '100%' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const inputName = document.getElementById(`text-material-input-edge-${id}`) as HTMLInputElement;
                  const inputCat = document.getElementById(`text-material-category-edge-${id}`) as HTMLInputElement;
                  if (inputName && inputName.value.trim()) {
                    const nameVal = inputName.value.trim();
                    const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                    const textUrl = `text:${nameVal}`;
                    addMaterialToLibrary(textUrl, catVal, nameVal);
                    updateData('materialUrl', textUrl);
                    updateData('description', nameVal);
                    setPickerOpen(false);
                  }
                }
              }}
            />
            
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <input 
                id={`text-material-category-edge-${id}`}
                type="text" 
                placeholder="Kategorija (npr. Embalaža)" 
                list={`categories-list-edge-${id}`}
                style={{ flexGrow: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', minWidth: '0' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const inputName = document.getElementById(`text-material-input-edge-${id}`) as HTMLInputElement;
                    const inputCat = document.getElementById(`text-material-category-edge-${id}`) as HTMLInputElement;
                    if (inputName && inputName.value.trim()) {
                      const nameVal = inputName.value.trim();
                      const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                      const textUrl = `text:${nameVal}`;
                      addMaterialToLibrary(textUrl, catVal, nameVal);
                      updateData('materialUrl', textUrl);
                      updateData('description', nameVal);
                      setPickerOpen(false);
                    }
                  }
                }}
              />
              <datalist id={`categories-list-edge-${id}`}>
                {Array.from(new Set(library.map(item => item.group || 'Neuvrščeno'))).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              
              <button 
                onClick={() => {
                  const inputName = document.getElementById(`text-material-input-edge-${id}`) as HTMLInputElement;
                  const inputCat = document.getElementById(`text-material-category-edge-${id}`) as HTMLInputElement;
                  if (inputName && inputName.value.trim()) {
                    const nameVal = inputName.value.trim();
                    const catVal = inputCat?.value.trim() || 'Neuvrščeno';
                    const textUrl = `text:${nameVal}`;
                    addMaterialToLibrary(textUrl, catVal, nameVal);
                    updateData('materialUrl', textUrl);
                    updateData('description', nameVal);
                    setPickerOpen(false);
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
                      color: 'var(--accent-primary)', 
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
                      {items.map((item, i) => (
                        <div key={i} className="picker-item" onClick={() => { updateData('materialUrl', item.url); setPickerOpen(false); }} style={{ width: '38px', height: '38px', position: 'relative' }}>
                          {item.url.startsWith('text:') ? (
                            <div style={{ fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', width: '100%', wordBreak: 'break-word', lineHeight: 1.1, padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              {item.url.substring(5)}
                            </div>
                          ) : (
                            <img src={item.url} alt="History" className="picker-image" />
                          )}
                          <button 
                            className="picker-item-delete" 
                            onClick={(e) => { e.stopPropagation(); removeMaterialFromLibrary(item.url); }} 
                            title="Izbriši iz knjižnice"
                          >
                            &times;
                          </button>
                        </div>
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
  };
  const pathType = data?.pathType as string || 'bezier';
  const pathParams = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  
  let edgePath, labelX, labelY;
  
  if (pathType === 'smartstep') {
    const nodes = getNodes();
    const smartEdge = getSmartEdge({
      sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
      nodes,
      options: {
        drawEdge: svgDrawSmoothLinePath,
        nodePadding: 20,
        gridRatio: 15
      }
    });

    if (smartEdge) {
      edgePath = smartEdge.svgPathString;
      labelX = smartEdge.edgeCenterX;
      labelY = smartEdge.edgeCenterY;
    } else {
      const borderRadius = data?.borderRadius ? Number(data.borderRadius) : 16;
      [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius });
    }
  } else if (pathType === 'smoothstep') {
    const borderRadius = data?.borderRadius ? Number(data.borderRadius) : 16;
    [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius });
  } else if (pathType === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath(pathParams);
  } else {
    [edgePath, labelX, labelY] = getBezierPath(pathParams);
  }

  const currentNodes = getNodes();
  const draggingNode = currentNodes.find(n => n.dragging);
  const allEdges = getEdges();
  const bridgedPath = addBridgesToPath(edgePath, id, currentNodes, allEdges, draggingNode);
  const crossoverArrows = getCrossoverArrows(edgePath, id, currentNodes, allEdges, draggingNode);

  let edgeColor = '#94a3b8';
  let strokeW = 3;

  if (connectionType === 'movement') {
    edgeColor = '#3b82f6';
    strokeW = 4;
  } else if (connectionType === 'delivery') {
    edgeColor = '#06b6d4';
    strokeW = 4;
  } else if (connectionType === 'core') {
    edgeColor = '#f59e0b';
    strokeW = 6;
  } else if (connectionType === 'supply') {
    edgeColor = '#94a3b8';
    strokeW = 1.5;
  }

  if (isFilteredOut) {
    edgeColor = '#334155';
    strokeW = 1;
  }

  return (
    <g className={isFilteredOut ? 'filtered-out' : ''}>
      <BaseEdge path={bridgedPath} markerEnd={markerEnd} style={{ ...style, strokeWidth: strokeW, stroke: edgeColor }} />
      {crossoverArrows.map(arrow => (
        <path 
          key={arrow.key}
          d={arrow.path}
          fill={edgeColor}
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
      ))}
      <EdgeLabelRenderer>
        <div
          className="edge-label-container nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -100%) translate(${labelX}px,${labelY}px) translateY(-10px)`,
            pointerEvents: 'all'
          }}
        >
          <div className={`movement-badge ${selected || pickerOpen ? 'is-selected' : ''}`}>
            <div className="movement-details">
              <div className="movement-row" title="Vrsta povezave">
                <Activity size={12} className="movement-icon" />
                <select 
                  className="edge-input nodrag nopan" 
                  value={connectionType}
                  onChange={(e) => updateData('connectionType', e.target.value)}
                  style={{ width: 'auto', paddingRight: '0px' }}
                >
                  <option value="flow">Naslednja aktivnost</option>
                  <option value="movement">Premik</option>
                  <option value="delivery">Dobava</option>
                  <option value="core">Jedrni proces</option>
                  <option value="supply">Stranska dobava</option>
                </select>
              </div>
              <div className="movement-row" title="Oblika črte">
                <Settings size={12} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
                <select 
                  className="edge-input nodrag nopan" 
                  value={pathType}
                  onChange={(e) => updateData('pathType', e.target.value)}
                  style={{ width: 'auto', paddingRight: '0px' }}
                >
                  <option value="bezier">Krivulja</option>
                  <option value="smoothstep">Pravokotna</option>
                  <option value="smartstep">Pametna (ovire)</option>
                  <option value="straight">Ravna</option>
                </select>
              </div>
              <div className="movement-row" title="Orodje za premik" style={{ display: hasPerformerAndTool ? 'flex' : 'none' }}>
                <Truck size={12} className="movement-icon" />
                <input 
                  className="edge-input"
                  list={`tools-list-${id}`}
                  value={data?.tool as string || ''}
                  onChange={(e) => updateData('tool', e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) addTool(`text:${val}`, 'Neuvrščeno', val);
                  }}
                  placeholder="Viličar"
                  onPointerDown={onPointerDown}
                />
                <datalist id={`tools-list-${id}`}>
                  {savedTools.map((t, idx) => {
                    const name = t.description || (t.url.startsWith('text:') ? t.url.substring(5) : t.url);
                    return <option key={idx} value={name} />;
                  })}
                </datalist>
              </div>
              <div className="movement-row" title="Sprožilec">
                <Zap size={12} className="movement-icon" style={{ color: 'var(--accent-warning)' }} />
                <input 
                  className="edge-input"
                  value={data?.trigger as string || ''}
                  onChange={(e) => updateData('trigger', e.target.value)}
                  placeholder="Sprožilec"
                  onPointerDown={onPointerDown}
                />
              </div>
              <div className="movement-row" title="Kdo izvaja" style={{ display: hasPerformerAndTool ? 'flex' : 'none' }}>
                <User size={12} className="movement-icon" style={{ color: '#a855f7' }} />
                <input 
                  className="edge-input"
                  list={`performers-list-${id}`}
                  value={data?.performer as string || ''}
                  onChange={(e) => updateData('performer', e.target.value)}
                  onBlur={(e) => { if (e.target.value) addPerformer(e.target.value); }}
                  placeholder="Izvajalec"
                  onPointerDown={onPointerDown}
                />
                <datalist id={`performers-list-${id}`}>
                  {savedPerformers.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              
              {/* Material Assignment */}
              <div className="movement-row" title="Polizdelek / Material">
                <div 
                  className={`edge-material-slot ${data?.materialUrl ? 'has-material' : ''}`}
                  onClick={() => setPickerOpen(true)}
                  onPointerDown={onPointerDown}
                >
                  {data?.materialUrl ? (
                    (data.materialUrl as string).startsWith('text:') ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '1px' }}>
                        {(data.materialUrl as string).substring(5)}
                      </div>
                    ) : (
                      <img src={data.materialUrl as string} alt="Material" />
                    )
                  ) : (
                    <Package size={10} className="edge-material-add" />
                  )}
                </div>
                {Boolean(data?.materialUrl) && (
                  <button className="edge-material-remove" onClick={(e) => { e.stopPropagation(); updateData('materialUrl', null); }} onPointerDown={onPointerDown} title="Odstrani material">
                    &times;
                  </button>
                )}
              </div>
              <div className="movement-row" title="Daljši opis" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Opis:</span>
                </div>
                <textarea 
                  className="edge-input nodrag nopan"
                  value={data?.description as string || ''}
                  onChange={(e) => updateData('description', e.target.value)}
                  onPointerDown={onPointerDown}
                  placeholder="Dodaj daljši opis..."
                  style={{ width: '100%', minHeight: '40px', resize: 'vertical', padding: '4px', textAlign: 'left' }}
                />
              </div>
              <div className="movement-row" style={{ marginTop: '4px', width: '100%' }}>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('openEdgeIssues', { detail: { edgeId: id } }))}
                  className="issues-btn nodrag"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  <AlertTriangle size={14} />
                  Izzivi, odpadki & vprašanja
                  {Boolean(data?.issues && ((data?.issues || []) as any[]).length > 0) && (
                    <span style={{ background: 'var(--accent-warning)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', marginLeft: '4px' }}>
                      {(((data?.issues || []) as any[]).length).toString()}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="movement-summary" title={data?.description as string || undefined}>
              {hasPerformerAndTool ? (
                <Truck size={14} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ArrowRight size={14} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
              )}
              {Boolean(data?.materialUrl) && (
                (data!.materialUrl as string).startsWith('text:') ? (
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-node)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '1px', color: 'var(--text-main)', overflow: 'hidden' }} title="Polizdelek">
                    {(data!.materialUrl as string).substring(5)}
                  </div>
                ) : (
                  <img src={data?.materialUrl as string} alt="Material" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} title="Polizdelek" />
                )
              )}
              {Boolean(data?.issues && ((data?.issues || []) as any[]).filter(i => i.type !== 'vprasanje').length > 0) && (
                <span 
                  style={{ background: 'var(--accent-warning)', color: '#000', padding: '1px 5px', borderRadius: '8px', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}
                  title={`${((data?.issues || []) as any[]).filter(i => i.type !== 'vprasanje').length} izzivov/odpadkov`}
                >
                  <AlertTriangle size={8} /> {(((data?.issues || []) as any[]).filter(i => i.type !== 'vprasanje').length).toString()}
                </span>
              )}
              {Boolean(data?.issues && ((data?.issues || []) as any[]).filter(i => i.type === 'vprasanje').length > 0) && (
                <span 
                  style={{ background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '8px', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}
                  title={`${((data?.issues || []) as any[]).filter(i => i.type === 'vprasanje').length} odprtih vprašanj`}
                >
                  <HelpCircle size={8} /> {(((data?.issues || []) as any[]).filter(i => i.type === 'vprasanje').length).toString()}
                </span>
              )}
            </div>

            <button 
              className="edge-delete-btn" 
              onClick={onDeleteEdge} 
              onPointerDown={onPointerDown}
              title="Odstrani povezavo"
            >
              <Trash2 size={12} />
            </button>
            {renderPicker()}
          </div>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});

// Crossover/bridge helper functions
function getNodeAbsPos(node: any, nodes: any[]): { x: number, y: number } {
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
}

function getPathSegments(pathStr: string): Array<{ x1: number, y1: number, x2: number, y2: number }> {
  if (!pathStr) return [];
  const segments: Array<{ x1: number, y1: number, x2: number, y2: number }> = [];
  const commands = pathStr.match(/[MLHVQACZmlhvqacz][^MLHVQACZmlhvqacz]*/g) || [];
  let currX = 0, currY = 0;
  
  commands.forEach(cmdStr => {
    const cmd = cmdStr[0];
    const args = cmdStr.substring(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if (cmd === 'M') {
      if (args.length >= 2) {
        currX = args[0];
        currY = args[1];
      }
    } else if (cmd === 'm') {
      if (args.length >= 2) {
        currX += args[0];
        currY += args[1];
      }
    } else if (cmd === 'L') {
      if (args.length >= 2) {
        const nextX = args[0];
        const nextY = args[1];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'l') {
      if (args.length >= 2) {
        const nextX = currX + args[0];
        const nextY = currY + args[1];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'H') {
      if (args.length >= 1) {
        const nextX = args[0];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: currY });
        currX = nextX;
      }
    } else if (cmd === 'h') {
      if (args.length >= 1) {
        const nextX = currX + args[0];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: currY });
        currX = nextX;
      }
    } else if (cmd === 'V') {
      if (args.length >= 1) {
        const nextY = args[0];
        segments.push({ x1: currX, y1: currY, x2: currX, y2: nextY });
        currY = nextY;
      }
    } else if (cmd === 'v') {
      if (args.length >= 1) {
        const nextY = currY + args[0];
        segments.push({ x1: currX, y1: currY, x2: currX, y2: nextY });
        currY = nextY;
      }
    } else if (cmd === 'Q') {
      if (args.length >= 4) {
        const nextX = args[2];
        const nextY = args[3];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'q') {
      if (args.length >= 4) {
        const nextX = currX + args[2];
        const nextY = currY + args[3];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'C') {
      if (args.length >= 6) {
        const nextX = args[4];
        const nextY = args[5];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'c') {
      if (args.length >= 6) {
        const nextX = currX + args[4];
        const nextY = currY + args[5];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'A') {
      if (args.length >= 7) {
        const nextX = args[5];
        const nextY = args[6];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    } else if (cmd === 'a') {
      if (args.length >= 7) {
        const nextX = currX + args[5];
        const nextY = currY + args[6];
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;
      }
    }
  });
  return segments;
}

function getLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number, y: number } | null {
  const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(det) < 0.001) return null; // Parallel
  
  const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  
  if (lambda >= 0 && lambda <= 1 && gamma >= 0 && gamma <= 1) {
    return {
      x: x1 + lambda * (x2 - x1),
      y: y1 + lambda * (y2 - y1)
    };
  }
  return null;
}

function getHandleCoords(node: any, handleId: string | null, isSource: boolean, nodes: any[]): { x: number, y: number } {
  const absPos = getNodeAbsPos(node, nodes);
  const x = absPos.x;
  const y = absPos.y;
  const w = node.measured?.width || node.width || 250;
  const h = node.measured?.height || node.height || 120;
  
  let pos = isSource ? 'right' : 'left';
  if (handleId) {
    if (handleId.includes('top')) pos = 'top';
    else if (handleId.includes('bottom')) pos = 'bottom';
    else if (handleId.includes('left') || (handleId.includes('input') && !handleId.includes('input-right'))) pos = 'left';
    else if (handleId.includes('right') || handleId.includes('output')) pos = 'right';
  }
  
  if (pos === 'left') return { x, y: y + h / 2 };
  if (pos === 'right') return { x: x + w, y: y + h / 2 };
  if (pos === 'top') return { x: x + w / 2, y };
  if (pos === 'bottom') return { x: x + w / 2, y: y + h };
  
  return { x: x + w / 2, y: y + h / 2 };
}

function getPreciseHandleCoords(
  node: any,
  handleId: string | null,
  isSource: boolean,
  nodes: any[],
  draggingNode?: any
): { x: number, y: number } {
  const fallback = getHandleCoords(node, handleId, isSource, nodes);
  
  if (typeof document === 'undefined') return fallback;
  
  if (draggingNode && node.id !== draggingNode.id) {
    // Only run DOM queries if the node is "near" the dragging node
    const nodeAbs = getNodeAbsPos(node, nodes);
    const draggingAbs = getNodeAbsPos(draggingNode, nodes);
    
    const nodeW = node.measured?.width || node.width || 250;
    const nodeH = node.measured?.height || node.height || 120;
    const dragW = draggingNode.measured?.width || draggingNode.width || 250;
    const dragH = draggingNode.measured?.height || draggingNode.height || 120;
    
    const padding = 350; // Threshold of vicinity (in pixels)
    
    const isNear = Math.max(nodeAbs.x, draggingAbs.x - padding) <= Math.min(nodeAbs.x + nodeW, draggingAbs.x + dragW + padding) &&
                   Math.max(nodeAbs.y, draggingAbs.y - padding) <= Math.min(nodeAbs.y + nodeH, draggingAbs.y + dragH + padding);
                   
    if (!isNear) {
      return fallback;
    }
  }
  
  const nodeEl = document.querySelector(`.react-flow__node[data-id="${node.id}"]`);
  if (!nodeEl || !handleId) return fallback;
  
  const handleEl = nodeEl.querySelector(`[data-handleid="${handleId}"]`);
  if (!handleEl) return fallback;
  
  const nodeRect = nodeEl.getBoundingClientRect();
  const handleRect = handleEl.getBoundingClientRect();
  
  let zoom = 1;
  const viewportEl = document.querySelector('.react-flow__viewport');
  if (viewportEl) {
    const style = window.getComputedStyle(viewportEl);
    const transform = style.transform;
    const match = transform.match(/^matrix\(([^,]+),/);
    if (match) {
      zoom = parseFloat(match[1]);
    }
  } else {
    const nodeW = node.measured?.width || node.width || 250;
    if (nodeW && nodeRect.width !== 0) {
      zoom = nodeRect.width / nodeW;
    }
  }
  if (zoom === 0) zoom = 1;
  
  const relativeX = (handleRect.left + handleRect.width / 2) - nodeRect.left;
  const relativeY = (handleRect.top + handleRect.height / 2) - nodeRect.top;
  
  const absPos = getNodeAbsPos(node, nodes);
  return {
    x: absPos.x + relativeX / zoom,
    y: absPos.y + relativeY / zoom
  };
}

function getEdgePathString(edge: any, nodes: any[], draggingNode?: any): string {
  const sNode = nodes.find(n => n.id === edge.source);
  const tNode = nodes.find(n => n.id === edge.target);
  if (!sNode || !tNode) return '';
  
  const sCoords = getPreciseHandleCoords(sNode, edge.sourceHandle, true, nodes, draggingNode);
  const tCoords = getPreciseHandleCoords(tNode, edge.targetHandle, false, nodes, draggingNode);
  
  let sourcePosition = Position.Right;
  if (edge.sourceHandle) {
    if (edge.sourceHandle.includes('top')) sourcePosition = Position.Top;
    else if (edge.sourceHandle.includes('bottom')) sourcePosition = Position.Bottom;
    else if (edge.sourceHandle.includes('left') || (edge.sourceHandle.includes('input') && !edge.sourceHandle.includes('input-right'))) sourcePosition = Position.Left;
    else if (edge.sourceHandle.includes('right') || edge.sourceHandle.includes('output')) sourcePosition = Position.Right;
  }
  
  let targetPosition = Position.Left;
  if (edge.targetHandle) {
    if (edge.targetHandle.includes('top')) targetPosition = Position.Top;
    else if (edge.targetHandle.includes('bottom')) targetPosition = Position.Bottom;
    else if (edge.targetHandle.includes('left') || (edge.targetHandle.includes('input') && !edge.targetHandle.includes('input-right'))) targetPosition = Position.Left;
    else if (edge.targetHandle.includes('right') || edge.targetHandle.includes('output')) targetPosition = Position.Right;
  }

  const pathParams = {
    sourceX: sCoords.x,
    sourceY: sCoords.y,
    sourcePosition,
    targetX: tCoords.x,
    targetY: tCoords.y,
    targetPosition
  };
  
  const pathType = edge.data?.pathType || 'bezier';
  if (pathType === 'smartstep') {
    const smartEdge = getSmartEdge({
      ...pathParams,
      nodes,
      options: {
        drawEdge: svgDrawSmoothLinePath,
        nodePadding: 20,
        gridRatio: 15
      }
    });
    if (smartEdge) return smartEdge.svgPathString;
    const borderRadius = edge.data?.borderRadius ? Number(edge.data.borderRadius) : 16;
    const [path] = getSmoothStepPath({ ...pathParams, borderRadius });
    return path;
  } else if (pathType === 'smoothstep') {
    const borderRadius = edge.data?.borderRadius ? Number(edge.data.borderRadius) : 16;
    const [path] = getSmoothStepPath({ ...pathParams, borderRadius });
    return path;
  } else if (pathType === 'straight') {
    const [path] = getStraightPath(pathParams);
    return path;
  } else {
    const [path] = getBezierPath(pathParams);
    return path;
  }
}

function getEdgeSegments(edge: any, nodes: any[], draggingNode?: any): Array<{ x1: number, y1: number, x2: number, y2: number }> {
  const pathStr = getEdgePathString(edge, nodes, draggingNode);
  return getPathSegments(pathStr);
}

function addBridgesToPath(
  pathStr: string,
  currentEdgeId: string,
  nodes: any[],
  allEdges: any[],
  draggingNode?: any
): string {
  const mySegments = getPathSegments(pathStr);
  if (mySegments.length === 0) return pathStr;
  
  const myEdge = allEdges.find(e => e.id === currentEdgeId);
  
  // Optimization: If a node is dragging, only calculate bridges for edges connected to it or in its immediate vicinity
  if (draggingNode && myEdge) {
    const isEdgeConnected = myEdge.source === draggingNode.id || myEdge.target === draggingNode.id;
    
    if (!isEdgeConnected) {
      const sNode = nodes.find(n => n.id === myEdge.source);
      const tNode = nodes.find(n => n.id === myEdge.target);
      
      let isNear = false;
      if (sNode && tNode) {
        const sAbs = getNodeAbsPos(sNode, nodes);
        const tAbs = getNodeAbsPos(tNode, nodes);
        const edgeMinX = Math.min(sAbs.x, tAbs.x);
        const edgeMaxX = Math.max(sAbs.x, tAbs.x);
        const edgeMinY = Math.min(sAbs.y, tAbs.y);
        const edgeMaxY = Math.max(sAbs.y, tAbs.y);
        
        const nodeW = draggingNode.measured?.width || draggingNode.width || 250;
        const nodeH = draggingNode.measured?.height || draggingNode.height || 120;
        const nodeAbs = getNodeAbsPos(draggingNode, nodes);
        
        const padding = 350;
        const nodeMinX = nodeAbs.x - padding;
        const nodeMaxX = nodeAbs.x + nodeW + padding;
        const nodeMinY = nodeAbs.y - padding;
        const nodeMaxY = nodeAbs.y + nodeH + padding;
        
        isNear = Math.max(edgeMinX, nodeMinX) <= Math.min(edgeMaxX, nodeMaxX) &&
                 Math.max(edgeMinY, nodeMinY) <= Math.min(edgeMaxY, nodeMaxY);
      }
      
      if (!isNear) {
        return pathStr;
      }
    }
  }
  
  // Stacking/zIndex aware priority sorting:
  // 1. The edge with the HIGHER z-index (rendered on top) JUMPS.
  // 2. The edge with the LOWER z-index (rendered below) does NOT jump.
  // 3. If z-indices are equal, fallback to lexicographical: larger ID does NOT jump, smaller ID jumps.
  const otherEdgesObj = allEdges.filter(e => {
    if (e.id === currentEdgeId) return false;
    if (e.hidden) return false; // Ignore hidden/collapsed edges
    
    const eMinZ = e.zIndex ?? 1;
    const myMinZ = myEdge?.zIndex ?? 1;
    
    if (eMinZ !== myMinZ) {
      // We want the edge on top (larger z-index) to jump.
      // So if e is below myEdge, myEdge jumps over e. Thus, e is in otherEdgesObj.
      return eMinZ < myMinZ;
    }
    
    // Equal z-index: lexicographically larger ID has priority and does NOT jump.
    // So if e.id > currentEdgeId, myEdge jumps over e. Thus, e is in otherEdgesObj.
    return e.id > currentEdgeId;
  });
  
  const otherSegs: Array<{ x1: number, y1: number, x2: number, y2: number }> = [];
  otherEdgesObj.forEach(e => {
    otherSegs.push(...getEdgeSegments(e, nodes, draggingNode));
  });
  if (otherSegs.length === 0) return pathStr;
  
  let newPathStr = `M ${mySegments[0].x1} ${mySegments[0].y1}`;
  const R = 8; // Bridge radius
  const arrowLen = 6;
  const arrowWidth = 4;
  
  mySegments.forEach(seg => {
    const intersections: Array<{ x: number, y: number, dist?: number }> = [];
    otherSegs.forEach(oSeg => {
      const pt = getLineIntersection(seg.x1, seg.y1, seg.x2, seg.y2, oSeg.x1, oSeg.y1, oSeg.x2, oSeg.y2);
      if (pt) {
        intersections.push(pt);
      }
    });
    
    if (intersections.length === 0) {
      newPathStr += ` L ${seg.x2} ${seg.y2}`;
      return;
    }
    
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < (R + arrowLen) * 2) {
      newPathStr += ` L ${seg.x2} ${seg.y2}`;
      return;
    }
    
    const ux = dx / len;
    const uy = dy / len;
    
    intersections.forEach(pt => {
      pt.dist = Math.sqrt((pt.x - seg.x1) * (pt.x - seg.x1) + (pt.y - seg.y1) * (pt.y - seg.y1));
    });
    
    intersections.sort((a, b) => (a.dist || 0) - (b.dist || 0));
    
    let lastX = seg.x1;
    let lastY = seg.y1;
    
    intersections.forEach(pt => {
      const distFromLast = Math.sqrt((pt.x - lastX) * (pt.x - lastX) + (pt.y - lastY) * (pt.y - lastY));
      const distFromEnd = Math.sqrt((seg.x2 - pt.x) * (seg.x2 - pt.x) + (seg.y2 - pt.y) * (seg.y2 - pt.y));
      
      if (distFromLast >= R + arrowLen && distFromEnd >= R) {
        const startX = pt.x - ux * R;
        const startY = pt.y - uy * R;
        const endX = pt.x + ux * R;
        const endY = pt.y + uy * R;
        
        // Tip of the arrow is 3 pixels before the start of the bridge
        const tipX = startX - ux * 3;
        const tipY = startY - uy * 3;
        
        const wing1X = tipX - ux * arrowLen - uy * arrowWidth;
        const wing1Y = tipY - uy * arrowLen + ux * arrowWidth;
        
        const wing2X = tipX - ux * arrowLen + uy * arrowWidth;
        const wing2Y = tipY - uy * arrowLen - ux * arrowWidth;
        
        // 1. Line to start of bridge
        newPathStr += ` L ${startX} ${startY}`;
        
        // 2. Draw arrowhead
        newPathStr += ` M ${wing1X} ${wing1Y} L ${tipX} ${tipY} L ${wing2X} ${wing2Y}`;
        
        // 3. Jump back to bridge start and draw the bridge arc
        newPathStr += ` M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${endY}`;
        
        lastX = endX;
        lastY = endY;
      }
    });
    
    newPathStr += ` L ${seg.x2} ${seg.y2}`;
  });
  
  return newPathStr;
}

function getCrossoverArrows(
  edgePath: string,
  edgeId: string,
  nodes: any[],
  allEdges: any[],
  draggingNode?: any
): Array<{ path: string; key: string }> {
  const segments = getPathSegments(edgePath);
  if (segments.length === 0) return [];
  
  const myEdge = allEdges.find(e => e.id === edgeId);
  if (!myEdge) return [];
  
  // Optimization: If a node is dragging, only calculate crossover arrows for edges connected to it or in its immediate vicinity
  if (draggingNode) {
    const isEdgeConnected = myEdge.source === draggingNode.id || myEdge.target === draggingNode.id;
    
    if (!isEdgeConnected) {
      const sNode = nodes.find(n => n.id === myEdge.source);
      const tNode = nodes.find(n => n.id === myEdge.target);
      
      let isNear = false;
      if (sNode && tNode) {
        const sAbs = getNodeAbsPos(sNode, nodes);
        const tAbs = getNodeAbsPos(tNode, nodes);
        const edgeMinX = Math.min(sAbs.x, tAbs.x);
        const edgeMaxX = Math.max(sAbs.x, tAbs.x);
        const edgeMinY = Math.min(sAbs.y, tAbs.y);
        const edgeMaxY = Math.max(sAbs.y, tAbs.y);
        
        const nodeW = draggingNode.measured?.width || draggingNode.width || 250;
        const nodeH = draggingNode.measured?.height || draggingNode.height || 120;
        const nodeAbs = getNodeAbsPos(draggingNode, nodes);
        
        const padding = 350;
        const nodeMinX = nodeAbs.x - padding;
        const nodeMaxX = nodeAbs.x + nodeW + padding;
        const nodeMinY = nodeAbs.y - padding;
        const nodeMaxY = nodeAbs.y + nodeH + padding;
        
        isNear = Math.max(edgeMinX, nodeMinX) <= Math.min(edgeMaxX, nodeMaxX) &&
                 Math.max(edgeMinY, nodeMinY) <= Math.min(edgeMaxY, nodeMaxY);
      }
      
      if (!isNear) {
        return [];
      }
    }
  }
  
  const departments = nodes.filter(n => n.type === 'department');
  const arrows: Array<{ path: string; key: string }> = [];
  
  const sourceNode = nodes.find(n => n.id === myEdge.source);
  const targetNode = nodes.find(n => n.id === myEdge.target);
  const myParentIds = new Set<string>();
  if (sourceNode?.parentId) myParentIds.add(sourceNode.parentId);
  if (targetNode?.parentId) myParentIds.add(targetNode.parentId);
  
  departments.forEach(dept => {
    // Neither source nor target of the edge should belong to this department
    if (myParentIds.has(dept.id)) return;
    
    // Calculate absolute department bounds
    const absPos = getNodeAbsPos(dept, nodes);
    const w = parseFloat(dept.style?.width as string) || dept.measured?.width || dept.width || 300;
    const h = parseFloat(dept.style?.height as string) || dept.measured?.height || dept.height || 200;
    
    const left = absPos.x;
    const top = absPos.y;
    const right = left + w;
    const bottom = top + h;
    
    // Boundary segments
    const bounds = [
      { x1: left, y1: top, x2: right, y2: top, name: 'top' },
      { x1: right, y1: top, x2: right, y2: bottom, name: 'right' },
      { x1: left, y1: bottom, x2: right, y2: bottom, name: 'bottom' },
      { x1: left, y1: top, x2: left, y2: bottom, name: 'left' }
    ];
    
    // Find all intersections between our edge segments and this department's borders
    const crossings: Array<{ x: number, y: number, ux: number, uy: number, dist: number, borderName: string }> = [];
    
    let currentDist = 0;
    segments.forEach(seg => {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      
      if (segLen > 0.001) {
        const ux = dx / segLen;
        const uy = dy / segLen;
        
        bounds.forEach(b => {
          const pt = getLineIntersection(seg.x1, seg.y1, seg.x2, seg.y2, b.x1, b.y1, b.x2, b.y2);
          if (pt) {
            const distFromSegStart = Math.sqrt((pt.x - seg.x1) * (pt.x - seg.x1) + (pt.y - seg.y1) * (pt.y - seg.y1));
            crossings.push({
              x: pt.x,
              y: pt.y,
              ux,
              uy,
              dist: currentDist + distFromSegStart,
              borderName: b.name
            });
          }
        });
      }
      
      currentDist += segLen;
    });
    
    if (crossings.length >= 2) {
      // Sort crossings by distance along the path
      crossings.sort((a, b) => a.dist - b.dist);
      
      // First is entry, last is exit
      const entry = crossings[0];
      const exit = crossings[crossings.length - 1];
      
      const arrowLen = 10;
      const arrowWidth = 6;
      
      // 1. Entry Arrow (pointing towards the department border, ending exactly at the border)
      const entryTipX = entry.x;
      const entryTipY = entry.y;
      const entryBackX = entry.x - entry.ux * arrowLen;
      const entryBackY = entry.y - entry.uy * arrowLen;
      const entryW1X = entryBackX - entry.uy * arrowWidth;
      const entryW1Y = entryBackY + entry.ux * arrowWidth;
      const entryW2X = entryBackX + entry.uy * arrowWidth;
      const entryW2Y = entryBackY - entry.ux * arrowWidth;
      
      arrows.push({
        path: `M ${entryTipX} ${entryTipY} L ${entryW1X} ${entryW1Y} L ${entryW2X} ${entryW2Y} Z`,
        key: `${edgeId}-${dept.id}-entry`
      });
      
      // 2. Exit Arrow (pointing away from the department border, starting exactly at the border)
      const exitTipX = exit.x + exit.ux * arrowLen;
      const exitTipY = exit.y + exit.uy * arrowLen;
      const exitBackX = exit.x;
      const exitBackY = exit.y;
      const exitW1X = exitBackX - exit.uy * arrowWidth;
      const exitW1Y = exitBackY + exit.ux * arrowWidth;
      const exitW2X = exitBackX + exit.uy * arrowWidth;
      const exitW2Y = exitBackY - exit.ux * arrowWidth;
      
      arrows.push({
        path: `M ${exitTipX} ${exitTipY} L ${exitW1X} ${exitW1Y} L ${exitW2X} ${exitW2Y} Z`,
        key: `${edgeId}-${dept.id}-exit`
      });
    }
  });
  
  return arrows;
}
