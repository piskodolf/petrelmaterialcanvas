import React, { useEffect, useState } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp, remove } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';

interface ActiveUser {
  uid: string;
  name: string;
  photo: string;
  state: 'online' | 'offline';
  last_changed: number;
}

export const ActiveUsers: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const { user, profile } = useAuth();
  const { flowId } = useParams();

  useEffect(() => {
    if (!user || !profile || !flowId) return;

    // We store presence inside the specific flow so we don't hit global security rules issues
    const presenceRef = ref(database, `flows/${flowId}/presence`);
    const myPresenceRef = ref(database, `flows/${flowId}/presence/${user.uid}`);
    const connectedRef = ref(database, '.info/connected');

    // 1. Setup writing my own presence
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const con = onDisconnect(myPresenceRef);
        con.remove().then(() => {
          set(myPresenceRef, {
            state: 'online',
            last_changed: serverTimestamp(),
            name: profile.name,
            photo: profile.photo
          });
        });
      }
    });

    // 2. Setup reading all presence in this flow
    const unsubPresence = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray: ActiveUser[] = Object.keys(data).map(key => ({
          uid: key,
          ...data[key]
        }));
        
        const onlineUsers = usersArray.filter(u => u.state === 'online');
        setActiveUsers(onlineUsers);
      } else {
        setActiveUsers([]);
      }
    });

    // Cleanup when component unmounts
    return () => {
      unsubConnected();
      unsubPresence();
      // Remove myself from presence when leaving the page
      remove(myPresenceRef);
    };
  }, [user, profile, flowId]);

  if (!user || !profile) {
    return (
      <div className="active-users" style={{ padding: '6px 12px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)' }}>
        Niste prijavljeni (ni prisotnosti)
      </div>
    );
  }

  if (activeUsers.length === 0) {
    return (
      <div className="active-users" style={{ padding: '6px 12px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)' }}>
        Samo vi na tem diagramu
      </div>
    );
  }

  return (
    <div className="active-users" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
        {activeUsers.map((activeUser, index) => (
          <div 
            key={activeUser.uid} 
            title={activeUser.name + (activeUser.uid === user?.uid ? ' (Ti)' : '')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid #22c55e', // Green border for active
              marginLeft: index === 0 ? '0' : '-8px', // Overlap effect
              backgroundColor: 'var(--bg-panel)',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: activeUsers.length - index, // Ensure stacking order looks right
              position: 'relative'
            }}
          >
            {activeUser.photo ? (
              <img 
                src={activeUser.photo} 
                alt={activeUser.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'var(--bg-dark)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {activeUsers.length} {activeUsers.length === 1 ? 'aktiven' : activeUsers.length === 2 ? 'aktivna' : activeUsers.length <= 4 ? 'aktivni' : 'aktivnih'}
      </span>
    </div>
  );
};
