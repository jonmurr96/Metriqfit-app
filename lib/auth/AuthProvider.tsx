import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/expo';
import {
  initializeRevenueCat,
  syncSubscriptionFromRevenueCat,
} from '../../services/subscriptionService';
import {
  addRevenueCatCustomerInfoUpdateListener,
  logoutRevenueCat,
} from '../../services/revenuecatClient';
import { queryClient } from '../queryClient';

type OAuthProvider = 'google' | 'apple';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  oauthAvailability: { google: boolean; apple: boolean };
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const oauthAvailability = {
  google: true,
  apple: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded, userId } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const loading = !authLoaded || !userLoaded;

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        user_metadata: (clerkUser.publicMetadata as Record<string, unknown>) ?? {},
      }
    : null;

  useEffect(() => {
    if (!userId) return;
    initializeRevenueCat(userId).catch((error) => {
      console.warn('[RevenueCat] Initialization skipped/failed:', error);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const removeRevenueCatListener = addRevenueCatCustomerInfoUpdateListener(() => {
      syncSubscriptionFromRevenueCat(userId)
        .catch((error) => {
          console.warn('[RevenueCat] Customer info sync failed:', error);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
        });
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId) {
        initializeRevenueCat(userId).catch((error) => {
          console.warn('[RevenueCat] Foreground entitlement refresh failed:', error);
        });
      }
    });

    return () => {
      removeRevenueCatListener();
      appStateSubscription.remove();
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    try {
      await logoutRevenueCat();
      await clerkSignOut();
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  }, [clerkSignOut]);

  // Auth screen methods are handled directly in screens via Clerk hooks.
  // These stubs satisfy the context interface for consumers that don't call them.
  const signIn = useCallback(async (_email: string, _password: string) => {
    return { error: null };
  }, []);

  const signUp = useCallback(async (_email: string, _password: string) => {
    return { error: null };
  }, []);

  const signInWithOAuth = useCallback(async (_provider: OAuthProvider) => {
    return { error: null };
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    return { error: null };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithOAuth,
    resetPassword,
    signOut,
    oauthAvailability,
    isAuthenticated: !!isSignedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
