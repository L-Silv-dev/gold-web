import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, TouchableWithoutFeedback, ScrollView as RNScrollView, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSchoolContext } from '../contexts/SchoolContext';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import SchoolRendimentoModal from '../components/SchoolRendimentoModal';
import { useToast } from '../contexts/ToastContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';





const ADMIN_TAB_NAMES = ['Gerais', 'Individuais', 'Quiz', 'Livros'];

const AdminScreen = ({ onLogout, setCurrentScreen }) => {
  const navigation = useNavigation();
  const { theme } = useThemeContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    schoolCharts,
    addSchoolChart,
    deleteSchoolChart,
    addSchool,
    deleteSchool,
    updateSchoolPerformance,
    getAveragePerformance,
    getTotalSchools,
    updateChartName,
  } = useSchoolContext();
  const [newChartName, setNewChartName] = useState('');
  const [newSchoolNames, setNewSchoolNames] = useState({}); // { [chartId]: '' }
  const [selectedSchoolToDelete, setSelectedSchoolToDelete] = useState({}); // { [chartId]: schoolId }
  const [editingChartNames, setEditingChartNames] = useState({}); // { [chartId]: string }
  const [editingChartId, setEditingChartId] = useState(null);
  const [activeTab, setActiveTab] = useState('Gerais');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showRendimentoModal, setShowRendimentoModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  
  // Estados para criar quiz
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [quizName, setQuizName] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [questions, setQuestions] = useState([{
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'a',
    timePerQuestion: 0 // Permite começar com 0
  }]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizCreators, setQuizCreators] = useState({});
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookTopic, setBookTopic] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [pdfAsset, setPdfAsset] = useState(null);
  const [isCreatingBook, setIsCreatingBook] = useState(false);

  // Adicionar novo gráfico
  const addChartHandler = () => {
    if (newChartName.trim()) {
      addSchoolChart(newChartName.trim());
      setNewChartName('');
      showToast('Gráfico adicionado com sucesso!', 'success');
    } else {
      showToast('Digite o nome do gráfico', 'error');
    }
  };

  // Adicionar escola a um gráfico
  const addSchoolHandler = async (chartId) => {
    const name = newSchoolNames[chartId] || '';
    const chart = schoolCharts.find(c => c.id === chartId);
    if (!chart) return;
    if (chart.schools && chart.schools.length >= 5) {
      showToast('Só é possível cadastrar até 5 escolas por gráfico. Exclua uma para adicionar outra.', 'error');
      return;
    }
    if (name.trim()) {
      try {
        await addSchool(chartId, { name: name.trim() });
        setNewSchoolNames(prev => ({ ...prev, [chartId]: '' }));
        showToast('Escola adicionada com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao adicionar escola:', error);
        showToast('Não foi possível adicionar a escola. Tente novamente.', 'error');
      }
    } else {
      showToast('Digite o nome da escola', 'error');
    }
  };

  // Atualizar desempenho de uma escola
  const updatePerformanceHandler = (chartId, schoolId, newPerformance) => {
    if (newPerformance >= 0 && newPerformance <= 100) {
      updateSchoolPerformance(chartId, schoolId, parseInt(newPerformance));
    } else {
      showToast('A nota deve estar entre 0 e 100', 'error');
    }
  };

  // Remover escola de um gráfico
  const deleteSchoolHandler = (chartId, schoolId) => {
    if (selectedSchoolToDelete[chartId] === schoolId) {
      Alert.alert(
        'Confirmar exclusão',
        'Tem certeza que deseja excluir esta escola?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              deleteSchool(chartId, schoolId);
              setSelectedSchoolToDelete(prev => ({ ...prev, [chartId]: null }));
              showToast('Escola excluída com sucesso!', 'success');
            },
          },
        ]
      );
    } else {
      setSelectedSchoolToDelete(prev => ({ ...prev, [chartId]: schoolId }));
    }
  };

  // Remover gráfico
  const deleteChartHandler = (chartId) => {
    Alert.alert(
      'Remover gráfico',
      'Tem certeza que deseja remover este gráfico? Todas as escolas deste grupo serão excluídas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => deleteSchoolChart(chartId),
        },
      ]
    );
  };

  // Salvar novo nome do gráfico
  const saveChartName = (chartId) => {
    const newName = (editingChartNames[chartId] || '').trim();
    if (newName.length === 0) {
      showToast('O nome do gráfico não pode ser vazio.', 'error');
      return;
    }
    updateChartName(chartId, newName);
    setEditingChartId(null);
  };

  // Funções para gerenciar quizzes
  const loadQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, name, subject, created_by, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro na query de quizzes:', error);
        throw error;
      }
      
      console.log('Quizzes carregados:', data?.length || 0);
      setQuizzes(data || []);
      const creatorIds = Array.from(new Set((data || []).map(q => q.created_by).filter(Boolean)));
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_image_url')
          .in('id', creatorIds);
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p; });
        setQuizCreators(map);
      } else {
        setQuizCreators({});
      }
    } catch (error) {
      console.error('Erro ao carregar quizzes:', error);
      showToast('Não foi possível carregar os quizzes. Tente novamente.', 'error');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'Quiz') {
      loadQuizzes();
    }
    if (activeTab === 'Livros') {
      loadBooks();
    }
  }, [activeTab]);

  const loadBooks = async () => {
    setLoadingBooks(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, subject, topic, description, cover_url, pdf_url, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      setBooks([]);
      showToast('Não foi possível carregar os livros.', 'error');
    } finally {
      setLoadingBooks(false);
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPdfAsset(asset);
      }
    } catch (error) {
      showToast('Não foi possível selecionar o PDF.', 'error');
    }
  };

  const readFileAsArrayBuffer = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return decode(base64);
    } catch (error) {
      console.error('Erro ao ler arquivo PDF:', error);
      return null;
    }
  };

  const createBook = async () => {
    if (!bookTitle.trim() || !bookAuthor.trim()) {
      showToast('Título e autor são obrigatórios.', 'error');
      return;
    }
    if (!bookSubject.trim() || !bookTopic.trim()) {
      showToast('Matéria e assunto são obrigatórios.', 'error');
      return;
    }
    setIsCreatingBook(true);
    try {
      let uploadedPdfUrl = null;
      if (pdfAsset?.uri) {
        const fileData = await readFileAsArrayBuffer(pdfAsset.uri);
        if (!fileData) throw new Error('Falha ao ler o PDF.');
        const fileName = `${user?.id || 'user'}_${Date.now()}.pdf`;
        const path = `book_pdfs/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from('book-pdfs')
          .upload(path, fileData, { contentType: 'application/pdf', upsert: false });
        if (upErr) {
          console.error('Erro ao fazer upload do PDF:', upErr);
          throw upErr;
        }
        const { data: urlData } = supabase.storage.from('book-pdfs').getPublicUrl(path);
        uploadedPdfUrl = urlData.publicUrl;
      }
      const { data, error } = await supabase
        .from('books')
        .insert({
          title: bookTitle.trim(),
          author: bookAuthor.trim(),
          subject: bookSubject.trim(),
          topic: bookTopic.trim(),
          description: bookDescription.trim(),
          cover_url: coverUrl.trim() || null,
          pdf_url: uploadedPdfUrl,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) {
        console.error('Erro ao inserir livro na tabela books:', error);
        throw error;
      }
      setBooks(prev => [data, ...prev]);
      setBookTitle('');
      setBookAuthor('');
      setBookSubject('');
      setBookTopic('');
      setBookDescription('');
      setCoverUrl('');
      setPdfAsset(null);
      setShowCreateBookModal(false);
      showToast('Livro criado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar livro:', error);
      const msg = typeof error?.message === 'string' ? error.message : 'Não foi possível criar o livro.';
      showToast(msg, 'error');
    } finally {
      setIsCreatingBook(false);
    }
  };

  const deleteBook = async (bookId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Deseja remover este livro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('books').delete().eq('id', bookId);
              if (error) throw error;
              setBooks(prev => prev.filter(b => b.id !== bookId));
              showToast('Livro excluído!', 'success');
            } catch {
              showToast('Não foi possível excluir o livro.', 'error');
            }
          }
        }
      ]
    );
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'a',
      timePerQuestion: 0 // Permite começar com 0
    }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    } else {
      showToast('O quiz deve ter pelo menos uma pergunta.', 'error');
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  // Criar um novo quiz
  const createQuiz = async () => {
    // Validações rápidas
    if (!quizName.trim()) {
      showToast('Digite o nome do quiz.', 'error');
      return;
    }
    if (!quizSubject.trim()) {
      showToast('Digite a matéria do quiz.', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('Adicione pelo menos uma pergunta.', 'error');
      return;
    }

    // Validar todas as perguntas
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        showToast(`A pergunta ${i + 1} está vazia.`, 'error');
        return;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        showToast(`A pergunta ${i + 1} precisa ter todas as 4 opções preenchidas.`, 'error');
        return;
      }
      if (q.timePerQuestion < 0) {
        showToast(`O tempo para a pergunta ${i + 1} não pode ser negativo.`, 'error');
        return;
      }
    }

    setIsCreatingQuiz(true);
    
    try {
      const payload = questions.map((q, index) => ({
        question_text: q.questionText.trim(),
        option_a: q.optionA.trim(),
        option_b: q.optionB.trim(),
        option_c: q.optionC.trim(),
        option_d: q.optionD.trim(),
        correct_answer: (q.correctAnswer || 'a').toLowerCase(),
        time_per_question: q.timePerQuestion || 0,
        question_order: index + 1
      }));

      const { data: newQuizId, error: rpcError } = await supabase.rpc('create_quiz_with_questions', {
        p_name: quizName.trim(),
        p_subject: quizSubject.trim(),
        p_questions: payload
      });

      if (rpcError) {
        console.error('Erro ao criar quiz via RPC:', rpcError);
        throw rpcError;
      }

      console.log('Quiz criado com sucesso via RPC, ID:', newQuizId);

      // Adicionar quiz ao estado local imediatamente para atualização instantânea
      setQuizzes(prev => [{
        id: newQuizId,
        name: quizName.trim(),
        subject: quizSubject.trim(),
        created_by: user?.id,
        created_at: new Date().toISOString()
      }, ...prev]);

      // Limpar formulário imediatamente
      setQuizName('');
      setQuizSubject('');
      setQuestions([{
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'a',
        timePerQuestion: 0
      }]);
      
      // Fechar modal primeiro
      setShowCreateQuizModal(false);
      
      // Feedback visual
      showToast('Quiz criado com sucesso!', 'success');
      
      // Recarregar lista do servidor para garantir sincronização
      setTimeout(() => {
        loadQuizzes();
      }, 500);
    } catch (error) {
      console.error('Erro ao criar quiz:', error);
      showToast('Não foi possível criar o quiz. Tente novamente.', 'error');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const deleteQuiz = async (quizId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este quiz? Todas as perguntas e resultados serão excluídos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: q } = await supabase
                .from('quizzes')
                .select('id, created_by')
                .eq('id', quizId)
                .maybeSingle();
              if (!q || q.created_by !== user?.id) {
                showToast('Você só pode excluir seus próprios quizzes.', 'error');
                return;
              }
              const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', quizId);
              
              if (error) throw error;
              showToast('Quiz excluído com sucesso!', 'success');
              loadQuizzes();
            } catch (error) {
              console.error('Erro ao excluir quiz:', error);
              showToast('Não foi possível excluir o quiz.', 'error');
            }
          },
        },
      ]
    );
  };

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [selectedQuizForRoom, setSelectedQuizForRoom] = useState(null);
  const [maxParticipants, setMaxParticipants] = useState('0');

  const createQuizRoom = async () => {
    if (!selectedQuizForRoom) {
      console.error('Nenhum quiz selecionado para criar sala');
      showToast('Nenhum quiz selecionado.', 'error');
      return;
    }

    if (!user?.id) {
      console.error('Usuário não autenticado');
      showToast('Você precisa estar logado para criar uma sala.', 'error');
      return;
    }

    try {
      const maxParticipantsNum = parseInt(maxParticipants) || 0;
      console.log('Criando sala para quiz:', selectedQuizForRoom, 'com limite:', maxParticipantsNum);
      
      // Gerar código único da sala
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let roomCode = generateCode();
      let attempts = 0;
      
      // Verificar se o código já existe
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('quiz_rooms')
          .select('id')
          .eq('room_code', roomCode)
          .single();
        
        if (!existing) break;
        roomCode = generateCode();
        attempts++;
      }

      if (attempts >= 10) {
        showToast('Não foi possível gerar um código único. Tente novamente.', 'error');
        return;
      }

      console.log('Código gerado:', roomCode);

      const { data, error } = await supabase
        .from('quiz_rooms')
        .insert({
          quiz_id: selectedQuizForRoom,
          room_code: roomCode,
          created_by: user.id,
          is_active: true,
          max_participants: maxParticipantsNum,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir sala:', error);
        throw error;
      }

      console.log('Sala criada com sucesso:', data);

      setShowCreateRoomModal(false);
      setMaxParticipants('0');
      setSelectedQuizForRoom(null);
      
      showToast('Sala criada com sucesso!', 'success');
      loadQuizRooms();
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      showToast('Não foi possível criar a sala do quiz.', 'error');
    }
  };

  const [quizRooms, setQuizRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const loadQuizRooms = async () => {
    if (!user?.id) return;
    
    setLoadingRooms(true);
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('quiz_rooms')
        .select(`
          id,
          quiz_id,
          room_code,
          status,
          max_participants,
          created_at,
          quiz:quizzes(id, name, subject)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (roomsError) throw roomsError;
      
      // Buscar contagem de participantes para cada sala
      const roomsWithCount = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { count, error: countError } = await supabase
            .from('quiz_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          
          return {
            ...room,
            participantCount: countError ? 0 : (count || 0)
          };
        })
      );
      
      setQuizRooms(roomsWithCount);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
      showToast('Não foi possível carregar as salas.', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'Quiz') {
      loadQuizzes();
      loadQuizRooms();
    }
  }, [activeTab, user?.id]);

  const startQuiz = async (roomId) => {
    Alert.alert(
      'Iniciar Quiz',
      'Tem certeza que deseja iniciar o quiz? Os participantes que já estão na sala poderão começar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('quiz_rooms')
                .update({ status: 'started' })
                .eq('id', roomId)
                .eq('created_by', user?.id);
              
              if (error) throw error;
              
              showToast('Quiz iniciado!', 'success');
              loadQuizRooms();
            } catch (error) {
              console.error('Erro ao iniciar quiz:', error);
              showToast('Não foi possível iniciar o quiz.', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark" size={32} color={theme.icon} />
          <Text style={[styles.title, { color: theme.text }]}>Painel Administrativo</Text>
        </View>
      </View>
      {/* Barra de abas rolável abaixo do título */}
      <View style={{ width: '100%' }}>
        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', height: 48 }}
          style={{ backgroundColor: theme.sidebar || theme.background, marginBottom: 20 }}
        >
          {ADMIN_TAB_NAMES.map(tab => {
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
      </View>

      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          directionalLockEnabled={false}
          alwaysBounceVertical={true}
          bounces={true}
          style={{ flex: 1, width: '100%' }}
        >
          <TouchableWithoutFeedback>
            <View style={{ width: '100%' }}>
              {/* Conteúdo dinâmico das abas do admin */}
              {activeTab === 'Gerais' && (
                <>
                  {/* Adicionar Novo Gráfico */}
                  <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Adicionar Novo Gráfico</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                        placeholder="Nome do gráfico"
                        placeholderTextColor={theme.text}
                        value={newChartName}
                        onChangeText={setNewChartName}
                      />
                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.icon }]}
                        onPress={addChartHandler}
                      >
                        <Ionicons name="add" size={24} color={theme.background} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Gerenciar Gráficos e Escolas */}
                  {schoolCharts.map((chart) => (
                    <View key={chart.id} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 16 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        {editingChartId === chart.id ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <TextInput
                              style={[styles.sectionTitle, { color: theme.text, borderBottomWidth: 1, borderColor: theme.icon, flex: 1, marginRight: 8 }]}
                              value={editingChartNames[chart.id] ?? chart.name}
                              onChangeText={text => setEditingChartNames(prev => ({ ...prev, [chart.id]: text }))}
                              autoFocus
                              maxLength={32}
                            />
                            <TouchableOpacity onPress={() => saveChartName(chart.id)} style={{ marginRight: 8 }}>
                              <Ionicons name="checkmark" size={24} color={theme.icon} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditingChartId(null)}>
                              <Ionicons name="close" size={22} color={theme.icon} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={[styles.sectionTitle, { color: theme.text, flex: 1 }]}>{chart.name}</Text>
                            {user?.id === chart.created_by && (
                              <>
                                <TouchableOpacity onPress={() => { setEditingChartId(chart.id); setEditingChartNames(prev => ({ ...prev, [chart.id]: chart.name })); }} style={{ marginRight: 8 }}>
                                  <Ionicons name="pencil" size={20} color={theme.icon} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteChartHandler(chart.id)}>
                                  <Ionicons name="trash" size={22} color="#FF4444" />
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                      {/* Adicionar escola neste gráfico */}
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                          placeholder="Nome da escola"
                          placeholderTextColor={theme.text}
                          value={newSchoolNames[chart.id] || ''}
                          onChangeText={text => setNewSchoolNames(prev => ({ ...prev, [chart.id]: text }))}
                        />
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: chart.schools.length >= 5 || user?.id !== chart.created_by ? theme.border : theme.icon, opacity: chart.schools.length >= 5 || user?.id !== chart.created_by ? 0.5 : 1 }]}
                          onPress={() => {
                            if (user?.id !== chart.created_by) {
                              showToast('Você só pode gerenciar escolas dos seus gráficos.', 'error');
                              return;
                            }
                            addSchoolHandler(chart.id);
                          }}
                          disabled={chart.schools.length >= 5 || user?.id !== chart.created_by}
                        >
                          <Ionicons name="add" size={24} color={theme.background} />
                        </TouchableOpacity>
                      </View>
                      {/* Lista de escolas deste gráfico */}
                      {chart.schools.map((school) => (
                        <View key={school.id} style={[
                          styles.schoolItem,
                          {
                            borderColor: theme.border,
                            backgroundColor: selectedSchoolToDelete[chart.id] === school.id
                              ? 'rgba(255, 68, 68, 0.1)'
                              : 'rgba(0, 0, 0, 0.02)'
                          }
                        ]}>
                          <TouchableOpacity
                            style={styles.schoolInfo}
                            onPress={() => {
                              if (user?.id !== chart.created_by) {
                                showToast('Você só pode excluir escolas dos seus gráficos.', 'error');
                                return;
                              }
                              deleteSchoolHandler(chart.id, school.id);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.schoolName, { color: theme.text }]}>{school.name}</Text>
                            <View style={styles.performanceContainer}>
                              <Text style={[styles.performanceLabel, { color: theme.text }]}>Desempenho:</Text>
                              <TextInput
                                style={[styles.performanceInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                                value={school.performance !== null && school.performance !== undefined ? school.performance.toString() : '0'}
                                onChangeText={(text) => {
                                  if (user?.id !== chart.created_by) {
                                    showToast('Você só pode atualizar escolas dos seus gráficos.', 'error');
                                    return;
                                  }
                                  updatePerformanceHandler(chart.id, school.id, text);
                                }}
                                keyboardType="numeric"
                                maxLength={3}
                                onPressIn={(e) => e.stopPropagation()}
                              />
                              <Text style={[styles.performanceLabel, { color: theme.text }]}>%</Text>
                            </View>
                          </TouchableOpacity>
                          {selectedSchoolToDelete[chart.id] === school.id && (
                            <TouchableOpacity
                              style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                              onPress={() => deleteSchoolHandler(chart.id, school.id)}
                            >
                              <Ionicons name="trash" size={20} color="white" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}

                  {/* Estatísticas Gerais */}
                  <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Estatísticas Gerais</Text>
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.icon }]}>{getTotalSchools()}</Text>
                        <Text style={[styles.statLabel, { color: theme.text }]}>Total de Escolas</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.icon }]}>
                          {getAveragePerformance()}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text }]}>Média de Desempenho</Text>
                      </View>
                    </View>
                  </View>

                  {/* Instruções */}
                  <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Instruções de Uso</Text>
                    <Text style={[styles.instructionText, { color: theme.text }]}>
                      • Adicione novas escolas usando o campo acima{'\n'}
                      • Defina o desempenho de cada escola (0-100%){'\n'}
                      • Exclua escolas desnecessárias{'\n'}
                      • As estatísticas são atualizadas automaticamente{'\n'}
                      • Arraste para rolar pelos cartões
                    </Text>
                  </View>

                  {/* Botão para sair do modo administrador */}
                  <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 32 }}>
                    <TouchableOpacity
                      onPress={onLogout}
                      style={{
                        backgroundColor: theme.icon,
                        paddingVertical: 14,
                        paddingHorizontal: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        shadowColor: theme.icon,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                      accessibilityLabel="Sair do modo administrador"
                    >
                      <Text style={{ color: theme.card, fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}>Sair do modo administrador</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {activeTab === 'Individuais' && (
                <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Lista de Escolas</Text>
                  <TextInput
                    style={{
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 16,
                      fontSize: 16,
                    }}
                    placeholder="Pesquisar escola..."
                    placeholderTextColor={theme.text}
                    value={schoolSearch}
                    onChangeText={setSchoolSearch}
                  />
                  {schoolCharts.length === 0 ? (
                    <Text style={{ color: theme.text, fontSize: 15, opacity: 0.7, textAlign: 'center', marginVertical: 16 }}>
                      Nenhuma escola cadastrada.
                    </Text>
                  ) : (
                    schoolCharts.flatMap(chart => chart.schools)
                      .filter(school => school.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                      .map((school) => (
                        <View key={school.id}>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedSchool(school);
                              setShowRendimentoModal(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: '#eee',
                            }}>
                              <Text style={{ color: theme.text, fontSize: 16 }}>{school.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>{school.performance}%</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.text} />
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))
                  )}
                </View>
              )}
              {activeTab === 'Quiz' && (
                <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Gerenciar Quizzes</Text>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: theme.icon }]}
                      onPress={() => setShowCreateQuizModal(true)}
                    >
                      <Ionicons name="add" size={24} color={theme.background} />
                    </TouchableOpacity>
                  </View>
                  
                  {loadingQuizzes ? (
                    <Text style={{ color: theme.text, textAlign: 'center' }}>Carregando...</Text>
                  ) : quizzes.length === 0 ? (
                    <Text style={{ color: theme.text, textAlign: 'center', opacity: 0.7 }}>
                      Nenhum quiz criado. Clique no botão + para criar um novo quiz.
                    </Text>
                  ) : (
                    <>
                      {quizzes.map((quiz) => (
                        <View key={quiz.id} style={[styles.quizItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.quizName, { color: theme.text }]}>{quiz.name}</Text>
                            <Text style={[styles.quizSubject, { color: theme.text, opacity: 0.7 }]}>Matéria: {quiz.subject}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                              {quizCreators[quiz.created_by]?.profile_image_url ? (
                                <Image source={{ uri: quizCreators[quiz.created_by].profile_image_url }} style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }} />
                              ) : (
                                <Ionicons name="person-circle-outline" size={20} color={theme.text} style={{ marginRight: 6 }} />
                              )}
                              <Text style={{ color: theme.text, opacity: 0.65, fontSize: 12 }}>
                                por {quizCreators[quiz.created_by]?.username || 'Usuário'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedQuizForRoom(quiz.id);
                                setShowCreateRoomModal(true);
                              }}
                              style={[styles.createRoomButton, { backgroundColor: theme.icon }]}
                            >
                              <Ionicons name="add-circle-outline" size={20} color="white" />
                            </TouchableOpacity>
                            {user?.id === quiz.created_by && (
                              <TouchableOpacity
                                onPress={() => deleteQuiz(quiz.id)}
                                style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                              >
                                <Ionicons name="trash" size={20} color="white" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                      
                      {/* Lista de Salas Criadas */}
                      {quizRooms.length > 0 && (
                        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 20 }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Salas Criadas</Text>
                          {loadingRooms ? (
                            <ActivityIndicator size="small" color={theme.icon} />
                          ) : (
                            quizRooms.map((room) => (
                              <View key={room.id} style={[styles.roomItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.roomCode, { color: theme.text, fontWeight: 'bold' }]}>
                                    Código: {room.room_code}
                                  </Text>
                                  <Text style={[styles.quizSubject, { color: theme.text, opacity: 0.7 }]}>
                                    {room.quiz?.name || 'Quiz'}
                                  </Text>
                                  <Text style={[styles.quizSubject, { color: theme.text, opacity: 0.6, fontSize: 12 }]}>
                                    Status: {room.status === 'waiting' ? 'Aguardando' : room.status === 'started' ? 'Iniciado' : 'Finalizado'} | 
                                    Participantes: {room.participantCount || 0}
                                    {room.max_participants > 0 ? ` / ${room.max_participants}` : ' (ilimitado)'}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <TouchableOpacity
                                    onPress={() => navigation.navigate('QuizProjector', { roomId: room.id, roomCode: room.room_code })}
                                    style={[styles.startButton, { backgroundColor: theme.primary, marginRight: 8 }]}
                                  >
                                    <Ionicons name="desktop-outline" size={20} color="white" />
                                    <Text style={[styles.startButtonText, { color: 'white', marginLeft: 4 }]}>Projetor</Text>
                                  </TouchableOpacity>

                                  {room.status === 'waiting' && (
                                    <TouchableOpacity
                                      onPress={() => startQuiz(room.id)}
                                      style={[styles.startButton, { backgroundColor: '#4CAF50' }]}
                                    >
                                      <Ionicons name="play" size={20} color="white" />
                                      <Text style={[styles.startButtonText, { color: 'white', marginLeft: 4 }]}>Iniciar</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
              {activeTab === 'Livros' && (
                <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Gerenciar Livros</Text>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: theme.icon }]}
                      onPress={() => setShowCreateBookModal(true)}
                    >
                      <Ionicons name="add" size={24} color={theme.background} />
                    </TouchableOpacity>
                  </View>
                  {loadingBooks ? (
                    <Text style={{ color: theme.text, textAlign: 'center' }}>Carregando...</Text>
                  ) : books.length === 0 ? (
                    <Text style={{ color: theme.text, textAlign: 'center', opacity: 0.7 }}>
                      Nenhum livro criado. Clique no botão + para criar.
                    </Text>
                  ) : (
                    books.map(book => (
                      <View key={book.id} style={[styles.bookItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bookTitle, { color: theme.text }]}>{book.title}</Text>
                          <Text style={{ color: theme.text, opacity: 0.7 }}>{book.author}</Text>
                          <Text style={{ color: theme.text, opacity: 0.6, fontSize: 12 }}>{book.subject} • {book.topic}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteBook(book.id)}
                          style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                        >
                          <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      {/* Modal de Criar Sala */}
      <Modal
        visible={showCreateRoomModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowCreateRoomModal(false);
          setSelectedQuizForRoom(null);
          setMaxParticipants('0');
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Sala</Text>
              <TouchableOpacity onPress={() => {
                setShowCreateRoomModal(false);
                setSelectedQuizForRoom(null);
                setMaxParticipants('0');
              }}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.label, { color: theme.text, marginBottom: 8, fontSize: 16, fontWeight: '600' }]}>
                Limite de Participantes (Alunos):
              </Text>
              <Text style={[styles.helpText, { color: theme.text, opacity: 0.7, fontSize: 13, marginBottom: 12 }]}>
                Digite o número máximo de alunos que podem entrar na sala.{'\n'}
                Digite 0 (zero) para permitir entrada ilimitada.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      color: theme.text, 
                      backgroundColor: theme.background, 
                      borderColor: theme.border,
                      flex: 1,
                      fontSize: 18,
                      fontWeight: '600',
                      textAlign: 'center'
                    }
                  ]}
                  value={maxParticipants}
                  onChangeText={(text) => {
                    // Permite apenas números
                    const cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned === '' || cleaned === '0') {
                      setMaxParticipants('0');
                    } else {
                      const num = parseInt(cleaned);
                      setMaxParticipants(Math.max(0, num).toString());
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.text}
                  selectTextOnFocus
                  maxLength={4}
                />
                <View style={{ 
                  paddingHorizontal: 12, 
                  paddingVertical: 8, 
                  backgroundColor: maxParticipants === '0' ? theme.border : theme.icon,
                  borderRadius: 8,
                  minWidth: 100
                }}>
                  <Text style={{ 
                    color: maxParticipants === '0' ? theme.text : '#fff', 
                    fontSize: 14, 
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {maxParticipants === '0' ? 'Ilimitado' : `${maxParticipants} aluno${parseInt(maxParticipants) !== 1 ? 's' : ''}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.border, flex: 1 }]}
                onPress={() => {
                  setShowCreateRoomModal(false);
                  setSelectedQuizForRoom(null);
                  setMaxParticipants('0');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.icon, flex: 1 }]}
                onPress={createQuizRoom}
              >
                <Text style={[styles.createButtonText, { color: '#fff' }]}>Criar Sala</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Criar Quiz */}
      <Modal
        visible={showCreateQuizModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateQuizModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Novo Quiz</Text>
            <TouchableOpacity onPress={() => setShowCreateQuizModal(false)}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="Nome do Quiz"
              placeholderTextColor={theme.text}
              value={quizName}
              onChangeText={setQuizName}
            />

            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="Matéria"
              placeholderTextColor={theme.text}
              value={quizSubject}
              onChangeText={setQuizSubject}
            />

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24, marginBottom: 12 }]}>Perguntas</Text>

            {questions.map((question, index) => (
              <View key={index} style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.questionNumber, { color: theme.text }]}>Pergunta {index + 1}</Text>
                  {questions.length > 1 && (
                    <TouchableOpacity onPress={() => removeQuestion(index)}>
                      <Ionicons name="trash" size={20} color="#FF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.textArea, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                  placeholder="Digite a pergunta"
                  placeholderTextColor={theme.text}
                  value={question.questionText}
                  onChangeText={(text) => updateQuestion(index, 'questionText', text)}
                  multiline
                />

                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="Opção A"
                  placeholderTextColor={theme.text}
                  value={question.optionA}
                  onChangeText={(text) => updateQuestion(index, 'optionA', text)}
                />

                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="Opção B"
                  placeholderTextColor={theme.text}
                  value={question.optionB}
                  onChangeText={(text) => updateQuestion(index, 'optionB', text)}
                />

                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="Opção C"
                  placeholderTextColor={theme.text}
                  value={question.optionC}
                  onChangeText={(text) => updateQuestion(index, 'optionC', text)}
                />

                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="Opção D"
                  placeholderTextColor={theme.text}
                  value={question.optionD}
                  onChangeText={(text) => updateQuestion(index, 'optionD', text)}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Resposta Correta:</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      {['a', 'b', 'c', 'd'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: question.correctAnswer === option ? theme.icon : theme.background,
                              borderColor: theme.border,
                              marginRight: 8
                            }
                          ]}
                          onPress={() => updateQuestion(index, 'correctAnswer', option)}
                        >
                          <Text style={[styles.optionButtonText, { color: question.correctAnswer === option ? '#fff' : theme.text }]}>
                            {option.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ marginLeft: 16 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Tempo (seg):</Text>
                    <TextInput
                      style={[styles.timeInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                      value={question.timePerQuestion?.toString() || '0'}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        updateQuestion(index, 'timePerQuestion', Math.max(0, num));
                      }}
                      keyboardType="numeric"
                      selectTextOnFocus
                      placeholder="0"
                      placeholderTextColor={theme.text}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addQuestionButton, { backgroundColor: theme.icon, marginTop: 16 }]}
              onPress={addQuestion}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={[styles.addQuestionText, { color: '#fff' }]}>Adicionar Pergunta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: isCreatingQuiz ? theme.border : theme.icon,
                  marginTop: 24,
                  opacity: isCreatingQuiz ? 0.6 : 1
                }
              ]}
              onPress={createQuiz}
              disabled={isCreatingQuiz}
            >
              {isCreatingQuiz ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.createButtonText, { color: '#fff' }]}>Criar Quiz</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showCreateBookModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateBookModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Novo Livro</Text>
            <TouchableOpacity onPress={() => setShowCreateBookModal(false)}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="Título"
              placeholderTextColor={theme.text}
              value={bookTitle}
              onChangeText={setBookTitle}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="Autor"
              placeholderTextColor={theme.text}
              value={bookAuthor}
              onChangeText={setBookAuthor}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="Matéria"
              placeholderTextColor={theme.text}
              value={bookSubject}
              onChangeText={setBookSubject}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="Assunto"
              placeholderTextColor={theme.text}
              value={bookTopic}
              onChangeText={setBookTopic}
            />
            <TextInput
              style={[styles.textArea, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={theme.text}
              value={bookDescription}
              onChangeText={setBookDescription}
              multiline
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              placeholder="URL da capa (opcional)"
              placeholderTextColor={theme.text}
              value={coverUrl}
              onChangeText={setCoverUrl}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.icon }]}
                onPress={pickPdf}
              >
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={[styles.createButtonText, { color: '#fff', marginLeft: 8 }]}>Selecionar PDF</Text>
              </TouchableOpacity>
              <Text style={{ marginLeft: 12, color: theme.text }}>
                {pdfAsset?.name ? pdfAsset.name : 'Nenhum arquivo selecionado'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: isCreatingBook ? theme.border : theme.icon,
                  marginTop: 24,
                  opacity: isCreatingBook ? 0.6 : 1
                }
              ]}
              onPress={createBook}
              disabled={isCreatingBook}
            >
              {isCreatingBook ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.createButtonText, { color: '#fff' }]}>Criar Livro</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Rendimento */}
      <SchoolRendimentoModal
        visible={showRendimentoModal}
        onClose={() => setShowRendimentoModal(false)}
        school={selectedSchool}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingTop: 20,
    width: '100%',
  },
  section: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  schoolInfo: {
    flex: 1,
    marginRight: 20,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  performanceLabel: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
  },
  performanceInput: {
    width: 70,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    marginRight: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  statsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  quizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  quizName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  quizSubject: {
    fontSize: 14,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  helpText: {
    fontSize: 12,
    marginBottom: 4,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomCode: {
    fontSize: 16,
    marginBottom: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addQuestionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createRoomButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminScreen; 
