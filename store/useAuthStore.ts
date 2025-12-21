// store/useAuthStore.ts
'use client'

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import { AppUser } from '@/types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  setUser: (u: AppUser | null) => void;
  fetchUser: (silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u }),
  fetchUser: async (silent = false) => {
    try {
      if (!silent) set({ loading: true });

      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        set({ user: null, loading: false });
        return;
      }

      // Updated to 'profiles' as per standard architecture
      const { data: appUser, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (dbError || !appUser) {
        set({ user: null, loading: false });
      } else {
        set({ user: appUser as AppUser, loading: false });
      }
    } catch (e) {
      set({ user: null, loading: false });
    }
  },
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null });
  }
}), { name: 'tiempospro_auth_v4' }));