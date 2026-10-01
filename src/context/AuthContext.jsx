// src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const prof = await profileService.getProfile(userId);
      setProfile(prof);
      return prof;
    } catch (err) {
      console.warn('[AuthContext] Could not load profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isConfigured) {
          // Supabase keys not set yet; stop loading so fallback/config instructions can show
          setLoading(false);
          return;
        }

        const initialSession = await authService.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          if (initialSession?.user) {
            await loadUserProfile(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error initializing session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    let subscription = null;
    if (isConfigured) {
      subscription = authService.onAuthStateChange(async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          await loadUserProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
    }

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [isConfigured, loadUserProfile]);

  const signIn = async ({ email, password }) => {
    const data = await authService.signIn({ email, password });
    return data;
  };

  const signUp = async ({ email, password, displayName }) => {
    const data = await authService.signUp({ email, password, displayName });
    return data;
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    const updated = await profileService.updateProfile(user.id, updates);
    setProfile(updated);
    return updated;
  };

  const refreshProfile = async () => {
    if (user) {
      return await loadUserProfile(user.id);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isConfigured,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
