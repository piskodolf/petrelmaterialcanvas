import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock } from 'lucide-react';

export const PendingScreen: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-dark)' }}>
      <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
        <Clock size={48} style={{ color: '#facc15' }} />
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.8rem', margin: 0 }}>Čakanje na odobritev</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
          Vaš račun je bil uspešno ustvarjen, vendar <strong>čaka na odobritev administratorja</strong>, preden lahko dostopate do aplikacije.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
          Prosimo, poskusite ponovno kasneje.
        </p>
        <button 
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(248, 113, 113, 0.2)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
        >
          <LogOut size={18} />
          Odjava
        </button>
      </div>
    </div>
  );
};
