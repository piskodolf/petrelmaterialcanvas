import React, { useMemo } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { AlertTriangle, X, Target, Trash2 } from 'lucide-react';
import './IssuesModal.css';

interface Issue {
  id: string;
  type: 'izziv' | 'odpadek';
  text: string;
}

interface IssuesOverviewModalProps {
  onClose: () => void;
}

export const IssuesOverviewModal: React.FC<IssuesOverviewModalProps> = ({ onClose }) => {
  const { getNodes } = useReactFlow();

  const nodesWithIssues = useMemo(() => {
    return getNodes().filter(n => {
      const issues = n.data.issues as Issue[] | undefined;
      return issues && issues.length > 0;
    });
  }, [getNodes]);

  return (
    <div className="issues-modal-overlay" onClick={onClose}>
      <div className="issues-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="issues-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Skupni pregled izzivov in odpadkov
            </h2>
          </div>
          <button onClick={onClose} className="issues-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="issues-list" style={{ padding: '20px' }}>
          {nodesWithIssues.length === 0 ? (
            <div className="issues-empty">Na platnu ni zabeleženih izzivov ali odpadkov.</div>
          ) : (
            nodesWithIssues.map(node => {
              const issues = node.data.issues as Issue[];
              const label = node.data.label as string || 'Neimenovan element';
              const type = node.type === 'process' ? 'Proces' : node.type === 'storage' ? 'Skladišče' : 'Oddelek';
              
              return (
                <div key={node.id} style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '8px' }}>[{type}]</span>
                    {label}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                    {issues.map(issue => (
                      <div key={issue.id} className={`issue-item issue-item-${issue.type}`} style={{ padding: '8px 12px' }}>
                        <div className="issue-type-badge">
                          {issue.type === 'izziv' ? 'Izziv' : 'Odpadek'}
                        </div>
                        <div className="issue-text">{issue.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
