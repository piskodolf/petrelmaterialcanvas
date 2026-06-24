import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { ref, update, get, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { auth, googleProvider, database } from '../firebase';

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
  lastLogin: number;
  status: 'pending' | 'approved';
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isMockEnabled = params.get('mockAuth') === 'true' || params.get('mock') === 'true';

    if (isMockEnabled) {
      console.log("Mock authentication enabled. Bypassing Firebase Auth.");
      setUser({
        uid: 'mock_user_123',
        displayName: 'Testni Uporabnik',
        email: 'test@materialflow.local',
        photoURL: '',
        emailVerified: true,
        isAnonymous: true,
        metadata: {},
        providerData: [],
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock_token',
        getIdTokenResult: async () => ({ token: 'mock_token', signInProvider: 'google.com', claims: {}, authTime: '123', expirationTime: '123', issuedAtTime: '123' }),
        reload: async () => {},
        toJSON: () => ({})
      } as any);
      setProfile({
        name: 'Testni Uporabnik',
        email: 'test@materialflow.local',
        photo: '',
        lastLogin: Date.now(),
        status: 'approved',
        role: 'admin'
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const profileRef = ref(database, `users/${currentUser.uid}/profile`);
        try {
          const snapshot = await get(profileRef);
          const existingProfile = snapshot.val() || {};
          
          const status = existingProfile.status || (existingProfile.lastLogin ? 'approved' : 'pending');
          const role = existingProfile.role || (existingProfile.lastLogin ? 'admin' : 'user');
          
          const updatedProfile = {
            name: currentUser.displayName || 'Neznan',
            email: currentUser.email || '',
            photo: currentUser.photoURL || '',
            lastLogin: Date.now(),
            status,
            role
          };
          
          await update(profileRef, updatedProfile);
          setProfile(updatedProfile as UserProfile);

        } catch (err) {
          console.error("Error updating user profile or presence:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
