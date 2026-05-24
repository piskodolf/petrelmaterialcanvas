import { memo } from 'react';
import { NodeResizer, useReactFlow, Handle, Position, type NodeProps } from '@xyflow/react';
import { Building2, Trash2, Edit2, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { useMaterials } from '../contexts/MaterialContext';
import './nodes.css';

export const DepartmentNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, getNodes } = useReactFlow();
  const { activeFilter } = useMaterials();
  const isCollapsed = !!data.isCollapsed;

  const hasMaterialInChildren = () => {
    if (!activeFilter) return true;
    const children = getNodes().filter(n => n.parentId === id);
    if (children.length === 0) return false;
    
    return children.some(child => {
      const before = Array.isArray(child.data.materialsBefore) ? child.data.materialsBefore : [];
      const after = Array.isArray(child.data.materialsAfter) ? child.data.materialsAfter : [];
      return before.includes(activeFilter) || after.includes(activeFilter);
    });
  };

  const isFilteredOut = activeFilter && !hasMaterialInChildren();

  const updateData = (key: string, value: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, [key]: value } };
      }
      return n;
    }));
  };

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id && n.parentId !== id));
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateData('isCollapsed', !isCollapsed);
  };

  return (
    <>
      <Handle type="target" position={Position.Left} id="dep-target" style={{ opacity: 0, pointerEvents: 'none' }} />
      {!isCollapsed && (
        <NodeResizer 
          color="#38bdf8" 
          isVisible={selected} 
          minWidth={300} 
          minHeight={150} 
        />
      )}
      <div className="custom-drag-handle" title="Primi tukaj za premik oddelka" style={{ 
        position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', 
        cursor: 'grab', display: 'flex', alignItems: 'center', 
        background: 'var(--bg-dark)', padding: '2px 24px', borderRadius: '6px 6px 0 0', 
        border: '1px solid var(--border-subtle)', borderBottom: 'none', color: 'var(--text-muted)',
        zIndex: 10
      }}>
        <GripHorizontal size={18} />
      </div>

      <div 
        className={`department-node ${isFilteredOut ? 'filtered-out' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        style={{
          pointerEvents: 'none',
          ...(isCollapsed ? { height: 'auto', minHeight: 'auto', width: 'auto', minWidth: '300px' } : {})
        }}
      >
        <div className="department-header nodrag" style={{ pointerEvents: 'all' }}>
          <button 
            className="collapse-btn nodrag" 
            onClick={toggleCollapse} 
            title={isCollapsed ? "Razpri subproces" : "Zloži subproces"}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <Building2 size={20} className="department-icon" />
          <div style={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <input 
              className="node-input department-title-input nodrag"
              defaultValue={data.label as string || ''}
              onBlur={(e) => updateData('label', e.target.value)}
              placeholder="Ime skupine / subprocesa"
            />
            <Edit2 size={12} className="edit-indicator" />
          </div>
          <button className="delete-btn" onClick={onDelete} title="Odstrani skupino">
            <Trash2 size={16} />
          </button>
        </div>
        {!isCollapsed && (
          <div className="department-content">
            {/* Processes will be dragged here as child nodes */}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="dep-source" style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  );
});
