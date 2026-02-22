import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const QuizScreen = ({ route, navigation }) => {
  const { theme } = useThemeContext();
  const { user } = useAuth();
  const { roomId, roomCode } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [quizResults, setQuizResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  
  const timerRef = useRef(null);
  const statusCheckRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Carregar dados do quiz
  useEffect(() => {
    loadQuizData();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (statusCheckRef.current) {
        clearInterval(statusCheckRef.current);
      }
    };
  }, []);

  // Verificar status da sala periodicamente quando em espera
  useEffect(() => {
    if (roomStatus === 'waiting' && quizData?.room?.id) {
      statusCheckRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('quiz_rooms')
            .select('status, quiz_id, quiz:quizzes(id, name, subject)')
            .eq('id', quizData.room.id)
            .single();
          
          if (!error && data) {
            if (data.status === 'started' && roomStatus === 'waiting') {
              setRoomStatus('started');
              // Carregar perguntas quando iniciar
              loadQuestions(data.quiz_id);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 2000); // Verificar a cada 2 segundos

      return () => {
        if (statusCheckRef.current) {
          clearInterval(statusCheckRef.current);
        }
      };
    }
  }, [roomStatus, quizData]);

  // Timer para cada pergunta - otimizado (só quando status = started)
  useEffect(() => {
    if (roomStatus === 'started' && quizData?.questions && !showResults && currentQuestionIndex < quizData.questions.length && !hasAnswered) {
      const currentQuestion = quizData.questions[currentQuestionIndex];
      const questionTime = currentQuestion.time_per_question || 0;
      setTimeLeft(questionTime);

      // Se tempo for 0, não iniciar timer
      if (questionTime <= 0) {
        return;
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAnswerSelection(null); // Timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [currentQuestionIndex, quizData, showResults, roomStatus, hasAnswered]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados da sala e do quiz em uma única query otimizada
      let roomData, roomError;
      
      if (roomId) {
        const result = await supabase
          .from('quiz_rooms')
          .select(`
            id,
            quiz_id,
            status,
            max_participants,
            quiz:quizzes!inner(
              id,
              name,
              subject
            )
          `)
          .eq('id', roomId)
          .eq('is_active', true)
          .single();
        roomData = result.data;
        roomError = result.error;
      } else if (roomCode) {
        const result = await supabase
          .from('quiz_rooms')
          .select(`
            id,
            quiz_id,
            status,
            max_participants,
            quiz:quizzes!inner(
              id,
              name,
              subject
            )
          `)
          .eq('room_code', roomCode.toUpperCase())
          .eq('is_active', true)
          .single();
        roomData = result.data;
        roomError = result.error;
      } else {
        throw new Error('roomId ou roomCode é obrigatório');
      }

      if (roomError) throw roomError;
      if (!roomData) {
        Alert.alert('Erro', 'Sala não encontrada ou inativa.');
        navigation.goBack();
        return;
      }

      // Verificar se sala já iniciou
      if (roomData.status === 'started') {
        Alert.alert('Aviso', 'Este quiz já foi iniciado. Você não pode mais entrar.');
        navigation.goBack();
        return;
      }

      if (roomData.status === 'finished') {
        Alert.alert('Aviso', 'Este quiz já foi finalizado.');
        navigation.goBack();
        return;
      }

      // Verificar limite de participantes ANTES de adicionar
      if (user?.id && roomData.max_participants > 0) {
        const { count, error: countError } = await supabase
          .from('quiz_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomData.id);
        
        if (!countError && count >= roomData.max_participants) {
          Alert.alert(
            'Sala Cheia', 
            `Esta sala atingiu o limite máximo de ${roomData.max_participants} participante${roomData.max_participants !== 1 ? 's' : ''}.`
          );
          navigation.goBack();
          return;
        }
      }

      // Adicionar participante (só se passou na validação acima)
      if (user?.id) {
        // Verificar novamente antes de inserir (race condition protection)
        if (roomData.max_participants > 0) {
          const { count: finalCount, error: finalCountError } = await supabase
            .from('quiz_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', roomData.id);
          
          if (!finalCountError && finalCount >= roomData.max_participants) {
            Alert.alert(
              'Sala Cheia', 
              `Esta sala atingiu o limite máximo de ${roomData.max_participants} participante${roomData.max_participants !== 1 ? 's' : ''}.`
            );
            navigation.goBack();
            return;
          }
        }

        const { error: participantError } = await supabase
          .from('quiz_participants')
          .upsert({
            room_id: roomData.id,
            user_id: user.id
          }, {
            onConflict: 'room_id,user_id'
          });
        
        if (participantError) {
          console.error('Erro ao adicionar participante:', participantError);
          // Se o erro for de limite, mostrar mensagem apropriada
          if (participantError.message?.includes('limit') || participantError.code === '23505') {
            Alert.alert('Erro', 'Não foi possível entrar na sala. Tente novamente.');
          }
        }
      }

      setRoomStatus(roomData.status || 'waiting');
      setQuizData({
        room: roomData,
        quiz: roomData.quiz,
        questions: [] // Será carregado quando iniciar
      });

      // Se já estiver iniciado, carregar perguntas
      if (roomData.status === 'started') {
        loadQuestions(roomData.quiz_id);
      } else {
        // Carregar lista de participantes
        loadParticipants(roomData.id);
      }
    } catch (error) {
      console.error('Erro ao carregar quiz:', error);
      Alert.alert('Erro', 'Não foi possível carregar o quiz.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (quizId) => {
    if (!quizId) return;

    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_per_question')
        .eq('quiz_id', quizId)
        .order('question_order', { ascending: true });

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        Alert.alert('Erro', 'Este quiz não possui perguntas.');
        navigation.goBack();
        return;
      }

      setQuizData(prev => ({
        ...prev,
        questions: questionsData
      }));
      
      setTimeLeft(questionsData[0]?.time_per_question || 0);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    }
  };

  const loadParticipants = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('quiz_participants')
        .select(`
          user_id,
          joined_at
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
      
      if (!error && data) {
        // Buscar nomes dos participantes
        const userIds = data.map(p => p.user_id);
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);
          
          const participantsWithNames = data.map(participant => ({
            ...participant,
            profile: profilesData?.find(p => p.id === participant.user_id) || null
          }));
          
          setParticipants(participantsWithNames);
        } else {
          setParticipants(data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
    }
  };

  const loadRanking = async () => {
    if (!quizData?.room?.id) return;

    try {
      setLoadingRanking(true);
      
      // 1. Buscar resultados
      const { data: resultsData, error: resultsError } = await supabase
        .from('quiz_results')
        .select('score, time_taken, user_id')
        .eq('room_id', quizData.room.id)
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true });

      if (resultsError) throw resultsError;

      if (!resultsData || resultsData.length === 0) {
        setRanking([]);
        return;
      }

      // 2. Buscar perfis dos usuários
      const userIds = resultsData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        // Continua mesmo sem perfis, mostrando IDs ou fallback
      }

      // 3. Combinar dados
      const rankingWithProfiles = resultsData.map(result => ({
        ...result,
        profile: profilesData?.find(p => p.id === result.user_id) || null
      }));

      setRanking(rankingWithProfiles);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoadingRanking(false);
    }
  };

  // Atualizar lista de participantes periodicamente quando em espera
  useEffect(() => {
    if (roomStatus === 'waiting' && quizData?.room?.id) {
      const participantsInterval = setInterval(() => {
        loadParticipants(quizData.room.id);
      }, 3000); // Atualizar a cada 3 segundos

      return () => clearInterval(participantsInterval);
    }
  }, [roomStatus, quizData]);

  useEffect(() => {
    if (showResults) {
      loadRanking();
      
      const rankingInterval = setInterval(() => {
        loadRanking();
      }, 5000); // Atualizar a cada 5 segundos

      return () => clearInterval(rankingInterval);
    }
  }, [showResults]);

  const handleAnswerSelection = useCallback((answer) => {
    if (hasAnswered || !quizData) return;

    const currentQuestion = quizData.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Parar timer imediatamente
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setHasAnswered(true);
    if (answer) setSelectedAnswer(answer);

    const isCorrect = answer === currentQuestion.correct_answer.toLowerCase();
    const questionTime = currentQuestion.time_per_question || 0;
    const timeSpent = Math.max(0, questionTime - timeLeft);

    const newResult = {
      questionId: currentQuestion.id,
      answer: answer || null,
      isCorrect,
      timeSpent
    };

    setQuizResults(prev => {
      const updatedResults = [...prev, newResult];
      
      // Atualizar progresso em background para o modo projetor
      if (user?.id && quizData?.room?.id) {
        const correctCount = updatedResults.filter(r => r.isCorrect).length;
        supabase
          .from('quiz_participants')
          .update({
            current_progress: updatedResults.length,
            current_score: correctCount,
            last_updated: new Date().toISOString()
          })
          .eq('room_id', quizData.room.id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.error('Erro ao atualizar progresso:', error);
          });
      }
      
      return updatedResults;
    });
  }, [hasAnswered, quizData, currentQuestionIndex, timeLeft, user]);

  const handleNextQuestion = useCallback(() => {
    if (isSubmitting || !quizData) return;
    
    setIsSubmitting(true);

    // Animação
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Próxima pergunta ou finalizar
    if (currentQuestionIndex < quizData.questions.length - 1) {
      requestAnimationFrame(() => {
        const nextQuestion = quizData.questions[currentQuestionIndex + 1];
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setTimeLeft(nextQuestion.time_per_question || 0);
        setIsSubmitting(false);
      });
    } else {
      // Finalizar quiz
      handleQuizComplete(quizResults);
    }
  }, [currentQuestionIndex, quizData, isSubmitting, fadeAnim, quizResults]);

  const handleQuizComplete = async (finalResults) => {
    if (!quizData || !user?.id) return;

    // Mostrar resultados imediatamente (feedback visual rápido)
    setShowResults(true);
    setIsSubmitting(false);

    // Salvar resultado em background (não bloquear UI)
    (async () => {
      try {
        const totalQuestions = quizData.questions.length;
        const correctAnswers = finalResults.filter(r => r.isCorrect).length;
        const score = (correctAnswers / totalQuestions) * 100;
        const totalTime = finalResults.reduce((sum, r) => sum + r.timeSpent, 0);

        const answersObj = {};
        finalResults.forEach((result) => {
          answersObj[result.questionId] = result.answer || null;
        });

        // Usar upsert diretamente (mais rápido)
        const { error } = await supabase
          .from('quiz_results')
          .upsert({
            room_id: quizData.room.id,
            user_id: user.id,
            quiz_id: quizData.quiz.id,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            score: score,
            time_taken: totalTime,
            answers: answersObj,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'room_id,user_id'
          });

        if (error) {
          console.error('Erro ao salvar resultado:', error);
          // Não mostrar alerta para não interromper a experiência
        }
      } catch (error) {
        console.error('Erro ao salvar resultado:', error);
      }
    })();
  };

  const handleExit = () => {
    Alert.alert(
      'Sair do Quiz',
      'Tem certeza que deseja sair? Seu progresso será perdido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.icon} />
        <Text style={[styles.loadingText, { color: theme.text, marginTop: 16 }]}>
          Carregando quiz...
        </Text>
      </View>
    );
  }

  if (!quizData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Erro ao carregar quiz</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.icon, marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: '#fff' }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Tela de espera
  if (roomStatus === 'waiting') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleExit} style={styles.backIcon}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.quizTitle, { color: theme.text }]} numberOfLines={1}>
              {quizData?.quiz?.name || 'Quiz'}
            </Text>
            <Text style={[styles.quizSubject, { color: theme.text, opacity: 0.7 }]} numberOfLines={1}>
              {quizData?.quiz?.subject || ''}
            </Text>
          </View>
        </View>

        <View style={styles.waitingContainer}>
          <View style={[styles.waitingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="hourglass-outline" size={64} color={theme.icon} />
            <Text style={[styles.waitingTitle, { color: theme.text }]}>Aguardando Início</Text>
            <Text style={[styles.waitingText, { color: theme.text, opacity: 0.7 }]}>
              O professor ainda não iniciou o quiz.{'\n'}
              Aguarde enquanto outros participantes entram...
            </Text>

            <View style={[styles.participantsList, { backgroundColor: theme.background, marginTop: 24 }]}>
              <Text style={[styles.participantsTitle, { color: theme.text }]}>
                Participantes ({participants.length}
                {quizData?.room?.max_participants > 0 ? ` / ${quizData.room.max_participants}` : ''})
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {participants.map((participant, index) => (
                  <View key={participant.user_id || index} style={styles.participantItem}>
                    <Ionicons name="person-circle-outline" size={24} color={theme.icon} />
                    <Text style={[styles.participantName, { color: theme.text }]}>
                      {participant.profile?.full_name || participant.profile?.username || 'Participante'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (showResults) {
    const correctAnswers = quizResults.filter(r => r.isCorrect).length;
    const totalQuestions = quizData?.questions?.length || 0;
    const myScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const top3 = ranking.slice(0, 3);
    const others = ranking.slice(3);

    const renderPodiumItem = (item, position) => {
      if (!item) return <View style={styles.podiumPlaceHolder} />;
      
      const isMe = item.user_id === user?.id;
      const height = position === 1 ? 140 : position === 2 ? 110 : 90;
      const color = position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32';
      const scale = position === 1 ? 1.1 : 1;

      return (
        <View style={[styles.podiumItem, { transform: [{ scale }] }]}>
          <View style={styles.podiumAvatarContainer}>
            <Ionicons name="person-circle" size={50} color={theme.icon} />
            <View style={[styles.podiumBadge, { backgroundColor: color }]}>
              <Text style={styles.podiumPosition}>{position}</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, { color: theme.text, fontWeight: isMe ? 'bold' : 'normal' }]} numberOfLines={1}>
            {item.profile?.full_name?.split(' ')[0] || item.profile?.username || 'Usuário'}
            {isMe && ' (Você)'}
          </Text>
          <Text style={[styles.podiumScore, { color: theme.icon }]}>{item.score}%</Text>
        </View>
      );
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.resultsContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[styles.resultsHeader, { marginTop: 20 }]}>
            <Text style={[styles.resultsTitle, { color: theme.text }]}>Resultado Final</Text>
            <Text style={[styles.resultsSubtitle, { color: theme.text, opacity: 0.7 }]}>
              Você acertou {correctAnswers} de {totalQuestions}
            </Text>
          </View>

          {/* Podium */}
          <View style={styles.podiumContainer}>
            <View style={[styles.podiumColumn, { marginTop: 30 }]}>
              {renderPodiumItem(ranking[1], 2)}
            </View>
            <View style={[styles.podiumColumn, { zIndex: 1 }]}>
              {renderPodiumItem(ranking[0], 1)}
            </View>
            <View style={[styles.podiumColumn, { marginTop: 50 }]}>
              {renderPodiumItem(ranking[2], 3)}
            </View>
          </View>

          {/* Lista dos demais */}
          {others.length > 0 && (
            <View style={[styles.rankingList, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.rankingTitle, { color: theme.text }]}>Classificação Geral</Text>
              {others.map((item, index) => {
                const isMe = item.user_id === user?.id;
                return (
                  <View key={index} style={[styles.rankingItem, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.rankingPosition, { color: theme.text }]}>{index + 4}º</Text>
                    <View style={styles.rankingInfo}>
                      <Text style={[styles.rankingName, { color: theme.text, fontWeight: isMe ? 'bold' : 'normal' }]}>
                        {item.profile?.full_name || item.profile?.username || 'Usuário'}
                        {isMe && ' (Você)'}
                      </Text>
                    </View>
                    <Text style={[styles.rankingScore, { color: theme.icon }]}>{item.score}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.icon, marginTop: 32, alignSelf: 'center' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: '#fff' }]}>Voltar para Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (!quizData?.questions || quizData.questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.icon} />
        <Text style={[styles.loadingText, { color: theme.text, marginTop: 16 }]}>
          Carregando perguntas...
        </Text>
      </View>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
  const isTimeLow = timeLeft <= 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleExit} style={styles.backIcon}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.quizTitle, { color: theme.text }]} numberOfLines={1}>
            {quizData.quiz?.name}
          </Text>
          <Text style={[styles.quizSubject, { color: theme.text, opacity: 0.7 }]} numberOfLines={1}>
            {quizData.quiz?.subject}
          </Text>
        </View>
        {timeLeft > 0 ? (
          <View style={[styles.timerContainer, { backgroundColor: isTimeLow ? '#FF4444' : theme.icon }]}>
            <Ionicons name="time-outline" size={18} color="#fff" />
            <Text style={[styles.timerText, { color: '#fff' }]}>{timeLeft}</Text>
          </View>
        ) : (
          <View style={[styles.timerContainer, { backgroundColor: theme.border, opacity: 0.5 }]}>
            <Ionicons name="infinite-outline" size={18} color={theme.text} />
            <Text style={[styles.timerText, { color: theme.text }]}>∞</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.icon }]} />
      </View>

      {/* Question Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.questionNumber, { color: theme.text, opacity: 0.7 }]}>
              Pergunta {currentQuestionIndex + 1} de {quizData.questions.length}
            </Text>
            <Text style={[styles.questionText, { color: theme.text }]}>
              {currentQuestion.question_text}
            </Text>

            {['a', 'b', 'c', 'd'].map((option) => {
              const optionText = currentQuestion[`option_${option}`];
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correct_answer.toLowerCase();
              
              let backgroundColor = theme.background;
              let borderColor = theme.border;
              let textColor = theme.text;
              let circleBorderColor = theme.text;
              let circleFillColor = 'transparent';

              if (hasAnswered) {
                if (isCorrect) {
                  backgroundColor = '#4CAF50'; // Verde para correta
                  borderColor = '#4CAF50';
                  textColor = '#fff';
                  circleBorderColor = '#fff';
                  circleFillColor = '#fff';
                } else if (isSelected) {
                  backgroundColor = '#F44336'; // Vermelho para errada selecionada
                  borderColor = '#F44336';
                  textColor = '#fff';
                  circleBorderColor = '#fff';
                  circleFillColor = '#fff';
                }
              } else if (isSelected) {
                backgroundColor = theme.icon;
                borderColor = theme.icon;
                textColor = '#fff';
                circleBorderColor = '#fff';
                circleFillColor = '#fff';
              }
              
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor,
                      borderColor,
                    }
                  ]}
                  onPress={() => !hasAnswered && handleAnswerSelection(option)}
                  disabled={hasAnswered || isSubmitting}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.optionCircle,
                    { borderColor: circleBorderColor }
                  ]}>
                    {(isSelected || (hasAnswered && isCorrect)) && (
                      <View style={[styles.optionCircleFill, { backgroundColor: circleFillColor }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.optionText,
                    { color: textColor }
                  ]}>
                    {option.toUpperCase()}. {optionText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: (hasAnswered && !isSubmitting) ? theme.icon : theme.border,
              opacity: (hasAnswered && !isSubmitting) ? 1 : 0.5
            }
          ]}
          onPress={handleNextQuestion}
          disabled={!hasAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.submitButtonText, { color: '#fff' }]}>
              {currentQuestionIndex < quizData.questions.length - 1 ? 'Próxima' : 'Finalizar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backIcon: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quizSubject: {
    fontSize: 14,
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  timerText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressBar: {
    height: '100%',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
  },
  questionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionNumber: {
    fontSize: 14,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCircleFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsCard: {
    margin: 20,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingCard: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  participantsList: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  participantName: {
    fontSize: 14,
    marginLeft: 12,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 30,
    marginTop: 20,
    height: 200,
  },
  podiumColumn: {
    alignItems: 'center',
    width: 100,
  },
  podiumItem: {
    alignItems: 'center',
  },
  podiumAvatarContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  podiumPosition: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  podiumName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  podiumPlaceHolder: {
    width: 100,
  },
  rankingList: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 16,
  },
  rankingScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QuizScreen;

