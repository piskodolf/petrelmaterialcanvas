import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../firebase';
import { FileText, Plus, LogOut, Moon, Sun, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Document {
  id: string;
  name: string;
  updatedAt: number;
  ownerName?: string;
  ownerId?: string;
}

export const Dashboard: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');

  useEffect(() => {
    if (!user) return;
    
    // Auto-migrate old local data
    const migrateLocalData = async () => {
      const localNodes = localStorage.getItem('flow-nodes');
      const localEdges = localStorage.getItem('flow-edges');
      if (localNodes && localNodes !== '[]' && localNodes !== 'null') {
        const docId = 'legacy_local_flow_' + Date.now();
        const docRef = ref(database, `users/${user.uid}/documents/${docId}`);
        await set(docRef, {
          name: 'Stari Lokalni Proces',
          updatedAt: Date.now()
        });
        await set(ref(database, `flows/${docId}`), {
          nodes: JSON.parse(localNodes),
          edges: localEdges && localEdges !== 'null' ? JSON.parse(localEdges) : []
        });
        localStorage.removeItem('flow-nodes');
        localStorage.removeItem('flow-edges');
      }
    };
    migrateLocalData();

    // We store documents per user to keep them private
    const docsRef = ref(database, `users/${user.uid}/documents`);
    const unsubscribe = onValue(docsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const docsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        docsArray.sort((a, b) => b.updatedAt - a.updatedAt);
        setDocuments(docsArray);
      } else {
        setDocuments([]);
      }
    });

    const sharedRef = ref(database, `users/${user.uid}/shared_documents`);
    const unsubscribeShared = onValue(sharedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sharedArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        sharedArray.sort((a, b) => b.updatedAt - a.updatedAt);
        setSharedDocuments(sharedArray);
      } else {
        setSharedDocuments([]);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeShared();
    };
  }, [user]);

  const createNewDocument = async () => {
    if (!user) return;
    try {
      const newDocId = push(ref(database, 'flows')).key;
      if (newDocId) {
        await set(ref(database, `flows/${newDocId}`), {
          name: `Nov proces ${new Date().toLocaleDateString()}`,
          ownerId: user.uid,
          ownerEmail: user.email,
          ownerName: user.displayName || user.email?.split('@')[0],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          nodes: [],
          edges: []
        });
        await set(ref(database, `users/${user.uid}/documents/${newDocId}`), {
          name: `Nov proces ${new Date().toLocaleDateString()}`,
          updatedAt: Date.now()
        });
        navigate(`/flow/${newDocId}`);
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Napaka pri ustvarjanju dokumenta.');
    }
  };

  const renameDocument = async (e: React.MouseEvent, docId: string, currentName: string) => {
    e.stopPropagation();
    const newName = prompt('Vnesi novo ime procesa:', currentName);
    if (newName && newName.trim() !== '' && newName !== currentName) {
      try {
        const docRef = ref(database, `flows/${docId}/name`);
        await set(docRef, newName.trim());
        const userDocRef = ref(database, `users/${user?.uid}/documents/${docId}/name`);
        await set(userDocRef, newName.trim());
      } catch (error) {
        console.error('Error renaming document:', error);
        alert('Napaka pri preimenovanju dokumenta.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', background: 'var(--bg-dark)' }}>
      {/* Header */}
      <header className="glass-panel" style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent-primary)', padding: '8px', borderRadius: '8px', color: 'white' }}>
              <FileText size={24} />
            </div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Procesi</h1>
          </div>
          
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginLeft: '20px' }}>
            <button 
              onClick={() => setActiveTab('mine')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'mine' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'mine' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
            >
              Moji procesi
            </button>
            <button 
              onClick={() => setActiveTab('shared')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeTab === 'shared' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'shared' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
            >
              Deljeno z mano
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={toggleTheme}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={user?.photoURL || ''} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{user?.displayName}</span>
          </div>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Administracija
            </button>
          )}
          <button 
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(248, 113, 113, 0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <LogOut size={16} />
            Odjava
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Create New Card (only on 'mine' tab) */}
          {activeTab === 'mine' && (
            <div 
              onClick={createNewDocument}
              className="glass-panel"
              style={{ 
                height: '180px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                border: '2px dashed var(--accent-primary)',
                background: 'rgba(56, 189, 248, 0.05)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'}
            >
              <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '12px', borderRadius: '50%', marginBottom: '16px' }}>
                <Plus size={24} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Ustvari nov proces</span>
            </div>
          )}

          {/* Document Cards */}
          {(activeTab === 'mine' ? documents : sharedDocuments).map(doc => (
            <div 
              key={doc.id}
              onClick={() => navigate(`/flow/${doc.id}`)}
              className="glass-panel"
              style={{ 
                height: '180px', 
                padding: '24px',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                  {activeTab === 'mine' && (
                    <button 
                      onClick={(e) => renameDocument(e, doc.id, doc.name)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      title="Preimenuj"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.name}>{doc.name}</h3>
                {activeTab === 'shared' && doc.ownerName && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '4px' }}>
                    Od: {doc.ownerName}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Spremenjeno: {new Date(doc.updatedAt).toLocaleString('sl-SI')}
              </div>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
};
