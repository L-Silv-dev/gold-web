import React, { createContext, useContext, useState, useEffect } from 'react';
import themes from '../utils/theme';
import CacheManager from '../utils/cache';
import { supabase } from '../utils/supabase';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [selectedMode, setSelectedMode] = useState('claro');
  const theme = themes[selectedMode] || themes.claro;

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_mode')
            .eq('id', user.id)
            .single();
          if (!error && data?.theme_mode) {
            setSelectedMode(data.theme_mode);
            return;
          }
        }
        const savedTheme = await CacheManager.loadTheme();
        if (savedTheme) setSelectedMode(savedTheme);
      } catch {}
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_mode')
            .eq('id', session.user.id)
            .single();
          if (!error && data?.theme_mode) {
            setSelectedMode(data.theme_mode);
          }
        } else {
          const savedTheme = await CacheManager.loadTheme();
          if (savedTheme) setSelectedMode(savedTheme);
        }
      } catch {}
    });
    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const persist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('profiles').update({ theme_mode: selectedMode }).eq('id', user.id);
        } else {
          CacheManager.saveTheme(selectedMode);
        }
      } catch {
        CacheManager.saveTheme(selectedMode);
      }
    };
    persist();
  }, [selectedMode]);

  return (
    <ThemeContext.Provider value={{ theme, selectedMode, setSelectedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
} 
