import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableWithoutFeedback, 
  ScrollView as RNScrollView, 
  Animated, 
  RefreshControl, 
  Platform, 
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSchoolContext } from '../contexts/SchoolContext';
import { useUserContext } from '../contexts/UserContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { StorageHelper } from '../utils/storageHelper';
import CacheManager from '../utils/cache';
import OptimizedImage from '../components/OptimizedImage';

import SchoolRendimentoDisplayModal from '../components/SchoolRendimentoDisplayModal';

const BALLOON_MESSAGES = [
  'Bem-vindo!\nAqui você pode acessar as estatísticas das escolas cadastradas.',
  'Vamos lá!'
];

// Função utilitária para criar paths de arcos
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', cx, cy,
    'Z',
  ].join(' ');
  return d;
}

function polarToCartesian(cx, cy, r, angle) {
  const a = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  };
}

const PieChartSvg = ({ data, colors, size = 180, innerRadius = 45 }) => {
  const total = data.reduce((a, b) => a + b, 0);
  let angle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const ir = innerRadius;
  const labelRadius = ir + (r - ir) * 0.45;
  const labels = [];
  // Calcular ângulos acumulados para garantir proporção correta
  const angles = data.map((value) => (value / total) * 360);
  let currentAngle = 0;
  return (
    <Svg width={size} height={size}>
      <G>
        {data.map((value, idx) => {
          if (value === 0) return null;
          const startAngle = currentAngle;
          const angleDelta = angles[idx];
          const endAngle = startAngle + angleDelta;
          // Calcular ângulo do centro da fatia
          const midAngle = startAngle + angleDelta / 2;
          // Calcular posição do texto
          const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);
          // Calcular porcentagem
          const percent = ((value / total) * 100).toFixed(1).replace('.0', '');
          labels.push({ x: labelPos.x, y: labelPos.y, percent, color: colors[idx] });
          currentAngle += angleDelta;
          return (
            <Path
              key={idx}
              d={describeArc(cx, cy, r, startAngle, endAngle)}
              fill={colors[idx]}
              stroke={colors[idx]}
              strokeWidth={1}
            />
          );
        })}
        {/* Círculo central para efeito de donut */}
        <Circle cx={cx} cy={cy} r={ir} fill="#fff" />
        {/* Porcentagens */}
        {labels.map((label, idx) => (
          <SvgText
            key={idx}
            x={label.x}
            y={label.y + 4}
            fontSize={13}
            fontWeight="bold"
            fill="#222"
            textAnchor="middle"
          >
            {label.percent}%
          </SvgText>
        ))}
      </G>
    </Svg>
  );
};

const TAB_NAMES = ['Geral', 'Individual', 'Pessoal', 'Eventos'];

// Sistema de Evolução do Aluno - Baseado em Conquistas
const LEVELS = [
  { name: 'Madeira', minAchievements: 0, color: '#8B4513', gradient: ['#8B4513', '#A0522D'], icon: 'leaf-outline' },
  { name: 'Pedra', minAchievements: 5, color: '#696969', gradient: ['#696969', '#808080'], icon: 'cube-outline' },
  { name: 'Carvão', minAchievements: 10, color: '#2F2F2F', gradient: ['#2F2F2F', '#4A4A4A'], icon: 'flame-outline' },
  { name: 'Bronze', minAchievements: 15, color: '#CD7F32', gradient: ['#CD7F32', '#DAA520'], icon: 'medal-outline' },
  { name: 'Prata', minAchievements: 20, color: '#C0C0C0', gradient: ['#C0C0C0', '#E5E5E5'], icon: 'star-outline' },
  { name: 'Ouro', minAchievements: 25, color: '#FFD700', gradient: ['#FFD700', '#FFA500'], icon: 'diamond-outline' }
];

// Caminho das Conquistas - Timeline de evolução
const ACHIEVEMENT_PATH = [
  { id: 'first_access', title: 'Primeiro Acesso', description: 'Você entrou no app', icon: 'trophy', xp: 10, color: '#F59E0B', isUnlocked: true, backgroundColor: '#FEF3C7' },
  { id: 'open_pdf', title: 'Leitor', description: 'Você abriu um PDF', icon: 'document-text', xp: 20, color: '#6B7280', isUnlocked: false, backgroundColor: '#F3F4F6' },
  { id: 'chart_viewer_5', title: 'Analista', description: 'Você visualizou 5 gráficos', icon: 'stats-chart', xp: 25, color: '#0EA5E9', isUnlocked: false, backgroundColor: '#E0F2FE' },
  { id: 'first_message', title: 'Conversador', description: 'Você enviou sua primeira mensagem', icon: 'chatbubble-ellipses', xp: 20, color: '#22C55E', isUnlocked: false, backgroundColor: '#DCFCE7' },
  { id: 'chatter_20', title: 'Papo Forte', description: 'Você enviou 20 mensagens', icon: 'chatbubbles', xp: 40, color: '#16A34A', isUnlocked: false, backgroundColor: '#DCFCE7' },
  { id: 'watch_videos_3', title: 'Maratonista', description: 'Você assistiu 3 vídeos', icon: 'play', xp: 25, color: '#F87315', isUnlocked: false, backgroundColor: '#FFEFE6' },
  { id: 'join_quiz', title: 'Competidor', description: 'Você participou de um quiz', icon: 'help-circle', xp: 30, color: '#8B5CF6', isUnlocked: false, backgroundColor: '#EDE9FE' },
  { id: 'quiz_score_70', title: 'Acertei 70%', description: 'Você marcou 70% ou mais em um quiz', icon: 'sparkles', xp: 60, color: '#10B981', isUnlocked: false, backgroundColor: '#D1FAE5' },
  { id: 'streak_3', title: '3 Dias Seguidos', description: 'Você estudou por 3 dias seguidos', icon: 'calendar', xp: 30, color: '#F59E0B', isUnlocked: false, backgroundColor: '#FEF3C7' },
  { id: 'streak_7', title: '7 Dias Seguidos', description: 'Você estudou por 7 dias seguidos', icon: 'calendar-outline', xp: 80, color: '#EA580C', isUnlocked: false, backgroundColor: '#FFEDD5' },
];

const ACHIEVEMENTS = [
  // Conquistas de Estudo
  { id: 'consistent_study', title: 'Estudioso Consistente', description: 'Estude 7 dias seguidos', icon: 'calendar', xp: 40, category: 'study', color: '#F59E0B' },
  
  // Conquistas de Organização
  { id: 'first_note', title: 'Primeira Nota', description: 'Crie sua primeira nota', icon: 'document-text', xp: 15, category: 'organization', color: '#6B7280' },
  { id: 'note_taker', title: 'Tomador de Notas', description: 'Crie 5 notas', icon: 'document-text', xp: 35, category: 'organization', color: '#8B5CF6' },
];

// Função auxiliar para calcular a média de desempenho a partir dos dados de rendimento
const calculateAveragePerformance = (rendimentoData) => {
  if (!rendimentoData) return 0;
  
  const values = [
    rendimentoData.unidade1?.porcentagem,
    rendimentoData.unidade2?.porcentagem,
    rendimentoData.unidade3?.porcentagem,
    rendimentoData.unidade4?.porcentagem
  ].filter(val => typeof val === 'number');
  
  if (values.length === 0) return 0;
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

const StatisticsScreen = ({ setCurrentScreen }) => {
  const { theme, selectedMode } = useThemeContext();
  const { user: authUser, evolutionStats, unlockedAchievements: ctxUnlocked, recordEvent } = useAuth();
  const navigation = useNavigation();
  const { 
    schoolCharts, 
    schools, 
    loading, 
    error, 
    getAveragePerformance, 
    getTotalSchools, 
    getSchoolRendimento, 
    getSchoolsByChartId,
    fetchSchoolCharts
  } = useSchoolContext();
  const { user } = useUserContext();
  const { isAdmin } = useAdminAuth();
  const [balloonIndex, setBalloonIndex] = useState(0);
  const [showBalloon, setShowBalloon] = useState(true);
  const [activeTab, setActiveTab] = useState('Geral');
  const [showRendimentoModal, setShowRendimentoModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para quiz
  const [quizRooms, setQuizRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchRoomCode, setSearchRoomCode] = useState('');

  // Agrupar escolas por chart_id para reduzir custo de renderização na Web
  const schoolsByChartId = useMemo(() => {
    const map = new Map();
    (schools || []).forEach((s) => {
      const key = s?.chart_id;
      if (key == null) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return map;
  }, [schools]);

  // Atualizar os dados quando o componente for montado
  useEffect(() => {
    fetchSchoolCharts().catch(error => {
      console.error('Erro ao carregar gráficos:', error);
    });
    if (activeTab === 'Eventos') {
      loadAvailableRooms();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Geral' || activeTab === 'Individual') {
      try { recordEvent('viewed_chart'); } catch {}
    }
  }, [activeTab, schoolCharts.length]);


  // Função para atualizar os dados
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSchoolCharts();
    } catch (error) {
      console.error('Erro ao atualizar gráficos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Estados do sistema de evolução
  const [userLevel, setUserLevel] = useState(LEVELS[0]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const achievementAnim = useState(new Animated.Value(0))[0];
  const [achievementPath, setAchievementPath] = useState(ACHIEVEMENT_PATH);
  const hasLoggedAchievementSaveError = useRef(false);
  
  // Estados para animação de conquistas desbloqueadas
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState([]);
  const [achievementAnimations, setAchievementAnimations] = useState({});

  // Verificar se user existe antes de usar
  const userSubjectAccess = user?.subjectAccess || {};
  const userSubjectTime = user?.subjectTime || {};

  // Carregar dados do usuário
  useEffect(() => {
    loadUserProgress();
  }, []);

  useEffect(() => {
    if (Array.isArray(ctxUnlocked)) {
      setUnlockedAchievements(ctxUnlocked);
    }
  }, [ctxUnlocked && ctxUnlocked.length]);

  const loadUserProgress = async () => {
    try {
      const savedAchievements = await CacheManager.safeGetItem('userAchievements');
      const savedNewlyUnlocked = await CacheManager.safeGetItem('newlyUnlockedAchievements');
      
      if (savedAchievements) {
        const achievements = JSON.parse(savedAchievements);
        setUnlockedAchievements(achievements);
        // Atualizar nível baseado no número de conquistas
        updateUserLevel(achievements.length);
      }
      
      if (savedNewlyUnlocked) {
        setNewlyUnlockedAchievements(JSON.parse(savedNewlyUnlocked));
      }
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
    }
  };

  const updateUserLevel = (achievementCount) => {
    const currentLevelIndex = LEVELS.findIndex(level => level.name === userLevel.name);
    const nextLevel = LEVELS[currentLevelIndex + 1];
    
    if (!nextLevel) return 1; // Nível máximo
    
    const currentLevelAchievements = userLevel.minAchievements;
    const nextLevelAchievements = nextLevel.minAchievements;
    const userProgress = unlockedAchievements.length - currentLevelAchievements;
    const requiredProgress = nextLevelAchievements - currentLevelAchievements;
    
    return Math.max(0, Math.min(1, userProgress / requiredProgress));
  };

  const unlockAchievement = async (achievement) => {
    if (!achievement) return; // Proteção contra achievement undefined
    
    // Verificar se a conquista já foi desbloqueada
    const alreadyUnlocked = unlockedAchievements.find(a => a.id === achievement.id);
    if (alreadyUnlocked) {
      return;
    }
    
    const newUnlocked = [...unlockedAchievements, achievement];
    setUnlockedAchievements(newUnlocked);
    
    // Atualizar nível baseado no número de conquistas
    updateUserLevel(newUnlocked.length);
    
    // Mostrar animação de conquista
    setNewAchievement(achievement);
    setShowAchievement(true);
    
    Animated.sequence([
      Animated.timing(achievementAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.delay(2000),
      Animated.timing(achievementAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setShowAchievement(false);
      setNewAchievement(null);
    });
    
    try {
      await StorageHelper.setItem('userAchievements', JSON.stringify(newUnlocked));
    } catch (error) {
      console.error('Erro ao salvar conquistas:', error);
    }
  };

  // Verificar conquistas baseadas nas atividades
  useEffect(() => {
    checkAchievements().catch(error => {
      console.error('Erro ao verificar conquistas:', error);
    });
  }, [userSubjectAccess]); // Removido unlockedAchievements para evitar loop

  // Função para forçar verificação de conquistas
  const forceCheckAchievements = async () => {
    // console.log('🔄 Forçando verificação de conquistas...');
    await checkAchievements();
  };

  const checkAchievements = async () => {
    // console.log('🔍 StatisticsScreen: Iniciando verificação de conquistas...');
    
    // Carregar conquistas desbloqueadas salvas
    let savedAchievements = [];
    try {
      const saved = await StorageHelper.getItem('userAchievements');
      if (saved) {
        savedAchievements = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar conquistas salvas:', error);
    }

    // console.log('📊 StatisticsScreen: Conquistas salvas:', savedAchievements);

    const ctxIds = Array.isArray(ctxUnlocked) ? ctxUnlocked.map(a => a.id) : [];
    const unlockedIds = savedAchievements.map(a => a.id).concat(ctxIds);
    // console.log('🔓 StatisticsScreen: IDs desbloqueados:', unlockedIds);

    // Carregar dados atuais
    let totalStudyMinutes = Object.values(userSubjectTime).reduce((sum, time) => sum + time, 0);
    let uniqueSubjects = Object.keys(userSubjectAccess).filter(subject => userSubjectAccess[subject] > 0).length;

    // Função para verificar se deve desbloquear
    async function shouldUnlock(achievement) {
      switch (achievement.id) {
        case 'first_access': return true;
        case 'open_pdf': return (evolutionStats?.pdfs_opened || 0) >= 1;
        case 'chart_viewer_5': return (evolutionStats?.charts_viewed || 0) >= 5;
        case 'first_message': return (evolutionStats?.messages_sent || 0) >= 1;
        case 'chatter_20': return (evolutionStats?.messages_sent || 0) >= 20;
        case 'watch_videos_3': return (evolutionStats?.videos_watched || 0) >= 3;
        case 'join_quiz': return (evolutionStats?.quizzes_joined || 0) >= 1;
        case 'quiz_score_70': return (evolutionStats?.quiz_best_score || 0) >= 70;
        case 'streak_3': return (evolutionStats?.streak_days || 0) >= 3;
        case 'streak_7': return (evolutionStats?.streak_days || 0) >= 7;
        default: return false;
      }
    }

    // Novo array de conquistas desbloqueadas
    let newUnlocked = [...savedAchievements];
    let updated = false;

    // console.log(' StatisticsScreen: Verificando cada conquista...');

    for (const achievement of achievementPath) {
      // console.log(` StatisticsScreen: Verificando conquista ${achievement.id}...`);
      
      const alreadyUnlocked = unlockedIds.includes(achievement.id);
      // console.log(` StatisticsScreen: ${achievement.id} já desbloqueada?`, alreadyUnlocked);
      
      if (!alreadyUnlocked) {
        const shouldUnlockResult = await shouldUnlock(achievement);
        // console.log(` StatisticsScreen: ${achievement.id} deve ser desbloqueada?`, shouldUnlockResult);
        
        if (shouldUnlockResult) {
          // console.log(` StatisticsScreen: DESBLOQUEANDO ${achievement.id}!`);
          newUnlocked.push({ id: achievement.id, date: Date.now() });
          updated = true;
        }
      }
    }

    // console.log(' StatisticsScreen: Conquistas atualizadas:', newUnlocked);
    // console.log(' StatisticsScreen: Houve atualização?', updated);

    if (updated) {
      setUnlockedAchievements(newUnlocked);
      try {
        await StorageHelper.setItem('userAchievements', JSON.stringify(newUnlocked));
      } catch (error) {
        if (!hasLoggedAchievementSaveError.current) {
          console.error(' StatisticsScreen: Erro ao salvar conquistas:', error);
          hasLoggedAchievementSaveError.current = true;
        }
      }
    } else {
      setUnlockedAchievements(newUnlocked);
    }
  };

  const getProgressToNextLevel = () => {
    const currentLevelIndex = LEVELS.findIndex(level => level.name === userLevel.name);
    const nextLevel = LEVELS[currentLevelIndex + 1];
    
    if (!nextLevel) return 1; // Nível máximo
    
    const currentLevelAchievements = userLevel.minAchievements;
    const nextLevelAchievements = nextLevel.minAchievements;
    const userProgress = unlockedAchievements.length - currentLevelAchievements;
    const requiredProgress = nextLevelAchievements - currentLevelAchievements;
    
    return Math.max(0, Math.min(1, userProgress / requiredProgress));
  };

  const handleBalloonPress = () => {
    setBalloonIndex((prev) => (prev === 0 ? 1 : 0));
  };

  // Funções para gerenciar quizzes - Otimizada
  const loadAvailableRooms = async () => {
    setLoadingRooms(true);
    try {
      let data, error;
      try {
        const res = await supabase
          .from('quiz_rooms')
          .select(`
            id,
            room_code,
            quiz_id,
            status,
            max_participants,
            created_at,
            quiz:quizzes!inner(
              id,
              name,
              subject
            )
          `)
          .eq('is_active', true)
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(20);
        data = res.data; error = res.error;
        if (error) throw error;
      } catch (err) {
        if (err?.code === '42703') {
          const res2 = await supabase
            .from('quiz_rooms')
            .select(`
              id,
              room_code,
              quiz_id,
              max_participants,
              created_at,
              quiz:quizzes!inner(
                id,
                name,
                subject
              )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(20);
          data = res2.data; error = res2.error;
          if (error) throw error;
        } else {
          throw err;
        }
      }
      
      // Verificar limite de participantes para cada sala
      const roomsWithAvailability = await Promise.all(
        (data || []).map(async (room) => {
          if (room.max_participants > 0) {
            const { count, error: countError } = await supabase
              .from('quiz_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);
            
            const currentCount = countError ? 0 : (count || 0);
            return {
              ...room,
              isFull: currentCount >= room.max_participants,
              currentParticipants: currentCount
            };
          }
          return { ...room, isFull: false, currentParticipants: 0 };
        })
      );
      
      setQuizRooms(roomsWithAvailability);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as salas disponíveis.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const searchQuizRooms = async () => {
    if (!searchRoomCode.trim()) {
      Alert.alert('Aviso', 'Digite um código de sala para pesquisar.');
      return;
    }

    setLoadingRooms(true);
    try {
      let data, error;
      try {
        const res = await supabase
          .from('quiz_rooms')
          .select(`
            id,
            room_code,
            quiz_id,
            status,
            max_participants,
            quiz:quizzes!inner(
              id,
              name,
              subject
            )
          `)
          .eq('room_code', searchRoomCode.trim().toUpperCase())
          .eq('is_active', true)
          .single();
        data = res.data; error = res.error;
        if (error && error.code !== 'PGRST116') throw error;
      } catch (err) {
        if (err?.code === '42703') {
          const res2 = await supabase
            .from('quiz_rooms')
            .select(`
              id,
              room_code,
              quiz_id,
              max_participants,
              quiz:quizzes!inner(
                id,
                name,
                subject
              )
            `)
            .eq('room_code', searchRoomCode.trim().toUpperCase())
            .eq('is_active', true)
            .single();
          data = res2.data; error = res2.error;
          if (error && error.code !== 'PGRST116') throw error;
        } else {
          throw err;
        }
      }
      
      if (data) {
        if (data.status && data.status !== 'waiting') {
          Alert.alert('Sala Indisponível', 'Esta sala já foi iniciada ou finalizada.');
          setQuizRooms([]);
          setSearchRoomCode('');
          return;
        }

        // Verificar limite de participantes
        if (data.max_participants > 0) {
          const { count, error: countError } = await supabase
            .from('quiz_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', data.id);
          
          const currentCount = countError ? 0 : (count || 0);
          if (currentCount >= data.max_participants) {
            Alert.alert('Sala Cheia', 'Esta sala atingiu o limite máximo de participantes.');
            setQuizRooms([]);
            setSearchRoomCode('');
            return;
          }
          
          data.isFull = false;
          data.currentParticipants = currentCount;
        }
        
        setQuizRooms([data]);
        setSearchRoomCode('');
      } else {
        Alert.alert('Não encontrado', 'Nenhuma sala encontrada com este código.');
        setQuizRooms([]);
      }
    } catch (error) {
      console.error('Erro ao buscar sala:', error);
      Alert.alert('Erro', 'Não foi possível buscar a sala.');
      setQuizRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const joinQuizRoom = async (room) => {
    if (!authUser?.id) {
      Alert.alert('Erro', 'Você precisa estar logado para participar de um quiz.');
      return;
    }

    try {
      try { recordEvent('joined_quiz'); } catch {}
      navigation.navigate('Quiz', { roomId: room.id, roomCode: room.room_code });
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      Alert.alert('Erro', 'Não foi possível entrar na sala do quiz.');
    }
  };


  // Renderizar um gráfico de barras para um grupo de escolas
  const renderSchoolBars = (chartSchools, creatorProfile, chart) => {
    if (!chartSchools || chartSchools.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: theme.text, textAlign: 'center', marginTop: 20 }]}> 
          Nenhuma escola cadastrada neste gráfico
        </Text>
      );
    }

    // Cores para as barras (pode ser personalizado conforme necessário)
    const barColors = [
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FF9800', // Laranja
      '#E91E63', // Rosa
      '#9C27B0', // Roxo
    ];

    // Largura das barras ajustada ao número de escolas
    const n = chartSchools.length;
    const barWidth = n <= 4 ? 40 : n <= 8 ? 28 : 22;
    const barInnerWidth = n <= 4 ? 30 : n <= 8 ? 20 : 16;
    const marginBetweenBars = n <= 4 ? 6 : n <= 8 ? 4 : 2;

    // Proporções e linhas de grade
    const yMax = Math.max(
      typeof chart?.y_axis_max === 'number' ? chart.y_axis_max : 100,
      ...chartSchools.map(s => {
        const v = typeof s.performance === 'number' ? s.performance : 0;
        return Math.min(100, Math.max(0, v || 0));
      })
    );
    const gridStep = yMax >= 100 ? 25 : Math.max(5, Math.round(yMax / 4));
    const gridLines = [];
    for (let v = yMax; v >= 0; v -= gridStep) gridLines.push(v);
    if (gridLines[gridLines.length - 1] !== 0) gridLines.push(0);
    const showTarget = typeof chart?.target_percent === 'number';
    const targetPercent = showTarget ? chart.target_percent : 0;

    return (
      <View style={{ paddingHorizontal: 10, position: 'relative' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 260 }}>
          {/* Eixo Y e linhas de grade */}
            <View style={{ width: 34, height: '100%', justifyContent: 'space-between', paddingBottom: 22 }}>
            {gridLines.map((val) => (
              <View key={val} style={{ height: 1, justifyContent: 'center' }}>
                <Text style={{ color: theme.text, opacity: 0.6, fontSize: 11 }}>{Math.round(val)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1, height: '100%', paddingTop: 8, paddingBottom: 12 }}>
            {/* Grade */}
            <View style={{ position: 'absolute', top: 8, bottom: 12, left: 0, right: 0 }}>
              {gridLines.map((val, idx) => (
                <View
                  key={val}
                  style={{
                    position: 'absolute',
                    top: `${(100 - (val / yMax) * 100)}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: theme.border,
                    opacity: 0.5
                  }}
                />
              ))}
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: theme.border
              }} />
              {showTarget ? (
                <>
                  <View
                    style={{
                      position: 'absolute',
                      top: `${(100 - (Math.min(targetPercent, yMax) / yMax) * 100)}%`,
                      left: 0,
                      right: 0,
                      height: 1.5,
                      backgroundColor: theme.icon,
                      opacity: 0.7
                    }}
                  />
                  <View style={{
                    position: 'absolute',
                    top: `${(100 - (Math.min(targetPercent, yMax) / yMax) * 100)}%`,
                    right: 6,
                    transform: [{ translateY: -10 }],
                    backgroundColor: theme.card,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border
                  }}>
                    <Text style={{ color: theme.text, fontSize: 10 }}>
                      Meta {Math.round(targetPercent)}%
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
            {/* Barras */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'flex-end',
              height: '100%',
              paddingHorizontal: 12,
            }}>
        {chartSchools.map((school, index) => {
          const barColor = theme.primary || barColors[index % barColors.length];
          const rawPerf = typeof school.performance === 'number' ? school.performance : 0;
          const clampedPerf = Math.min(Math.max(rawPerf || 0, 0), yMax);
          const barHeight = Math.max(10, (clampedPerf / yMax) * 100);
          
          return (
            <View 
              key={school.id} 
              style={{
                alignItems: 'center',
                width: barWidth,
                marginHorizontal: marginBetweenBars / 2,
              }}
            >
              {/* Valor da porcentagem */}
              <Text style={{
                color: theme.text,
                fontSize: 10,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 3,
                height: 16,
                minWidth: 22,
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 5,
                paddingHorizontal: 3,
              }}>
                {Math.round(clampedPerf)}%
              </Text>
              
              {/* Container da barra */}
              <View style={{ 
                flex: 1, 
                justifyContent: 'flex-end',
                width: '100%',
                paddingBottom: 2,
              }}>
                {/* Barra */}
                <View 
                  style={{
                    backgroundColor: barColor,
                    height: `${barHeight}%`,
                    minHeight: 10,
                    width: barInnerWidth,
                    borderRadius: 4,
                    alignSelf: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 1.5,
                    elevation: 2,
                  }}
                >
                  {/* Gradiente sutil no topo da barra */}
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '30%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }} />
                </View>
              </View>
              
              {/* Nome da escola */}
              <Text 
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  textAlign: 'center',
                  height: 24,
                  width: '100%',
                  color: theme.text,
                  fontWeight: '500',
                  lineHeight: 11,
                }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {school.name}
              </Text>
            </View>
          );
        })}
            </View>
            {/* Eixo X label */}
            <View style={{ height: 22, justifyContent: 'center' }}>
              <Text style={{ color: theme.text, opacity: 0.6, fontSize: 11, textAlign: 'right' }}>Desempenho (%)</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Dados para o gráfico de setores
  const subjectColors = {
    'Geografia': '#1976D2',
    'Matemática': '#388E3C',
    'História': '#8D6E63',
    'Português': '#3949AB',
    'Ciências': '#0288D1',
    'Artes': '#D84315',
    'Educação Física': '#00897B',
  };
  // Filtrar apenas matérias acessadas (>0)
  const filteredSubjects = Object.entries(userSubjectAccess)
    .filter(([_, count]) => typeof count === 'number' && count > 0);
  const subjectNames = filteredSubjects.map(([name]) => name);
  const subjectCounts = filteredSubjects.map(([_, count]) => count);
  const sliceColors = subjectNames.map((name, idx) => subjectColors[name] || '#F59E42');
  const hasValidPie = subjectCounts.length >= 2 && subjectCounts.length === sliceColors.length;

  // Renderizar o caminho das conquistas em timeline vertical
  const renderAchievementPath = () => {
    // console.log('📊 Total de conquistas no ACHIEVEMENT_PATH:', achievementPath.length);
    // console.log('🏆 Conquistas desbloqueadas:', unlockedAchievements.length);
    
    return (
      <View style={styles.achievementPathContainer}>
        {achievementPath.map((achievement, index) => {
          const isLast = index === achievementPath.length - 1;
          const isUnlocked = unlockedAchievements.find(a => a.id === achievement.id);
          // Definir cor de texto e ícone para bloqueadas no modo escuro
          const lockedTextColor = selectedMode === 'escuro' ? '#d1d5db' : '#9CA3AF';
          const lockedIconColor = selectedMode === 'escuro' ? '#f3f4f6' : '#9CA3AF';
          return (
            <View key={achievement.id} style={styles.achievementPathItem}>
              {/* Conquista */}
              <View style={[
                styles.achievementPathCard,
                { 
                  backgroundColor: isUnlocked ? achievement.backgroundColor : '#F3F4F6',
                  borderColor: isUnlocked ? achievement.color : '#D1D5DB',
                  opacity: isUnlocked ? 1 : 0.7,
                }
              ]}>
                <View style={styles.achievementPathIcon}>
                  <Ionicons 
                    name={achievement.icon} 
                    size={28} 
                    color={isUnlocked ? achievement.color : lockedIconColor} 
                  />
                </View>
                <View style={styles.achievementPathInfo}>
                  <Text style={[
                    styles.achievementPathTitle, 
                    { 
                      color: isUnlocked ? '#1F2937' : lockedTextColor,
                      fontWeight: isUnlocked ? 'bold' : 'normal'
                    }
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementPathDescription, 
                    { 
                      color: isUnlocked ? '#4B5563' : lockedTextColor
                    }
                  ]}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
              {/* Linha conectora (exceto para o último item) */}
              {!isLast && (
                <View style={[
                  styles.achievementPathLine,
                  { backgroundColor: isUnlocked ? achievement.color : '#D1D5DB' }
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Renderizar conquistas em formato zigzag (mantido para compatibilidade)
  const renderAchievementsZigzag = () => {
    return (
      <View style={styles.achievementsGrid}>
        {ACHIEVEMENTS.map((achievement, index) => {
          const isUnlocked = unlockedAchievements.find(a => a.id === achievement.id);
          const isEven = index % 2 === 0;
          
          return (
            <View key={achievement.id} style={[
              styles.achievementCard,
              isEven ? styles.achievementCardLeft : styles.achievementCardRight,
              { 
                backgroundColor: theme.card,
                borderColor: isUnlocked ? achievement.color : theme.border,
                opacity: isUnlocked ? 1 : 0.6,
                shadowColor: isUnlocked ? achievement.color : '#000',
                shadowOpacity: isUnlocked ? 0.3 : 0.1,
                shadowRadius: isUnlocked ? 8 : 4,
                shadowOffset: { width: 0, height: isUnlocked ? 4 : 2 },
                elevation: isUnlocked ? 6 : 2,
              }
            ]}>
              <View style={[
                styles.achievementHeader,
                isEven ? styles.achievementHeaderLeft : styles.achievementHeaderRight
              ]}>
                <View style={[
                  styles.achievementIcon,
                  { 
                    backgroundColor: isUnlocked ? achievement.color : theme.border,
                    shadowColor: isUnlocked ? achievement.color : '#000',
                    shadowOpacity: isUnlocked ? 0.4 : 0.2,
                    shadowRadius: isUnlocked ? 6 : 3,
                    shadowOffset: { width: 0, height: isUnlocked ? 3 : 1 },
                    elevation: isUnlocked ? 4 : 2,
                  }
                ]}>
                  <Ionicons 
                    name={achievement.icon} 
                    size={24} 
                    color={isUnlocked ? '#fff' : theme.text} 
                  />
                </View>
                <View style={[
                  styles.achievementInfo,
                  isEven ? styles.achievementInfoLeft : styles.achievementInfoRight
                ]}>
                  <Text style={[
                    styles.achievementTitle, 
                    { 
                      color: theme.text,
                      textAlign: isEven ? 'left' : 'right'
                    }
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementDescription, 
                    { 
                      color: theme.text,
                      textAlign: isEven ? 'left' : 'right'
                    }
                  ]}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.achievementFooter,
                isEven ? styles.achievementFooterLeft : styles.achievementFooterRight
              ]}>
                <View style={[
                  styles.xpBadge,
                  { backgroundColor: isUnlocked ? achievement.color : theme.border }
                ]}>
                  <Text style={[styles.achievementXP, { color: isUnlocked ? '#fff' : theme.text }]}>
                    Conquista
                  </Text>
                </View>
                {isUnlocked && (
                  <View style={[styles.unlockBadge, { backgroundColor: achievement.color }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      {/* Notificação de Conquista Desbloqueada */}
      {showAchievement && newAchievement && (
        <Animated.View
          style={[
            styles.achievementNotification,
            {
              opacity: achievementAnim,
              transform: [
                {
                  translateY: achievementAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.achievementNotificationContent,
              { backgroundColor: newAchievement.color },
            ]}
          >
            <View style={styles.achievementNotificationIcon}>
              <Ionicons name={newAchievement.icon} size={24} color="#fff" />
            </View>
            <View style={styles.achievementNotificationText}>
              <Text style={styles.achievementNotificationTitle}>
                🎉 Conquista Desbloqueada!
              </Text>
              <Text style={styles.achievementNotificationDescription}>
                {newAchievement.title}
              </Text>
              <Text style={styles.achievementNotificationXP}>
                Nova Conquista!
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
      <View style={{ flex: 1, width: '100%' }}>
        {/* Barra de abas fixa */}
        <View style={{ zIndex: 10, backgroundColor: theme.sidebar || theme.background }}>
          <Text style={{
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            marginTop: 12,
            marginBottom: 4,
            color: theme.text,
          }}>
            Dados de Rentabilidade
          </Text>
          <RNScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', height: 48 }}
            style={{ backgroundColor: theme.sidebar || theme.background, marginBottom: 0 }}
          >
            {TAB_NAMES.map(tab => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingHorizontal: 24,
                    height: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? theme.text : '#AAA',
                      fontWeight: isActive ? 'bold' : 'normal',
                      fontSize: 18,
                    }}
                  >
                    {tab}
                  </Text>
                  {isActive && (
                    <View
                      style={{
                        height: 4,
                        width: '80%',
                        backgroundColor: theme.primary,
                        borderRadius: 2,
                        marginTop: 4,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </RNScrollView>
          <View style={styles.horizontalLine} />
        </View>
        {/* Conteúdo rolável */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { minHeight: '100%' }]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1, width: '100%', ...(Platform.OS === 'web' ? { overflow: 'auto' } : {}) }}
          refreshControl={Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          ) : undefined}
        >
          <TouchableWithoutFeedback>
            <View>
              {/* Conteúdo dinâmico das abas */}
              {activeTab === 'Geral' && (
                <>
                  {/* Gráficos de cada grupo de escolas */}
                  {loading ? (
                    <View style={[styles.loadingContainer, { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }]}>
                      <ActivityIndicator size="large" color={theme.primary} />
                      <Text style={[styles.loadingText, { color: theme.text, marginTop: 10 }]}>
                        Carregando gráficos...
                      </Text>
                    </View>
                  ) : error ? (
                    <View style={[styles.errorContainer, { backgroundColor: theme.card, padding: 20, borderRadius: 8, margin: 10 }]}>
                      <Text style={[styles.errorText, { color: 'red' }]}>
                        Erro ao carregar gráficos: {error}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 10, padding: 10, borderRadius: 5 }]}
                        onPress={onRefresh}
                      >
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Tentar novamente</Text>
                      </TouchableOpacity>
                    </View>
                  ) : schoolCharts.length === 0 ? (
                    <View style={[styles.emptyContainer, { backgroundColor: theme.card, padding: 20, borderRadius: 8, margin: 10, alignItems: 'center' }]}>
                      <Ionicons name="stats-chart" size={48} color={theme.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                      <Text style={[styles.emptyText, { color: theme.text, textAlign: 'center' }]}>
                        Nenhum gráfico cadastrado
                      </Text>
                      <Text style={[styles.emptySubtext, { color: theme.text, opacity: 0.7, textAlign: 'center', marginTop: 5 }]}>
                        Os administradores podem adicionar gráficos no painel administrativo
                      </Text>
                    </View>
                  ) : (
                    schoolCharts.map((chart) => {
                      const chartSchools = schoolsByChartId.get(chart.id) || [];
                      return (
                        <View key={chart.id} style={[styles.chartContainer, { backgroundColor: theme.card, borderRadius: 8, padding: 15, margin: 10, elevation: 2 }]}>
                          {chart.creator_profile ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: theme.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 8,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: theme.border
                              }}>
                                <OptimizedImage
                                  source={chart.creator_profile.profile_image_url}
                                  style={{ width: '100%', height: '100%' }}
                                  fallbackIcon="person-circle-outline"
                                  fallbackSize={18}
                                />
                              </View>
                              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                                {chart.creator_profile.username ? `@${chart.creator_profile.username}` : (chart.creator_profile.full_name || 'Admin')}
                              </Text>
                            </View>
                          ) : null}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={[styles.chartTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}>
                                {chart.name}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="school" size={16} color={theme.icon} style={{ marginRight: 5 }} />
                              <Text style={{ color: theme.text, opacity: 0.8 }}>
                                {chartSchools.length} {chartSchools.length === 1 ? 'escola' : 'escolas'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.chartContent}>
                            {renderSchoolBars(chartSchools, chart.creator_profile, chart)}
                          </View>
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                            <Text style={{ color: theme.text, opacity: 0.8, textAlign: 'center' }}>
                              Média: <Text style={{ fontWeight: 'bold' }}>{getAveragePerformance(chart.id)}%</Text>
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Estatísticas Gerais */}
                  <View style={styles.personalStatsContainer}>
                    <Text style={[styles.statsTitle, { color: theme.text }]}>Estatísticas Gerais</Text>
                    <View style={styles.statItem}>
                      <Ionicons name="school" size={32} color={theme.icon} />
                      <Text style={[styles.statNumber, { color: theme.text }]}>{schoolCharts.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.text }]}>Gráficos Cadastrados</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="trending-up" size={32} color={theme.icon} />
                      <Text style={[styles.statNumber, { color: theme.text }]}>{getAveragePerformance()}%</Text>
                      <Text style={[styles.statLabel, { color: theme.text }]}>Média de Desempenho</Text>
                    </View>
                  </View>

                  {/* Seção 'Minha Estatística Pessoal' removida a pedido do usuário */}
                </>
              )}

              {activeTab === 'Individual' && (
                <View style={styles.personalStatsContainer}>
                  <Text style={[styles.statsTitle, { color: theme.text, marginBottom: 16 }]}>
                    Gráficos de Rendimento das Escolas
                  </Text>
                  
                  {loading ? (
                    <View style={[styles.loadingContainer, { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }]}>
                      <ActivityIndicator size="large" color={theme.primary} />
                      <Text style={[styles.loadingText, { color: theme.text, marginTop: 10 }]}>
                        Carregando dados das escolas...
                      </Text>
                    </View>
                  ) : error ? (
                    <View style={[styles.errorContainer, { backgroundColor: theme.card, padding: 20, borderRadius: 8, margin: 10 }]}>
                      <Text style={[styles.errorText, { color: 'red' }]}>
                        Erro ao carregar dados: {error}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 10, padding: 10, borderRadius: 5 }]}
                        onPress={onRefresh}
                      >
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Tentar novamente</Text>
                      </TouchableOpacity>
                    </View>
                  ) : schoolCharts.length === 0 ? (
                    <View style={[styles.emptyContainer, { backgroundColor: theme.card, padding: 20, borderRadius: 8, margin: 10, alignItems: 'center' }]}>
                      <Ionicons name="school-outline" size={48} color={theme.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                      <Text style={[styles.emptyText, { color: theme.text, textAlign: 'center' }]}>
                        Nenhum gráfico de escolas cadastrado
                      </Text>
                      <Text style={[styles.emptySubtext, { color: theme.text, opacity: 0.7, textAlign: 'center', marginTop: 5 }]}>
                        Os administradores podem adicionar gráficos no painel administrativo
                      </Text>
                    </View>
                  ) : (
                    schoolCharts.map((chart) => {
                      const chartSchools = schoolsByChartId.get(chart.id) || [];
                      
                      return (
                        <View key={chart.id} style={[styles.chartSection, { 
                          backgroundColor: theme.card, 
                          borderRadius: 8, 
                          padding: 15, 
                          margin: 10, 
                          elevation: 2,
                          borderWidth: 1,
                          borderColor: theme.border
                        }]}>
                          {chart.creator_profile ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: theme.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 8,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: theme.border
                              }}>
                                <OptimizedImage
                                  source={chart.creator_profile.profile_image_url}
                                  style={{ width: '100%', height: '100%' }}
                                  fallbackIcon="person-circle-outline"
                                  fallbackSize={18}
                                />
                              </View>
                              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                                {chart.creator_profile.username ? `@${chart.creator_profile.username}` : (chart.creator_profile.full_name || 'Admin')}
                              </Text>
                            </View>
                          ) : null}
                          <Text style={[styles.chartTitle, { 
                            color: theme.text, 
                            fontSize: 18, 
                            fontWeight: 'bold',
                            marginBottom: 15
                          }]}>
                            {chart.name}
                          </Text>
                          
                          {chartSchools.length === 0 ? (
                            <View style={[styles.emptyChart, { padding: 15 }]}>
                              <Ionicons name="school-outline" size={32} color={theme.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                              <Text style={[styles.emptyChartText, { 
                                color: theme.text, 
                                opacity: 0.7,
                                textAlign: 'center'
                              }]}>
                                Nenhuma escola cadastrada neste gráfico
                              </Text>
                            </View>
                          ) : (
                            chartSchools.map((school) => {
                              // Calcular a média de desempenho se não estiver disponível
                              const performance = school.performance || calculateAveragePerformance(school.rendimentoData);
                              
                              return (
                                <TouchableOpacity 
                                  key={school.id}
                                  style={[styles.schoolItem, { 
                                    borderColor: theme.border,
                                    backgroundColor: theme.surface,
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 10,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }]}
                                  onPress={async () => {
                                    // Carregar dados de rendimento se necessário
                                    if (!school.rendimentoData) {
                                      try {
                                        const rendimentoData = await getSchoolRendimento(school.id);
                                        setSelectedSchool({
                                          ...school,
                                          rendimentoData
                                        });
                                      } catch (error) {
                                        console.error('Erro ao carregar rendimento:', error);
                                        setSelectedSchool(school); // Mostrar mesmo sem dados de rendimento
                                      }
                                    } else {
                                      setSelectedSchool(school);
                                    }
                                    setShowRendimentoModal(true);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.schoolInfo}>
                                    <Text style={[{
                                      fontSize: 16,
                                      fontWeight: '600',
                                      color: theme.text,
                                      marginBottom: 4
                                    }]}>
                                      {school.name}
                                    </Text>
                                    <View style={[styles.performanceContainer, { 
                                      flexDirection: 'row',
                                      alignItems: 'center'
                                    }]}>
                                      <Text style={[{
                                        fontSize: 13,
                                        color: theme.text,
                                        opacity: 0.8,
                                        marginRight: 6
                                      }]}>
                                        Desempenho:
                                      </Text>
                                      <View style={[{
                                        backgroundColor: theme.primary,
                                        borderRadius: 12,
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        minWidth: 50,
                                        alignItems: 'center'
                                      }]}>
                                        <Text style={[{
                                          color: '#fff',
                                          fontSize: 13,
                                          fontWeight: 'bold'
                                        }]}>
                                          {Math.round(performance)}%
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                  <Ionicons 
                                    name="chevron-forward" 
                                    size={20} 
                                    color={theme.text} 
                                    style={{ opacity: 0.6 }}
                                  />
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>
                      );
                    })
                  )}
                  
                  {/* Modal de exibição de rendimento */}
                  <SchoolRendimentoDisplayModal
                    visible={showRendimentoModal}
                    onClose={() => setShowRendimentoModal(false)}
                    school={selectedSchool}
                    rendimentoData={selectedSchool?.rendimentoData}
                  />
                </View>
              )}

              {activeTab === 'Pessoal' && (
                <View style={styles.personalStatsContainer}>
                  <Text style={[styles.statsTitle, { color: theme.text, marginBottom: 20 }]}>
                    🎯 Meu Caminho de Evolução
                  </Text>
                  
                  {/* Card do Nível Atual */}
                  <View style={[styles.levelCard, { 
                    backgroundColor: theme.card, 
                    borderColor: theme.border,
                    shadowColor: userLevel.color,
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 8,
                  }]}>
                    <View style={[styles.levelGradient, { backgroundColor: userLevel.color }]}>
                      <View style={styles.levelHeader}>
                        <View style={[styles.levelIcon, { 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          shadowColor: '#000',
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 4 },
                          elevation: 6,
                        }]}>
                          <Ionicons name={userLevel.icon} size={32} color="#fff" />
                        </View>
                        <View style={styles.levelInfo}>
                          <Text style={[styles.levelName, { color: '#fff' }]}>
                            {userLevel.name}
                          </Text>
                          <Text style={[styles.levelXP, { color: 'rgba(255,255,255,0.9)' }]}>
                            {unlockedAchievements.length} Conquistas
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Barra de Progresso */}
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { 
                        backgroundColor: theme.border,
                        shadowColor: '#000',
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }]}>
                        <Animated.View 
                          style={[
                            styles.progressFill, 
                            { 
                              backgroundColor: userLevel.color,
                              width: `${getProgressToNextLevel() * 100}%`,
                              shadowColor: userLevel.color,
                              shadowOpacity: 0.6,
                              shadowRadius: 6,
                              shadowOffset: { width: 0, height: 2 },
                              elevation: 4,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: theme.text }]}>
                        {Math.round(getProgressToNextLevel() * 100)}% para o próximo nível
                      </Text>
                    </View>
                  </View>

                  {/* Caminho das Conquistas */}
                  <View style={styles.achievementsSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        🏆 Caminho das Conquistas
                      </Text>
                      <View style={[styles.achievementCounter, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.achievementCounterText, { color: '#fff' }]}>
                          {unlockedAchievements.length}/{achievementPath.length}
                        </Text>
                      </View>
                    </View>
                    
                    {renderAchievementPath()}
                  </View>


                </View>
              )}

              {activeTab === 'Eventos' && (
                <View style={styles.eventsContainer}>
                  <Text style={[styles.statsTitle, { color: theme.text, marginBottom: 16 }]}>🎯 Eventos e Atividades</Text>

                  {/* Participar de Quiz */}
                  <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 16 }]}>
                    <View style={styles.eventHeader}>
                      <Ionicons name="help-circle" size={32} color={theme.icon} />
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: theme.text }]}>Participar de Quiz</Text>
                        <Text style={[styles.eventDescription, { color: theme.text }]}>
                          Entre em uma sala de quiz disponível ou pesquise por código
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.quizSearchContainer}>
                      <TextInput
                        style={[styles.quizSearchInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                        placeholder="Digite o código da sala"
                        placeholderTextColor={theme.text}
                        value={searchRoomCode}
                        onChangeText={setSearchRoomCode}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: theme.icon }]}
                        onPress={searchQuizRooms}
                      >
                        <Ionicons name="search" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.eventButton, { backgroundColor: theme.icon, marginTop: 12 }]}
                      onPress={loadAvailableRooms}
                    >
                      <Ionicons name="refresh" size={20} color="#fff" />
                      <Text style={[styles.eventButtonText, { color: '#fff', marginLeft: 8 }]}>
                        Atualizar Salas Disponíveis
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Lista de Salas Disponíveis */}
                  {loadingRooms ? (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                      <ActivityIndicator size="large" color={theme.icon} />
                      <Text style={{ color: theme.text, marginTop: 10 }}>Carregando salas...</Text>
                    </View>
                  ) : quizRooms.length === 0 ? (
                    <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.eventDescription, { color: theme.text, textAlign: 'center' }]}>
                        Nenhuma sala disponível no momento
                      </Text>
                    </View>
                  ) : (
                    quizRooms.map((room) => (
                      <View key={room.id} style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.roomHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.roomCode, { color: theme.text }]}>Código: {room.room_code}</Text>
                            <Text style={[styles.roomQuizName, { color: theme.text, opacity: 0.8 }]}>
                              {room.quiz?.name || 'Quiz'}
                            </Text>
                            <Text style={[styles.roomSubject, { color: theme.text, opacity: 0.7, fontSize: 12 }]}>
                              Matéria: {room.quiz?.subject || 'N/A'}
                            </Text>
                            {room.max_participants > 0 && (
                              <Text style={[styles.roomSubject, { color: theme.text, opacity: 0.6, fontSize: 11 }]}>
                                {room.currentParticipants || 0} / {room.max_participants} participantes
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.joinButton,
                              {
                                backgroundColor: room.isFull ? theme.border : theme.icon,
                                opacity: room.isFull ? 0.5 : 1
                              }
                            ]}
                            onPress={() => joinQuizRoom(room)}
                            disabled={room.isFull}
                          >
                            <Ionicons name={room.isFull ? "lock-closed" : "enter"} size={20} color="#fff" />
                            <Text style={[styles.joinButtonText, { color: '#fff', marginLeft: 4 }]}>
                              {room.isFull ? 'Cheia' : 'Entrar'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {/* Outros eventos */}
                  <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.eventHeader}>
                      <Ionicons name="calendar" size={32} color={theme.icon} />
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: theme.text }]}>Próximos Eventos</Text>
                        <Text style={[styles.eventDescription, { color: theme.text }]}>
                          Fique atento aos próximos eventos educacionais
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.eventActions}>
                      <TouchableOpacity
                        style={[styles.eventButton, { backgroundColor: '#6b7280' }]}
                        onPress={() => setCurrentScreen('eventsComingSoon')}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#fff" />
                        <Text style={[styles.eventButtonText, { color: '#fff' }]}>
                          Ver Roteiro
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}



            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
        
        {/* Notificação de Conquista Melhorada */}
        {showAchievement && newAchievement && (
          <Animated.View 
            style={[
              styles.achievementNotification,
              {
                opacity: achievementAnim,
                transform: [{
                  translateY: achievementAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                }],
              }
            ]}
          >
            <View style={[styles.achievementNotificationContent, { backgroundColor: newAchievement.color || '#3B82F6' }]}>
              <View style={[styles.achievementNotificationIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}> 
                <Ionicons name={newAchievement.icon} size={24} color="#fff" />
              </View>
              <View style={styles.achievementNotificationText}>
                <Text style={styles.achievementNotificationTitle}>🎉 Conquista Desbloqueada!</Text>
                <Text style={styles.achievementNotificationDescription}>{newAchievement.title}</Text>
                <Text style={styles.achievementNotificationXP}>Nova Conquista!</Text>
              </View>
            </View>
          </Animated.View>
        )}
        
        {/* Áreas laterais transparentes para aumentar a área sensível ao toque */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32 }} />
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32 }} />
      </View>
      
      {/* Modal de Exibição de Rendimento */}
      <SchoolRendimentoDisplayModal
        visible={showRendimentoModal}
        onClose={() => setShowRendimentoModal(false)}
        school={selectedSchool}
        rendimentoData={selectedSchool ? getSchoolRendimento(selectedSchool.id) : null}
      />
    </View>
  );
};

// Componente auxiliar para exibir os gráficos de todas as escolas

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 20,
    width: '100%',
  },
  chartContainer: {
    width: '90%',
    marginBottom: 30,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chartArea: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    minHeight: 300,
    justifyContent: 'center',
  },
  chartContent: {
    width: '100%',
    marginBottom: 20
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    height: 200,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 30,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  barValue: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  statsContainer: {
    width: '90%',
    marginBottom: 30,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsArea: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },

  personalStatsContainer: {
    width: '95%',
    maxWidth: 450,
    marginBottom: 30,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: 'transparent',
  },
  eventsContainer: {
    width: '95%',
    maxWidth: 450,
    marginBottom: 30,
    alignSelf: 'center',
  },
  eventCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  eventButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalLine: {
    height: 1,
    backgroundColor: '#DDD',
    marginBottom: 20,
  },
  // Estilos para o sistema de evolução
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  achievementCard: {
    width: '49%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 130,
  },
  achievementCardLeft: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
    marginLeft: 0,
    transform: [{ translateX: 0 }],
  },
  achievementCardRight: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginRight: 0,
    transform: [{ translateX: 0 }],
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementHeaderLeft: {
    flexDirection: 'row',
  },
  achievementHeaderRight: {
    flexDirection: 'row-reverse',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementInfoLeft: {
    marginLeft: 16,
    marginRight: 0,
    alignItems: 'flex-start',
  },
  achievementInfoRight: {
    marginRight: 16,
    marginLeft: 0,
    alignItems: 'flex-end',
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'left',
  },
  achievementDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    textAlign: 'left',
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementFooterLeft: {
    flexDirection: 'row',
  },
  achievementFooterRight: {
    flexDirection: 'row-reverse',
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  achievementXP: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  unlockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalStatsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  achievementNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  achievementNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  achievementNotificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementNotificationText: {
    flex: 1,
  },
  achievementNotificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementNotificationDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4,
  },
  achievementNotificationXP: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  
  // Novos estilos para o sistema de evolução
  levelCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  levelGradient: {
    padding: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  levelXP: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  progressContainer: {
    padding: 20,
    paddingTop: 0,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  achievementsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  achievementCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  achievementCounterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Estilos para o caminho das conquistas
  achievementPathContainer: {
    marginTop: 16,
  },
  achievementPathItem: {
    marginBottom: 16,
    alignItems: 'center',
  },
  achievementPathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementPathIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementPathInfo: {
    flex: 1,
  },
  achievementPathTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementPathDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  achievementPathLine: {
    width: 2,
    height: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  newAchievementBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emptyStatsText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    marginTop: 20,
    fontStyle: 'italic',
  },
  // Novos estilos para a lista de escolas no gráfico
  chartSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyChartText: {
    fontSize: 15,
    opacity: 0.7,
  },
  schoolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  performanceLabel: {
    fontSize: 13,
    opacity: 0.8,
  },
  performanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  performanceValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Estilos para Quiz
  quizSearchContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  quizSearchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    fontSize: 16,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomCode: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roomQuizName: {
    fontSize: 16,
    marginBottom: 4,
  },
  roomSubject: {
    fontSize: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StatisticsScreen; 
