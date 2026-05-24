import { memo, useState } from 'react';
import { 
  getBezierPath, 
  getSmoothStepPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  type EdgeProps
} from '@xyflow/react';
import { Truck, Box, Trash2, Zap, Package, User, Activity, ArrowRight, Settings, FileText } from 'lucide-react';
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
  const { deleteElements, setEdges } = useReactFlow();
  const { 
    library, addMaterialToLibrary, removeMaterialFromLibrary, activeFilter,
    savedPerformers, addPerformer, savedTools, addTool 
  } = useMaterials();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isFilteredOut = activeFilter && data?.materialUrl !== activeFilter;
  const connectionType = data?.connectionType as string || 'flow';
  const isMovement = connectionType === 'movement';

  const updateData = (key: string, value: any) => {
    setEdges((eds) => eds.map((e) => {
      if (e.id === id) {
        if (key === 'connectionType') {
          return { 
            ...e, 
            data: { ...e.data, [key]: value },
            markerEnd: typeof e.markerEnd === 'object' ? { ...e.markerEnd, color: value === 'movement' ? '#3b82f6' : '#94a3b8' } : e.markerEnd
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
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ALI:</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
              <input 
                id={`text-material-input-edge-${id}`}
                type="text" 
                placeholder="Ime (brez slike)" 
                style={{ flexGrow: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', color: 'var(--text-main)', minWidth: '0' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const textUrl = `text:${e.currentTarget.value.trim()}`;
                    addMaterialToLibrary(textUrl);
                    updateData('materialUrl', textUrl);
                    setPickerOpen(false);
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById(`text-material-input-edge-${id}`) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const textUrl = `text:${input.value.trim()}`;
                    addMaterialToLibrary(textUrl);
                    updateData('materialUrl', textUrl);
                    setPickerOpen(false);
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
                <div key={i} className="picker-item" onClick={() => { updateData('materialUrl', item.url); setPickerOpen(false); }}>
                  {item.url.startsWith('text:') ? (
                    <div style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', width: '100%', wordBreak: 'break-word', lineHeight: 1.1 }}>
                      {item.url.substring(5)}
                    </div>
                  ) : (
                    <img src={item.url} alt="History" className="picker-image" />
                  )}
                  <button className="picker-item-delete" onClick={(e) => { e.stopPropagation(); removeMaterialFromLibrary(item.url); }} title="Izbriši iz knjižnice">
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
  const pathType = data?.pathType as string || 'bezier';
  const pathParams = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  
  let edgePath, labelX, labelY;
  if (pathType === 'smoothstep') {
    const borderRadius = data?.borderRadius ? Number(data.borderRadius) : 16;
    [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius });
  } else if (pathType === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath(pathParams);
  } else {
    [edgePath, labelX, labelY] = getBezierPath(pathParams);
  }

  const edgeColor = isFilteredOut ? '#334155' : (isMovement ? '#3b82f6' : '#94a3b8');

  return (
    <g className={isFilteredOut ? 'filtered-out' : ''}>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: isFilteredOut ? 1 : (isMovement ? 4 : 3), stroke: edgeColor }} />
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
                  className="edge-input" 
                  value={connectionType}
                  onChange={(e) => updateData('connectionType', e.target.value)}
                  onPointerDown={onPointerDown}
                  style={{ width: 'auto', paddingRight: '0px' }}
                >
                  <option value="flow">Naslednja aktivnost</option>
                  <option value="movement">Premik</option>
                </select>
              </div>
              <div className="movement-row" title="Oblika črte">
                <Settings size={12} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
                <select 
                  className="edge-input" 
                  value={pathType}
                  onChange={(e) => updateData('pathType', e.target.value)}
                  onPointerDown={onPointerDown}
                  style={{ width: 'auto', paddingRight: '0px' }}
                >
                  <option value="bezier">Krivulja</option>
                  <option value="smoothstep">Pravokotna</option>
                  <option value="straight">Ravna</option>
                </select>
              </div>
              <div className="movement-row" title="Orodje za premik" style={{ display: isMovement ? 'flex' : 'none' }}>
                <Truck size={12} className="movement-icon" />
                <input 
                  className="edge-input"
                  list={`tools-list-${id}`}
                  value={data?.tool as string || ''}
                  onChange={(e) => updateData('tool', e.target.value)}
                  onBlur={(e) => { if (e.target.value) addTool(e.target.value); }}
                  placeholder="Viličar"
                  onPointerDown={onPointerDown}
                />
                <datalist id={`tools-list-${id}`}>
                  {savedTools.map(t => <option key={t} value={t} />)}
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
              <div className="movement-row" title="Kdo izvaja" style={{ display: isMovement ? 'flex' : 'none' }}>
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
            </div>
            
            <div className="movement-summary" title={data?.description as string || undefined}>
              {isMovement ? (
                <Truck size={14} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ArrowRight size={14} className="movement-icon" style={{ color: 'var(--text-muted)' }} />
              )}
              {Boolean(data?.materialUrl) && (
                (data!.materialUrl as string).startsWith('text:') ? (
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-node)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1, padding: '1px', color: 'var(--text-main)', overflow: 'hidden' }}>
                    {(data!.materialUrl as string).substring(5)}
                  </div>
                ) : (
                  <img src={data?.materialUrl as string} alt="Material" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                )
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
