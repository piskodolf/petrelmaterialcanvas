import React, { useState } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { AlertTriangle, Trash2, Plus, X } from 'lucide-react';
import './IssuesModal.css';

interface Issue {
  id: string;
  type: 'izziv' | 'odpadek';
  text: string;
}

interface IssuesModalProps {
  nodeId: string;
  onClose: () => void;
}

export const IssuesModal: React.FC<IssuesModalProps> = ({ nodeId, onClose }) => {
  const { getNodes, setNodes } = useReactFlow();
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'izziv' | 'odpadek'>('izziv');

  const node = getNodes().find(n => n.id === nodeId);
  if (!node) return null;

  const issues: Issue[] = (node.data.issues as Issue[]) || [];

  const addIssue = () => {
    if (!newText.trim()) return;
    const newIssue: Issue = {
      id: Math.random().toString(36).substring(7),
      type: newType,
      text: newText.trim()
    };
    
    setNodes(nodes => nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            issues: [...((n.data.issues as Issue[]) || []), newIssue]
          }
        };
      }
      return n;
    }));
    setNewText('');
  };

  const removeIssue = (id: string) => {
    setNodes(nodes => nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            issues: issues.filter(i => i.id !== id)
          }
        };
      }
      return n;
    }));
  };

  return (
    <div className="issues-modal-overlay" onClick={onClose}>
      <div className="issues-modal-content" onClick={e => e.stopPropagation()}>
        <div className="issues-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-warning)' }} />
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Izzivi in odpadki: {node.data.label as string || 'Neimenovan element'}
            </h2>
          </div>
          <button onClick={onClose} className="issues-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="issues-add-container">
          <select 
            value={newType} 
            onChange={e => setNewType(e.target.value as 'izziv' | 'odpadek')}
            className="issues-type-select"
          >
            <option value="izziv">Izziv</option>
            <option value="odpadek">Odpadek</option>
          </select>
          <input 
            type="text" 
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addIssue(); }}
            placeholder="Opis težave ali odpadka..."
            className="issues-text-input"
          />
          <button onClick={addIssue} className="issues-add-btn">
            <Plus size={16} /> Dodaj
          </button>
        </div>

        <div className="issues-list">
          {issues.length === 0 ? (
            <div className="issues-empty">Ni vnesenih izzivov ali odpadkov.</div>
          ) : (
            issues.map(issue => (
              <div key={issue.id} className={`issue-item issue-item-${issue.type}`}>
                <div className="issue-type-badge">
                  {issue.type === 'izziv' ? 'Izziv' : 'Odpadek'}
                </div>
                <div className="issue-text">{issue.text}</div>
                <button onClick={() => removeIssue(issue.id)} className="issue-delete-btn" title="Izbriši">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
