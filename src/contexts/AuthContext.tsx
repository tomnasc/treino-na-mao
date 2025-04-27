// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import supabase, { getCurrentUser, getCurrentSession } from '../lib/supabase';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<{ session: Session | null; error: Error | null }>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication state
    const initAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        setSession(currentSession);
        
        if (currentSession) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });

      // Se houve erro no registro, retornar
      if (error) {
        return { error };
      }

      try {
        // Obter o usuário recém-criado
        const { data: { user: newUser } } = await supabase.auth.getUser();
        
        if (newUser) {
          // Primeiro, tente criar o registro na tabela de usuários base
          try {
            // Verificar se o usuário já existe
            const { data: existingUser } = await supabase
              .from('treino_4aivzd_users')
              .select('id')
              .eq('id', newUser.id)
              .maybeSingle();
              
            // Se não existir, criar o usuário
            if (!existingUser) {
              try {
                // Tentar usar a função RPC
                const { error: rpcError } = await supabase.rpc('create_user_if_not_exists', {
                  user_uuid: newUser.id,
                  user_email: email,
                  user_name: fullName
                });
                
                // Se a RPC falhar, tente inserção direta
                if (rpcError) {
                  console.error('RPC Error:', rpcError);
                  
                  const { error: insertError } = await supabase
                    .from('treino_4aivzd_users')
                    .insert([{
                      id: newUser.id,
                      email: email,
                      full_name: fullName,
                      role: 'free',
                      status: 'active',
                      created_at: new Date().toISOString()
                    }]);
                    
                  if (insertError) {
                    console.error('Error creating user record:', insertError);
                    // Continuar mesmo com erro para tentar criar o perfil
                  }
                }
              } catch (userCreationError) {
                console.error('Error in user creation process:', userCreationError);
                // Continuar para tentar criar o perfil
              }
            }
          } catch (userCheckError) {
            console.error('Error checking user existence:', userCheckError);
            // Continuar para tentar criar o perfil
          }

          // Depois, verifique se já existe um perfil para este usuário
          try {
            const { data: existingProfile } = await supabase
              .from('treino_4aivzd_user_profiles')
              .select('*')
              .eq('user_id', newUser.id)
              .maybeSingle();
            
            // Se não existir perfil, criar um novo
            if (!existingProfile) {
              const { error: profileError } = await supabase
                .from('treino_4aivzd_user_profiles')
                .insert([{
                  user_id: newUser.id,
                  bio: '',
                  fitness_level: 'beginner',
                  training_goals: [],
                  preferred_training_days: [],
                  equipment_access: []
                }]);
              
              if (profileError) {
                console.error('Erro ao criar perfil de usuário:', profileError);
              }
            }
          } catch (profileError) {
            console.error('Erro ao verificar/criar perfil:', profileError);
          }
        }
      } catch (setupError) {
        console.error('Erro ao configurar perfil de usuário:', setupError);
        // Não retornamos o erro aqui para não impedir o login do usuário
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as Error };
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return { session: null, error };
      }

      // Atualizar os estados com a nova sessão e usuário
      setSession(data.session);
      setUser(data.user);
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { session: null, error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
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