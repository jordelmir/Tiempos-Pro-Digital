import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  setUser: (u: AppUser | null) => void;
  fetchUser: (silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (u) => set({ user: u }),
      fetchUser: async (silent = false) => {
        try {
          if (!silent) set({ loading: true });

          const { data: authData, error: authError } = await supabase.auth.getUser();

          if (authError || !authData?.user) {
            set({ user: null, loading: false });
            return;
          }

          // Fetch the app_user profile based on the auth_uid
          const { data: appUser, error: dbError } = await supabase
            .from('app_users')
            .select('*')
            .eq('auth_uid', authData.user.id)
            .single();

          if (dbError || !appUser) {
            console.error(
              'Profile not found for auth user:',
              JSON.stringify(dbError || { message: 'No profile found' }, null, 2)
            );
            set({ user: null, loading: false });
          } else {
            set({ user: appUser as AppUser, loading: false });
          }
        } catch (e) {
          console.error('Auth Exception:', e);
          set({ user: null, loading: false });
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    { name: 'tiempospro_auth_v3' }
  )
);
