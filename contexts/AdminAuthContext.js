import React, { createContext, useContext, useState, useEffect } from 'react';
import CacheManager from '../utils/cache';
import { supabase } from '../utils/supabase';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false); // Global admin state
  const [adminUser, setAdminUser] = useState(null); // Logged in admin user data

  // Carregar status de admin do cache ao iniciar
  useEffect(() => {
    const loadAdminStatus = async () => {
      try {
        const adminStatus = await CacheManager.loadAdminStatus();
        if (adminStatus) {
           // We might want to persist the user too, but for now let's keep it simple
           // If they were admin, they stay admin? 
           // Better to require login again if session lost, but for now:
           setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.log('Erro ao verificar status admin:', error);
        setIsAdmin(false);
      }
    };

    loadAdminStatus();
  }, []);

  // Salvar status de admin no cache sempre que mudar
  useEffect(() => {
    CacheManager.saveAdminStatus(isAdmin);
  }, [isAdmin]);

  // Step 1: Master Key (Argos/Gideon)
  const verifyCredentials = async (passaporte, senha) => {
    try {
      if (passaporte === 'Argos' && senha === 'Gideon') {
        return true;
      }
      return false;
    } catch (error) {
      console.log('Erro na verificação de credenciais:', error);
      return false;
    }
  };

  // Step 2: Individual Login
  const login = async (cpf, password) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('cpf', cpf)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Credenciais inválidas');
      }

      setAdminUser(data);
      setIsAdmin(true);
      return { success: true, user: data };
    } catch (error) {
      console.log('Erro no login admin:', error);
      return { success: false, error: error.message };
    }
  };

  // Step 2: Registration
  const register = async (userData) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .insert([{
          cpf: userData.cpf,
          full_name: userData.name,
          role: userData.role,
          school: userData.school,
          password: userData.password
        }])
        .select()
        .single();

      if (error) throw error;

      setAdminUser(data);
      setIsAdmin(true);
      return { success: true, user: data };
    } catch (error) {
      console.log('Erro no registro admin:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      setIsAdmin(false);
      setAdminUser(null);
    } catch (error) {
      console.log('Erro no logout admin:', error);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, adminUser, login, register, logout, verifyCredentials }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext); 