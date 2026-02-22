import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { StorageHelper } from '../utils/storageHelper';
import CacheManager from '../utils/cache';

const CACHE_KEY = 'school_charts_cache';
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutos de cache

export const useSchoolCharts = () => {
  const [schoolCharts, setSchoolCharts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados do cache
  const loadFromCache = useCallback(async () => {
    try {
      const cachedData = await CacheManager.safeGetItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Verificar se o cache ainda é válido
        if (Date.now() - timestamp < CACHE_DURATION) {
          setSchoolCharts(data.schoolCharts || []);
          setSchools(data.schools || []);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar do cache:', error);
      return false;
    }
  }, []);

  // Salvar dados no cache
  const saveToCache = useCallback(async (data) => {
    try {
      const cacheData = {
        data: {
          schoolCharts: data.schoolCharts || [],
          schools: data.schools || []
        },
        timestamp: Date.now()
      };
      await StorageHelper.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  }, []);

  // Buscar todos os gráficos
  const fetchSchoolCharts = useCallback(async () => {
    // console.log('Iniciando busca de dados...');
    try {
      setLoading(true);
      
      // Tenta carregar do cache primeiro
      const hasCachedData = await loadFromCache();
      // console.log('Dados carregados do cache?', hasCachedData);
      
      // Busca do Supabase
      // console.log('Buscando gráficos do Supabase...');
      const { data, error: fetchError } = await supabase
        .from('school_charts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Silenciar erro específico de tabela não encontrada se estivermos em setup
        if (fetchError.code !== 'PGRST205') {
          console.error('Erro ao buscar gráficos:', fetchError);
        }
        throw fetchError;
      }
      // console.log('Gráficos encontrados:', data?.length || 0);

      // Busca as escolas relacionadas
      // console.log('Buscando escolas do Supabase...');
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*');

      if (schoolsError) {
        if (schoolsError.code !== 'PGRST205') {
          console.error('Erro ao buscar escolas:', schoolsError);
        }
        throw schoolsError;
      }
      // console.log('Escolas encontradas:', schoolsData?.length || 0);

      // Buscar perfis dos administradores que criaram os gráficos
      let creatorsMap = {};
      const creatorIds = [...new Set((data || []).map(ch => ch.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_image_url')
          .in('id', creatorIds);
        if (!profilesError && profiles) {
          creatorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      // Enriquecer charts com o perfil do criador
      const enrichedCharts = (data || []).map(ch => ({
        ...ch,
        creator_profile: ch.created_by ? creatorsMap[ch.created_by] || null : null,
      }));

      // Atualiza o estado
      // console.log('Atualizando estado local...');
      setSchoolCharts(enrichedCharts || []);
      setSchools(schoolsData || []);
      
      // Atualiza o cache
      // console.log('Atualizando cache...');
      await saveToCache({
        schoolCharts: enrichedCharts,
        schools: schoolsData
      });
      
      // console.log('Busca concluída com sucesso');
      return { 
        schoolCharts: enrichedCharts || [], 
        schools: schoolsData || [] 
      };
    } catch (error) {
      // Evitar log excessivo para erro conhecido de tabela faltando
      if (error?.code !== 'PGRST205') {
        console.error('Erro ao buscar gráficos:', error);
      }
      setError(error.message);
      return { 
        schoolCharts: [], 
        schools: [],
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  // Adicionar um novo gráfico
  const addSchoolChart = async (chartData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('school_charts')
        .insert([{ ...chartData, created_by: user?.id }])
        .select();

      if (error) throw error;
      
      await fetchSchoolCharts();
      return data?.[0];
    } catch (error) {
      console.error('Erro ao adicionar gráfico:', error);
      throw error;
    }
  };

  // Atualizar um gráfico existente
  const updateSchoolChart = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('school_charts')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      await fetchSchoolCharts();
      return data?.[0];
    } catch (error) {
      console.error('Erro ao atualizar gráfico:', error);
      throw error;
    }
  };

  // Remover um gráfico
  const deleteSchoolChart = async (id) => {
    try {
      // As escolas relacionadas serão removidas automaticamente devido ao ON DELETE CASCADE
      const { error } = await supabase
        .from('school_charts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchSchoolCharts();
    } catch (error) {
      console.error('Erro ao remover gráfico:', error);
      throw error;
    }
  };

  // Adicionar uma escola a um gráfico
  const addSchool = async (schoolData) => {
    try {
      console.log('Adicionando escola:', schoolData);
      
      const { data, error } = await supabase
        .from('schools')
        .insert([schoolData])
        .select();

      if (error) {
        console.error('Erro ao inserir escola:', error);
        throw error;
      }
      
      console.log('Escola adicionada com sucesso:', data);
      
      // Forçar atualização dos dados
      const result = await fetchSchoolCharts();
      console.log('Dados após adicionar escola:', result);
      
      return data?.[0];
    } catch (error) {
      console.error('Erro ao adicionar escola:', error);
      throw error;
    }
  };

  // Atualizar uma escola
  const updateSchool = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      await fetchSchoolCharts();
      return data?.[0];
    } catch (error) {
      console.error('Erro ao atualizar escola:', error);
      throw error;
    }
  };

  // Remover uma escola
  const deleteSchool = async (id) => {
    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchSchoolCharts();
    } catch (error) {
      console.error('Erro ao remover escola:', error);
      throw error;
    }
  };

  // Funções auxiliares
  const getSchoolsByChartId = (chartId) => {
    return schools.filter(school => school.chart_id === chartId);
  };

  const getSchoolPerformance = (chartId) => {
    const list = (chartId === undefined || chartId === null)
      ? schools
      : getSchoolsByChartId(chartId);
    if (!Array.isArray(list) || list.length === 0) return 0;
    const total = list.reduce((sum, school) => sum + (Number(school.performance) || 0), 0);
    return Math.round(total / list.length);
  };

  // Configurar assinatura em tempo real
  useEffect(() => {
    // Busca inicial
    fetchSchoolCharts();

    // Configurar assinatura para mudanças em school_charts
    const schoolChartsSubscription = supabase
      .channel('school_charts_changes')
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'school_charts'
        }, 
        (payload) => {
          console.log('Mudança em school_charts:', payload);
          fetchSchoolCharts();
        }
      )
      .subscribe();

    // Configurar assinatura para mudanças em schools
    const schoolsSubscription = supabase
      .channel('schools_changes')
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'schools'
        }, 
        (payload) => {
          console.log('Mudança em schools:', payload);
          fetchSchoolCharts();
        }
      )
      .subscribe();

    // Limpar assinaturas ao desmontar
    return () => {
      supabase.removeChannel(schoolChartsSubscription);
      supabase.removeChannel(schoolsSubscription);
    };
  }, [fetchSchoolCharts]);

  return {
    schoolCharts,
    schools,
    loading,
    error,
    fetchSchoolCharts,
    addSchoolChart,
    updateSchoolChart,
    deleteSchoolChart,
    addSchool,
    updateSchool,
    deleteSchool,
    getSchoolsByChartId,
    getSchoolPerformance,
    getAveragePerformance: getSchoolPerformance // Alias para compatibilidade
  };
};

export default useSchoolCharts;
