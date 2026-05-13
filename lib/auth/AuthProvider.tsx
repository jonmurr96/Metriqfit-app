import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../supabase';
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

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  oauthAvailability: {
    google: boolean;
    apple: boolean;
  };
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseBooleanEnv = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const oauthAvailability = {
  google: parseBooleanEnv(process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED, true),
  apple: parseBooleanEnv(process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED, false),
};

const makeAuthError = (message: string, status = 500): AuthError =>
  ({
    message,
    status,
    name: 'AuthError',
  }) as AuthError;

const isRecoverableSignUpError = (error: { message?: string; status?: number } | null | undefined): boolean => {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';

  return (
    error.status === 500 ||
    message.includes('database error saving new user') ||
    message.includes('unexpected_failure')
  );
};

const getAuthRedirectUrl = (path: string): string | undefined => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined;
  }
  return Linking.createURL(path);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') {
      return;
    }

    supabase.auth.startAutoRefresh();

    return () => {
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    // If Supabase is not configured, skip auth initialization
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        console.log('👤 ACTIVE USER ID:', session?.user?.id, 'EMAIL:', session?.user?.email);
        console.log('📝 USER METADATA:', JSON.stringify(session?.user?.user_metadata, null, 2));

        if (session?.user?.id) {
          initializeRevenueCat(session.user.id).catch((error) => {
            console.warn('[RevenueCat] Initialization skipped/failed:', error);
          });
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (
        session?.user?.id &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')
      ) {
        initializeRevenueCat(session.user.id).catch((error) => {
          console.warn('[RevenueCat] Initialization skipped/failed:', error);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const removeRevenueCatListener = addRevenueCatCustomerInfoUpdateListener(() => {
      syncSubscriptionFromRevenueCat(user.id)
        .catch((error) => {
          console.warn('[RevenueCat] Customer info sync failed:', error);
        })
        .finally(() => {
          queryClient.invalidateQueries({
            queryKey: ['subscription'],
          });
        });
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (Platform.OS !== 'web') {
          supabase.auth.startAutoRefresh();
          supabase.auth.getSession().catch((error) => {
            console.warn('[Auth] Session refresh check failed:', error);
          });
        }
        initializeRevenueCat(user.id).catch((error) => {
          console.warn('[RevenueCat] Foreground entitlement refresh failed:', error);
        });
      } else if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      removeRevenueCatListener();
      appStateSubscription.remove();
    };
  }, [user?.id]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: makeAuthError('Authentication is not configured. Please set up your Supabase credentials in the .env file.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!error || !isRecoverableSignUpError(error)) {
        return { data, error };
      }

      console.warn('[Auth] Supabase signUp failed with a recoverable backend error', {
        email,
        status: error.status,
        message: error.message,
      });

      return {
        data: null,
        error: makeAuthError('Account creation is temporarily unavailable. Please try again in a moment.', error.status || 500),
      };
    } catch (err: any) {
      if (isRecoverableSignUpError(err)) {
        console.warn('[Auth] Supabase signUp threw a recoverable backend error', {
          email,
          status: err?.status,
          message: err?.message,
        });

        return {
          data: null,
          error: makeAuthError('Account creation is temporarily unavailable. Please try again in a moment.', err?.status || 500),
        };
      }

      return {
        data: null,
        error: makeAuthError(err.message || 'Failed to sign up'),
      };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: makeAuthError('Authentication is not configured. Please set up your Supabase credentials in the .env file.'),
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err: any) {
      return {
        error: makeAuthError(err.message || 'Failed to sign in'),
      };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (!isSupabaseConfigured) {
      return {
        error: makeAuthError('Authentication is not configured. Please set up your Supabase credentials in the .env file.'),
      };
    }

    if (!oauthAvailability[provider]) {
      return {
        error: makeAuthError(
          provider === 'apple'
            ? 'Apple sign in is coming soon.'
            : 'This OAuth provider is currently unavailable.',
          400
        ),
      };
    }

    try {
      const redirectTo = getAuthRedirectUrl('/');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      });
      return { error };
    } catch (err: any) {
      return {
        error: makeAuthError(err.message || `Failed to sign in with ${provider}`),
      };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: makeAuthError('Authentication is not configured. Please set up your Supabase credentials in the .env file.'),
      };
    }

    if (!email) {
      return {
        error: makeAuthError('Email is required to reset your password.', 400),
      };
    }

    try {
      const redirectTo = getAuthRedirectUrl('/sign-in');
      const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      return { error };
    } catch (err: any) {
      return {
        error: makeAuthError(err.message || 'Failed to send password reset email'),
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.warn('Cannot sign out: Authentication is not configured');
      return;
    }

    try {
      await logoutRevenueCat();
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  }, []);

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    resetPassword,
    signOut,
    oauthAvailability,
    isAuthenticated: !!session,
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
