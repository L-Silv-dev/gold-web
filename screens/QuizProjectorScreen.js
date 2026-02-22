import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');

const QuizProjectorScreen = ({ route, navigation }) => {
  const { theme } = useThemeContext();
  const { roomId, roomCode } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  const participantsSubscription = useRef(null);

  useEffect(() => {
    loadRoomData();
    
    return () => {
      if (participantsSubscription.current) {
        supabase.removeChannel(participantsSubscription.current);
      }
    };
  }, []);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('quiz_rooms')
        .select(`
          id,
          room_code,
          status,
          quiz:quizzes (
            id,
            name,
            subject
          )
        `)
        .eq('is_active', true);

      if (roomId) {
        query = query.eq('id', roomId);
      } else if (roomCode) {
        query = query.eq('room_code', roomCode);
      } else {
        throw new Error('ID ou Código da sala não fornecido');
      }

      const { data, error } = await query.single();
      
      if (error) throw error;
      
      setRoomData(data);
      
      // Carregar total de perguntas
      if (data?.quiz?.id) {
        const { count, error: qError } = await supabase
          .from('quiz_questions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', data.quiz.id);
          
        if (!qError) setTotalQuestions(count || 0);
      }

      // Carregar participantes iniciais
      loadParticipants(data.id);
      
      // Iniciar subscrição Realtime
      subscribeToParticipants(data.id);
      
    } catch (error) {
      console.error('Erro ao carregar sala:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da sala.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (id) => {
    try {
      // 1. Buscar participantes
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('user_id, current_progress, current_score')
        .eq('room_id', id)
        .order('current_score', { ascending: false });

      if (participantsError) throw participantsError;

      if (!participantsData || participantsData.length === 0) {
        setParticipants([]);
        return;
      }

      // 2. Buscar nomes dos perfis
      const userIds = participantsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);
      
      if (profilesError) {
        console.warn('Erro ao buscar perfis:', profilesError);
      }

      // 3. Combinar dados
      const combinedData = participantsData.map(participant => ({
        ...participant,
        profiles: profilesData?.find(profile => profile.id === participant.user_id) || null
      }));
      
      setParticipants(formatParticipants(combinedData));
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
    }
  };

  const formatParticipants = (data) => {
    return data.map(p => ({
      userId: p.user_id,
      name: p.profiles?.full_name || p.profiles?.username || 'Usuário',
      progress: p.current_progress || 0,
      score: p.current_score || 0
    })).sort((a, b) => b.score - a.score); // Ordenar por pontuação
  };

  const subscribeToParticipants = (id) => {
    participantsSubscription.current = supabase
      .channel('public:quiz_participants')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_participants',
        filter: `room_id=eq.${id}` 
      }, () => {
        // Recarregar tudo quando houver mudança (simplificado)
        // Idealmente atualizaríamos apenas o item alterado, mas recarregar garante consistência
        loadParticipants(id);
      })
      .subscribe();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Carregando Projetor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho Grande para Projetor */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.roomCodeLabel, { color: theme.text }]}>CÓDIGO DA SALA</Text>
          <Text style={[styles.roomCode, { color: theme.primary }]}>{roomData?.room_code}</Text>
        </View>
        
        <View style={styles.quizInfo}>
          <Text style={[styles.quizName, { color: theme.text }]}>{roomData?.quiz?.name}</Text>
          <Text style={[styles.participantCount, { color: theme.text }]}>
            {participants.length} Participantes
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ranking em Tempo Real</Text>
        
        {participants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.text }]}>Aguardando participantes entrarem...</Text>
          </View>
        ) : (
          participants.map((participant, index) => {
            const progressPercent = totalQuestions > 0 ? (participant.progress / totalQuestions) * 100 : 0;
            const isFinished = participant.progress === totalQuestions && totalQuestions > 0;
            
            return (
              <View key={participant.userId} style={[styles.participantCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}º</Text>
                </View>
                
                <View style={styles.participantInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.participantName, { color: theme.text }]}>{participant.name}</Text>
                    <Text style={[styles.scoreText, { color: theme.primary }]}>{participant.score} acertos</Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBarBackground, { backgroundColor: theme.border }]}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${progressPercent}%`,
                            backgroundColor: isFinished ? '#4CAF50' : theme.primary 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme.text }]}>
                      {participant.progress} / {totalQuestions}
                    </Text>
                  </View>
                </View>
                
                {isFinished && (
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" style={{ marginLeft: 10 }} />
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 10,
  },
  headerInfo: {
    alignItems: 'center',
  },
  roomCodeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.7,
    letterSpacing: 1,
  },
  roomCode: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  quizInfo: {
    alignItems: 'flex-end',
  },
  quizName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantCount: {
    fontSize: 16,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 20,
    opacity: 0.6,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  participantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default QuizProjectorScreen;
