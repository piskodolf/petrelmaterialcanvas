import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { Users, ArrowLeft, Trash2, FileText } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  photo: string;
  lastLogin: number;
  status: 'pending' | 'approved';
  role?: string;
}

interface UserData {
  uid: string;
  profile?: UserProfile;
  documentCount: number;
  documents: { [key: string]: any };
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // V resnični aplikaciji bi tu preverili ali ima user role === 'admin'
    // Ker tega še nimamo, dovolimo vsem (za demo namene).
    if (!user) return;

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const uList: UserData[] = Object.keys(data).map(uid => {
          const userData = data[uid];
          const docs = userData.documents || {};
          return {
            uid,
            profile: userData.profile,
            documentCount: Object.keys(docs).length,
            documents: docs
          };
        });
        // Sort by last login (descending)
        uList.sort((a, b) => (b.profile?.lastLogin || 0) - (a.profile?.lastLogin || 0));
        setUsersList(uList);
      } else {
        setUsersList([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleUserStatus = async (targetUid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
      await update(ref(database, `users/${targetUid}/profile`), { status: newStatus });
    } catch (err) {
      console.error(err);
      alert('Napaka pri posodabljanju statusa.');
    }
  };

  const toggleUserRole = async (targetUid: string, currentRole: string) => {
    if (targetUid === user?.uid) {
      alert('Ne morete spremeniti lastne vloge!');
      return;
    }
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await update(ref(database, `users/${targetUid}/profile`), { role: newRole });
    } catch (err) {
      console.error(err);
      alert('Napaka pri posodabljanju vloge.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', background: 'var(--bg-dark)' }}>
      <header className="glass-panel" style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <button 
          onClick={() => navigate('/')}
          className="glass-panel" 
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px' }}
        >
          <ArrowLeft size={16} />
          Nazaj
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-primary)' }}>
          <Users size={24} />
          <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Administracija uporabnikov</h1>
        </div>
      </header>

      <main style={{ padding: '40px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ color: 'var(--text-main)' }}>Nalaganje...</div>
        ) : (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Uporabnik</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>E-mail</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Zadnja prijava</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Vloga</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Št. procesov</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'right' }}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {u.profile?.photo ? (
                          <img src={u.profile.photo} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {u.profile?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                          {u.profile?.name || 'Neznan uporabnik'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-main)' }}>{u.profile?.email || '-'}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                      {u.profile?.lastLogin ? new Date(u.profile.lastLogin).toLocaleString('sl-SI') : 'Nikoli'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        background: u.profile?.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: u.profile?.status === 'approved' ? '#4ade80' : '#facc15'
                      }}>
                        {u.profile?.status === 'approved' ? 'Odobren' : 'Čaka'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        background: u.profile?.role === 'admin' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: u.profile?.role === 'admin' ? '#c084fc' : 'var(--text-muted)'
                      }}>
                        {u.profile?.role === 'admin' ? 'Admin' : 'Uporabnik'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                        {u.documentCount}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => toggleUserRole(u.uid, u.profile?.role || 'user')}
                          style={{ 
                            background: 'transparent', 
                            color: 'var(--text-muted)', 
                            border: '1px solid var(--border-subtle)', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer'
                          }}
                        >
                          {u.profile?.role === 'admin' ? 'Odvzemi Admin' : 'Naredi Admin'}
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(u.uid, u.profile?.status || 'pending')}
                          style={{ 
                            background: u.profile?.status === 'approved' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                            color: u.profile?.status === 'approved' ? 'var(--accent-danger)' : '#4ade80', 
                            border: `1px solid ${u.profile?.status === 'approved' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`, 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px' 
                          }}
                        >
                          {u.profile?.status === 'approved' ? 'Prekliči dostop' : 'Odobri dostop'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usersList.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Ni registriranih uporabnikov.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
