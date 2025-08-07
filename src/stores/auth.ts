import { defineStore } from 'pinia';
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null as Session | null,
    user: null as User | null,
    loading: true,
  }),
  actions: {
    async fetchSession() {
      this.loading = true;
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
        this.session = null;
        this.user = null;
      } else {
        this.session = session;
        this.user = session?.user || null;
      }
      this.loading = false;
    },
    async signInWithPassword(email: string, password: string) {
      this.loading = true;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        this.session = null;
        this.user = null;
        throw error;
      } else {
        this.session = data.session;
        this.user = data.user;
        return data;
      }
    },
    async signUp(email: string, password: string) {
      this.loading = true;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        this.session = null;
        this.user = null;
        throw error;
      } else {
        this.session = data.session;
        this.user = data.user;
        return data;
      }
    },
    async signOut() {
      this.loading = true;
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        throw error;
      } else {
        this.session = null;
        this.user = null;
      }
      this.loading = false;
    },
  },
});

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  const authStore = useAuthStore();
  authStore.session = session;
  authStore.user = session?.user || null;
  authStore.loading = false;
});