import React, { useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useMaterials } from '../contexts/MaterialContext';
import { X, ChevronLeft, ChevronRight, Play, Factory, User, Network, FileText, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';

interface SubprocessFlowViewProps {
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

interface Issue {
  id: string;
  type: 'izziv' | 'odpadek' | 'vprasanje';
  text: string;
}

export const SubprocessFlowView: React.FC<SubprocessFlowViewProps> = ({ onClose, nodes, edges }) => {
  const { savedSubprocesses } = useMaterials();
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [startIndex, setStartIndex] = useState<number>(0);

  const selectedSubprocess = useMemo(() => {
    return savedSubprocesses.find(s => s.id === selectedSubId);
  }, [selectedSubId, savedSubprocesses]);

  // Filter and sort nodes belonging to the selected subprocess by position.x
  const sortedNodes = useMemo(() => {
    if (!selectedSubId) return [];
    return nodes
      .filter(n => n.type === 'process' && n.data?.subprocess === selectedSubId)
      .sort((a, b) => a.position.x - b.position.x);
  }, [selectedSubId, nodes]);

  // Get active slice of at most 5 elements
  const visibleNodes = useMemo(() => {
    return sortedNodes.slice(startIndex, startIndex + 5);
  }, [sortedNodes, startIndex]);

  const handleNext = () => {
    if (startIndex + 5 < sortedNodes.length) {
      setStartIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(prev => prev - 1);
    }
  };

  const handleSelectSubprocess = (id: string) => {
    setSelectedSubId(id);
    setStartIndex(0);
  };

  // Helper to find the connection between two nodes in sequence
  const getConnectionMaterial = (sourceId: string, targetId: string) => {
    const edge = edges.find(e => e.source === sourceId && e.target === targetId);
    if (!edge || !edge.data?.materialUrl) return null;
    const url = edge.data.materialUrl as string;
    return url.startsWith('text:') ? url.substring(5) : 'Slikovni material';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(11, 17, 30, 0.96)',
      backdropFilter: 'blur(16px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      color: '#f8fafc',
      padding: '30px 40px',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '8px' }}>
            <Network size={22} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Zaporedni tok subprocesa</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Pregled in stopenjsko sprehajanje skozi operacije</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Izberi subproces:</span>
          <select
            value={selectedSubId}
            onChange={(e) => handleSelectSubprocess(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 16px',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">-- Izberi subproces --</option>
            {savedSubprocesses.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          title="Zapri zaporedni pogled"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Area */}
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {!selectedSubId ? (
          // Unselected Empty State
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ margin: '0 auto 20px auto', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContext: 'center', display: 'flex', justifyContent: 'center' }}>
              <Play size={32} style={{ color: '#64748b', marginLeft: '4px' }} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#f1f5f9' }}>Začnite s sprehodom</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.4 }}>Za vizualizacijo zaporednega toka in stopenjski pregled zgoraj izberite želeni subproces.</p>
          </div>
        ) : sortedNodes.length === 0 ? (
          // Selected Subprocess Empty State
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ margin: '0 auto 20px auto', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', border: '2px dashed rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network size={32} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#f1f5f9' }}>Ni elementov</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.4 }}>V izbranem subprocesu <strong style={{ color: selectedSubprocess?.color }}>{selectedSubprocess?.name}</strong> trenutno ni nobenega procesnega elementa.</p>
          </div>
        ) : (
          // Active Sequence Slider View
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', position: 'relative', height: '100%' }}>
            
            {/* BACK BUTTON (Left Arrow) */}
            <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
              {startIndex > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="Prejšnji korak"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
            </div>

            {/* Pipeline Cards Grid */}
            <div style={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              overflow: 'hidden',
              padding: '20px 0'
            }}>
              {visibleNodes.map((node, index) => {
                const globalIndex = startIndex + index;
                const label = node.data?.label as string || 'Neimenovan proces';
                const equipment = node.data?.equipment as string || '/';
                const performer = node.data?.performer as string || '/';
                const desc = node.data?.description as string || '';
                
                const issues = (node.data?.issues as Issue[]) || [];
                const challengeCount = issues.filter(i => i.type !== 'vprasanje').length;
                const questionCount = issues.filter(i => i.type === 'vprasanje').length;

                const isLastInSlice = index === visibleNodes.length - 1;
                const nextNodeGlobal = sortedNodes[globalIndex + 1];
                const connMaterial = nextNodeGlobal ? getConnectionMaterial(node.id, nextNodeGlobal.id) : null;

                return (
                  <React.Fragment key={node.id}>
                    {/* Element Card */}
                    <div style={{
                      width: '230px',
                      minHeight: '340px',
                      height: '380px',
                      background: 'rgba(30, 41, 59, 0.45)',
                      border: `1px solid ${selectedSubprocess ? selectedSubprocess.color + '30' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderTop: `4px solid ${selectedSubprocess?.color || 'var(--accent-primary)'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}>
                      {/* Step index badge */}
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: selectedSubprocess?.color || '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Korak {globalIndex + 1}
                      </span>

                      {/* Process Title */}
                      <h4 style={{ margin: '8px 0 12px 0', fontSize: '1.15rem', fontWeight: 700, color: '#fff', lineHeight: '1.25' }}>
                        {label}
                      </h4>

                      {/* Meta Stack */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <Factory size={13} style={{ color: '#94a3b8' }} />
                          <span style={{ color: '#cbd5e1' }}>{equipment}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <User size={13} style={{ color: '#94a3b8' }} />
                          <span style={{ color: '#cbd5e1' }}>{performer}</span>
                        </div>

                        {/* Description snippet */}
                        {desc && (
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: '#94a3b8', 
                            lineHeight: 1.35, 
                            borderTop: '1px solid rgba(255,255,255,0.06)', 
                            paddingTop: '8px', 
                            marginTop: '4px',
                            maxHeight: '80px',
                            overflowY: 'auto'
                          }}>
                            {desc}
                          </div>
                        )}
                      </div>

                      {/* Footer Badges */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        {challengeCount > 0 && (
                          <span 
                            style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title={`${challengeCount} izzivov/odpadkov`}
                          >
                            <AlertTriangle size={11} /> {challengeCount}
                          </span>
                        )}
                        {questionCount > 0 && (
                          <span 
                            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title={`${questionCount} odprtih vprašanj`}
                          >
                            <HelpCircle size={11} /> {questionCount}
                          </span>
                        )}
                        {challengeCount === 0 && questionCount === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Brez odprtih težav</span>
                        )}
                      </div>
                    </div>

                    {/* Arrow Connection between cards */}
                    {!isLastInSlice && nextNodeGlobal && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '40px' }}>
                        <ArrowRight size={20} style={{ color: selectedSubprocess?.color || 'rgba(255, 255, 255, 0.15)' }} />
                        {connMaterial && (
                          <span style={{ 
                            fontSize: '0.68rem', 
                            color: '#94a3b8', 
                            background: '#1e293b', 
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '1px 5px', 
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            maxWidth: '70px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={connMaterial}>
                            {connMaterial}
                          </span>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* NEXT BUTTON (Right Arrow / Ezhod iz zaslona) */}
            <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
              {startIndex + 5 < sortedNodes.length && (
                <button
                  onClick={handleNext}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#fff',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="Naslednji korak"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Footer Bar */}
      {selectedSubId && sortedNodes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Prikazano: <strong style={{ color: '#fff' }}>{startIndex + 1} - {Math.min(startIndex + 5, sortedNodes.length)}</strong> od <strong style={{ color: '#fff' }}>{sortedNodes.length}</strong> korakov subprocesa
          </div>
          <div style={{ width: '300px', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: `${((startIndex + Math.min(5, sortedNodes.length)) / sortedNodes.length) * 100}%`,
              height: '100%',
              background: selectedSubprocess?.color || '#3b82f6',
              transition: 'width 0.2s ease'
            }} />
          </div>
        </div>
      )}
    </div>
  );
};
