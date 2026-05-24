import React, { useEffect, useState } from 'react';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { database } from '../firebase';
import { X, Check, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ShareModalProps {
  flowId: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ flowId, onClose }) => {
  const { user } = useAuth();
  const [docName, setDocName] = useState<string>('');
  const [usersList, setUsersList] = useState<{uid: string, name: string, email: string}[]>([]);
  const [sharedWith, setSharedWith] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    // Fetch document name and current sharing status
    const docRef = ref(database, `users/${user.uid}/documents/${flowId}`);
    get(docRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDocName(data.name || 'Neznan proces');
        setSharedWith(data.sharedWith || {});
      }
    });

    // Fetch all approved users (except self)
    const usersRef = ref(database, 'users');
    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const uList = Object.keys(data)
          .filter(uid => uid !== user.uid && data[uid].profile?.status === 'approved')
          .map(uid => ({
            uid,
            name: data[uid].profile.name,
            email: data[uid].profile.email
          }));
        setUsersList(uList);
      }
    });
  }, [user, flowId]);

  const toggleShare = async (targetUid: string) => {
    if (!user) return;
    const isShared = sharedWith[targetUid];
    
    try {
      if (isShared) {
        // Remove share
        await remove(ref(database, `users/${targetUid}/shared_documents/${flowId}`));
        await remove(ref(database, `users/${user.uid}/documents/${flowId}/sharedWith/${targetUid}`));
        setSharedWith(prev => {
          const next = { ...prev };
          delete next[targetUid];
          return next;
        });
      } else {
        // Add share
        await set(ref(database, `users/${targetUid}/shared_documents/${flowId}`), {
          ownerId: user.uid,
          ownerName: user.displayName,
          name: docName,
          updatedAt: Date.now()
        });
        await set(ref(database, `users/${user.uid}/documents/${flowId}/sharedWith/${targetUid}`), true);
        setSharedWith(prev => ({ ...prev, [targetUid]: true }));
      }
    } catch (err) {
      console.error(err);
      alert('Prišlo je do napake pri deljenju.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ width: '400px', maxWidth: '90%', padding: '24px', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <Users size={20} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Deli z drugimi</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Kdo ima dostop do <strong>{docName}</strong>? (Izbrani bodo imeli pravico urejanja)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
          {usersList.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Ni drugih odobrenih uporabnikov.</div>
          ) : (
            usersList.map(u => (
              <div key={u.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{u.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
                </div>
                <button 
                  onClick={() => toggleShare(u.uid)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: sharedWith[u.uid] ? 'var(--accent-primary)' : 'transparent',
                    color: sharedWith[u.uid] ? 'white' : 'var(--text-main)',
                    border: `1px solid ${sharedWith[u.uid] ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    padding: '6px 12px', borderRadius: '20px', cursor: 'pointer'
                  }}
                >
                  {sharedWith[u.uid] && <Check size={14} />}
                  {sharedWith[u.uid] ? 'Dostop' : 'Deli'}
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
