import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSchoolCharts } from '../hooks/useSchoolCharts';
import CacheManager from '../utils/cache';

const SchoolContext = createContext();

export const useSchoolContext = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchoolContext deve ser usado dentro de um SchoolProvider');
  }
  return context;
};

export const SchoolProvider = ({ children }) => {
  // Usando o hook useSchoolCharts para gerenciar os gráficos
  const {
    schoolCharts,
    schools,
    loading,
    error,
    fetchSchoolCharts,
    addSchoolChart: addChart,
    updateSchoolChart: updateChart,
    deleteSchoolChart: deleteChart,
    addSchool,
    updateSchool,
    deleteSchool,
    getSchoolsByChartId,
    getSchoolPerformance,
    getAveragePerformance
  } = useSchoolCharts();

  // Estrutura: { [schoolName]: { notas: [array de notas], totalAlunos: number } }
  const [schoolNoteGraphs, setSchoolNoteGraphs] = useState({});

  // Carregar gráficos de notas do cache ao iniciar
  useEffect(() => {
    const loadGraphs = async () => {
      try {
        const savedGraphs = await CacheManager.loadSchoolGraphs();
        setSchoolNoteGraphs(savedGraphs || {});
      } catch (e) { 
        console.log('Erro ao carregar gráficos de notas:', e); 
      }
    };
    loadGraphs();
  }, []);

  // Salvar gráficos de notas no cache sempre que mudar
  useEffect(() => {
    if (Object.keys(schoolNoteGraphs).length > 0) {
      CacheManager.saveSchoolGraphs(schoolNoteGraphs);
    }
  }, [schoolNoteGraphs]);

  // Adicionar novo gráfico
  const addSchoolChart = async (name) => {
    const newChart = {
      name: name || `Gráfico ${schoolCharts.length + 1}`,
      chart_type: 'geral', // Padrão para 'geral'
      is_active: true
    };
    return await addChart(newChart);
  };

  // Atualizar gráfico
  const updateSchoolChart = async (id, updates) => {
    return await updateChart(id, updates);
  };

  // Remover gráfico
  const deleteSchoolChart = async (chartId) => {
    await deleteChart(chartId);
  };

  // Adicionar escola a um gráfico
  const addSchoolToChart = async (chartId, schoolData) => {
    try {
      console.log('Adicionando escola ao gráfico:', { chartId, schoolData });
      
      const newSchool = {
        chart_id: chartId,
        name: schoolData.name.trim(),
        performance: 0,
        rendimento: null
      };
      
      console.log('Dados da nova escola:', newSchool);
      
      const result = await addSchool(newSchool);
      console.log('Escola adicionada com sucesso:', result);
      
      // Forçar atualização dos dados
      await fetchSchoolCharts();
      
      return result;
    } catch (error) {
      console.error('Erro ao adicionar escola:', error);
      throw error;
    }
  };

  // Atualizar escola
  const updateSchoolInChart = async (schoolId, updates) => {
    return await updateSchool(schoolId, updates);
  };

  // Remover escola de um gráfico
  const removeSchoolFromChart = async (schoolId) => {
    await deleteSchool(schoolId);
  };

  // Atualizar desempenho de uma escola
  const updateSchoolPerformance = async (chartId, schoolId, newPerformance) => {
    try {
      // Garante que newPerformance seja um número
      const performanceValue = parseInt(newPerformance, 10);
      
      // Se não for um número válido, define como 0
      if (isNaN(performanceValue)) {
        console.warn('Valor de desempenho inválido:', newPerformance, 'definindo como 0');
        return await updateSchool(schoolId, { performance: 0 });
      }
      
      // Limita o valor entre 0 e 100
      const clampedPerformance = Math.min(100, Math.max(0, performanceValue));
      
      console.log(`Atualizando desempenho da escola ${schoolId} para ${clampedPerformance}%`);
      return await updateSchool(schoolId, { performance: clampedPerformance });
    } catch (error) {
      console.error('Erro ao atualizar desempenho:', error);
      throw error;
    }
  };

  // Atualizar nome do gráfico
  const updateChartName = async (chartId, newName) => {
    return await updateChart(chartId, { name: newName });
  };

  // Obter estatísticas totais
  const getTotalSchools = () => {
    return schools.length;
  };

  // Obter desempenho médio de um gráfico específico
  const getChartAveragePerformance = (chartId) => {
    return getSchoolPerformance(chartId);
  };

  // Salvar dados de gráfico de uma escola
  const saveSchoolNoteGraph = (schoolName, notas, totalAlunos) => {
    const newGraphs = {
      ...schoolNoteGraphs,
      [schoolName]: { notas, totalAlunos }
    };
    setSchoolNoteGraphs(newGraphs);
    return newGraphs;
  };

  // Obter dados de gráfico de uma escola
  const getSchoolNoteGraph = (schoolName) => {
    return schoolNoteGraphs[schoolName] || null;
  };

  // Obter todos os gráficos salvos
  const getAllSchoolNoteGraphs = () => {
    return schoolNoteGraphs;
  };

  // Atualizar dados de rendimento de uma escola
  const updateSchoolRendimento = async (schoolId, rendimentoData) => {
    return await updateSchool(schoolId, { rendimento: rendimentoData });
  };

  // Obter dados de rendimento de uma escola
  const getSchoolRendimento = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.rendimento || null;
  };

  // Obter todas as escolas de um gráfico com seus rendimentos
  const getChartWithSchools = (chartId) => {
    const chart = schoolCharts.find(c => c.id === chartId);
    if (!chart) return null;
    
    const chartSchools = getSchoolsByChartId(chartId);
    return {
      ...chart,
      schools: chartSchools
    };
  };

  const value = {
    // Dados e estado
    schoolCharts: schoolCharts.map(chart => ({
      ...chart,
      schools: getSchoolsByChartId(chart.id)
    })),
    schools,
    loading,
    error,
    
    // Ações de gráficos
    addSchoolChart,
    updateSchoolChart,
    deleteSchoolChart,
    updateChartName,
    getChartAveragePerformance,
    
    // Ações de escolas
    addSchool: addSchoolToChart,
    updateSchool: updateSchoolInChart,
    deleteSchool: removeSchoolFromChart,
    updateSchoolPerformance,
    
    // Funções auxiliares
    getSchoolsByChartId,
    getAveragePerformance: getChartAveragePerformance,
    getTotalSchools,
    
    // Funções de notas e gráficos antigos (mantidas para compatibilidade)
    saveSchoolNoteGraph,
    getSchoolNoteGraph,
    getAllSchoolNoteGraphs,
    updateSchoolRendimento,
    getSchoolRendimento,
    
    // Funções adicionais
    getChartWithSchools,
    fetchSchoolCharts
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}; 