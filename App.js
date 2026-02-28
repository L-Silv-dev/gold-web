import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import * as Font from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import { Linking, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './utils/supabase';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import logger from './utils/logger';
import {
    Alert,
    Image,
    Modal,
    PanResponder,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import OptimizedImage from './components/OptimizedImage';
import AdditionalInfoModal from './components/AdditionalInfoModal';
import AgendaAddOptionsModal from './components/AgendaAddOptionsModal';
import AlarmModal from './components/AlarmModal';
import AlarmRingModal from './components/AlarmRingModal';
import NoteModal from './components/NoteModal';
import ProfileEditModal from './components/ProfileEditModal';
import BottomNavigation from './components/BottomNavigation';
import TextPostModal from './components/TextPostModal';
import ImagePostModal from './components/ImagePostModal';
import VideoPostModal from './components/VideoPostModal';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import useNotes from './hooks/useNotes';
import AdminAccessInfoScreen from './screens/AdminAccessInfoScreen';
import AdminScreen from './screens/AdminScreen';
import AgendaScreen from './screens/AgendaScreen';
import EventsComingSoonScreen from './screens/EventsComingSoonScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchUsersScreen from './screens/SearchUsersScreen';
import FindUsersScreen from './screens/FindUsersScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import BooksScreen from './screens/BooksScreen';
import styles from './styles/AppStyles';
import { configureNotificationHandler, registerForPushNotificationsAsync, scheduleLocalNotification, setupAlarmNotificationChannel } from './utils/notifications';
import { getActiveConversationId } from './utils/chatState';
import CacheManager from './utils/cache';
import { startNetworkMonitoring } from './utils/networkHelper';
import { useUserContext } from './contexts/UserContext';
import { useThemeContext } from './contexts/ThemeContext';
import { useAdminAuth } from './contexts/AdminAuthContext';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ChatScreen from './screens/ChatScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupDetailsScreen from './screens/GroupDetailsScreen';
import QuizScreen from './screens/QuizScreen';
import QuizProjectorScreen from './screens/QuizProjectorScreen';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

configureNotificationHandler();

const Stack = createStackNavigator();

// Configuração do Deep Linking
const prefix = Platform.OS === 'web' ? 'https://goldapp.com' : 'goldapp://';

const linking = {
  prefixes: [prefix, 'goldapp://', 'https://goldapp.com'],
  config: {
    screens: {
      ResetPassword: {
        path: 'reset-password',
        parse: {
          access_token: (access_token) => access_token,
          refresh_token: (refresh_token) => refresh_token,
          type: (type) => type || 'recovery',
        },
        stringify: {
          access_token: (access_token) => access_token,
          refresh_token: (refresh_token) => refresh_token,
        }
      },
    },
  },
  // Função para extrair os parâmetros da URL
  getStateFromPath: (path, options) => {
    // Se for um link de redefinição de senha do Supabase
    if (path.includes('type=recovery')) {
      const params = new URLSearchParams(path.split('?')[1]);
      return {
        routes: [
          {
            name: 'ResetPassword',
            params: {
              access_token: params.get('access_token'),
              refresh_token: params.get('refresh_token'),
              type: params.get('type') || 'recovery',
            },
          },
        ],
      };
    }
    // Retorna null para usar o comportamento padrão
    return null;
  },
};

// Componente para gerenciar a navegação autenticada
function MainAppStack({ onLogout }) {
  const { signOut } = useAuth();
  
  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      onLogout();
    } else {
      logger.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main">
        {props => <MainApp {...props} onLogout={handleLogout} />}
      </Stack.Screen>
      <Stack.Screen 
        name="FindUsers" 
        component={FindUsersScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.recipientName || 'Chat',
          headerBackTitle: 'Voltar',
          headerTintColor: '#000',
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e1e1e1',
          },
        })}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="GroupDetails" 
        component={GroupDetailsScreen}
        options={{
          headerTitle: 'Detalhes do Grupo',
          headerBackTitle: 'Voltar',
          headerTintColor: '#000',
        }}
      />
      <Stack.Screen 
        name="Quiz" 
        component={QuizScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="QuizProjector" 
        component={QuizProjectorScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      
    </Stack.Navigator>
  );
}

// Componente para gerenciar a navegação de autenticação
function AuthStack({ onLogin }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {props => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen}
        options={{ title: 'Redefinir Senha' }}
      />
    </Stack.Navigator>
  );
}

function AppWrapper() {
  const { user, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const navigation = useNavigation();
  const [fontsLoaded, setFontsLoaded] = useState(Platform.OS !== 'web' ? true : false);

  // Auditoria: app aberto
  useEffect(() => {
    const sendAppOpen = async () => {
      try {
        await supabase.functions.invoke('audit', { body: { event: 'app_open' } });
      } catch {}
    };
    sendAppOpen();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const onWindowError = async (event) => {
        try {
          const payload = {
            type: 'window_error',
            message: event?.message || '',
            source: event?.filename || '',
            lineno: event?.lineno || 0,
            colno: event?.colno || 0,
            stack: event?.error?.stack || '',
            url: typeof window !== 'undefined' ? window.location.href : '',
          };
          try { console.error('WebError', payload); } catch {}
          try { await supabase.functions.invoke('audit', { body: { event: 'client_error', payload } }); } catch {}
        } catch {}
      };
      const onUnhandledRejection = async (event) => {
        try {
          const reason = event?.reason;
          const payload = {
            type: 'unhandled_rejection',
            message: (reason && (reason.message || reason.toString())) || '',
            stack: reason?.stack || '',
            url: typeof window !== 'undefined' ? window.location.href : '',
          };
          try { console.error('WebUnhandledRejection', payload); } catch {}
          try { await supabase.functions.invoke('audit', { body: { event: 'client_error', payload } }); } catch {}
        } catch {}
      };
      window.addEventListener('error', onWindowError);
      window.addEventListener('unhandledrejection', onUnhandledRejection);
      return () => {
        window.removeEventListener('error', onWindowError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
      };
    }
  }, []);

  // Carregar fontes de ícones na Web antes de renderizar
  useEffect(() => {
    let mounted = true;
    const loadIconFonts = async () => {
      if (Platform.OS === 'web') {
        try {
          await Font.loadAsync({
            Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
            MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
            Entypo: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf'),
          });
          if (mounted) setFontsLoaded(true);
        } catch {}
      }
    };
    loadIconFonts();
    return () => { mounted = false; };
  }, []);

  // Configura o listener de deep linking
  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      console.log('Deep link opened:', url);
      
      if (!url) return;
      
      // Se for um link de redefinição de senha do Supabase
      if (url.includes('type=recovery')) {
        const params = new URLSearchParams(url.split('?')[1]);
        navigation.navigate('ResetPassword', {
          access_token: params.get('access_token'),
          refresh_token: params.get('refresh_token'),
          type: params.get('type') || 'recovery',
        });
      }
    };

    // Adiciona o listener quando o componente é montado
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verifica se o app foi aberto a partir de um deep link quando iniciado
    const checkInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          logger.info('App opened from URL:', initialURL);
          handleDeepLink({ url: initialURL });
        }
      } catch (error) {
        logger.error('Erro ao obter URL inicial:', error);
      }
    };
    
    checkInitialURL();

    // Remove o listener quando o componente é desmontado
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [navigation]);

  // Aguardar a verificação inicial de autenticação
  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  if (!isInitialized || !fontsLoaded) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff'}}>
        <Text style={{fontSize: 16, color: '#000'}}>Carregando...</Text>
      </View>
    )
  }

  return (
    <UserProvider>
      <ThemeProvider>
        <SchoolProvider>
          <AdminAuthProvider>
            {user ? (
              <MainAppStack onLogout={() => {}} />
            ) : (
              <AuthStack onLogin={() => {}} />
            )}
          </AdminAuthProvider>
        </SchoolProvider>
      </ThemeProvider>
    </UserProvider>
  );
}

// Componente principal da aplicação
function MainApp({ onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [viewedUserId, setViewedUserId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showImagePostModal, setShowImagePostModal] = useState(false);
  const [showVideoPostModal, setShowVideoPostModal] = useState(false);
  const [showTextPostModal, setShowTextPostModal] = useState(false);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const [showAddContentOptionsModal, setShowAddContentOptionsModal] = useState(false);
  const [showAlarmRingModal, setShowAlarmRingModal] = useState(false);
  
  // Admin Registration State
  const [adminStep, setAdminStep] = useState(0); // 0: Login, 1: Details, 2: Security
  const [adminRegData, setAdminRegData] = useState({
    name: '',
    email: '',
    school: '',
    role: '',
    cpf: '',
    newPassword: ''
  });
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // Função para agendar notificação
  const scheduleAlarm = async (alarmTime) => {
    try {
      const now = new Date();
      let triggerTime = new Date(alarmTime);
      
      // Zerar segundos e milissegundos para garantir precisão
      triggerTime.setSeconds(0);
      triggerTime.setMilliseconds(0);
      
      triggerTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Se o horário já passou hoje (considerando precisão de minutos), agendar para amanhã
      if (triggerTime.getTime() <= now.getTime()) {
        triggerTime.setDate(triggerTime.getDate() + 1);
      }

      console.log('Agendando alarme para:', triggerTime.toISOString());

      // Verificar permissões antes de agendar
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted && !settings.canAskAgain) {
        Alert.alert('Permissão necessária', 'Habilite as notificações nas configurações do seu aparelho para que o alarme funcione.');
        return;
      }

      const notificationIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Alarme Disparado!',
          body: 'Toque para desligar o alarme',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 1000, 1000, 1000, 1000, 1000],
          channelId: 'alarm-critical-v2', // Atualizado para v2
          data: { type: 'alarm' },
          autoDismiss: false,
          sticky: true,
          categoryIdentifier: 'alarm',
        },
        trigger: triggerTime,
      });

      // Formata o horário para exibição
      const formattedTime = triggerTime.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      Alert.alert('Alarme agendado!', `Para ${formattedTime}`, [
        { text: 'OK', onPress: () => setCurrentScreen('agenda') },
      ]);
      return notificationIdentifier;
    } catch (error) {
      logger.error('Erro ao agendar alarme:', error);
      Alert.alert('Erro', 'Não foi possível agendar o alarme.');
      return null;
    }
  };

  // Função para formatar o horário do alarme
  const formatAlarmTime = (date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const {
    notes,
    setNotes,
    currentNote,
    setCurrentNote,
    editingNoteIndex,
    setEditingNoteIndex,
    currentAlarmTime,
    setCurrentAlarmTime,
    selectedAlarmToDelete,
    setSelectedAlarmToDelete,
    activeTab,
    setActiveTab,
    saveNote,
    deleteNote,
    toggleAlarmEnabled,
    deleteAlarm,
  } = useNotes(formatAlarmTime, scheduleAlarm);

  const {
    name, username, bio, profileImage,
    setName, setUsername, setBio, setUserEmail, setUserSchool,
    userEmail, userSchool
  } = useUserContext();

  const { theme, selectedMode, setSelectedMode } = useThemeContext();
  const isDark = selectedMode === 'escuro';

  const { isAdmin, login, register, logout, verifyCredentials } = useAdminAuth();

  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        Ionicons.loadFont?.();
        MaterialIcons.loadFont?.();
        Entypo.loadFont?.();
      } catch {}
    }
  }, []);


  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassaporte, setAdminPassaporte] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showNewPostModalFromApp, setShowNewPostModalFromApp] = useState(false);
  const [showNewTextPostModalFromApp, setShowNewTextPostModalFromApp] = useState(false);
  const [commitments, setCommitments] = useState([]);

  // Carregar compromissos
  const loadCommitments = async () => {
    try {
      const savedCommitments = await CacheManager.loadCommitments();
      setCommitments(savedCommitments);
    } catch (error) {
      console.log('Erro ao carregar compromissos:', error);
    }
  };

  // Carregar compromissos ao montar o componente
  useEffect(() => {
    loadCommitments();
  }, []);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [optionMenuVisible, setOptionMenuVisible] = useState(false);
  const [postFilter, setPostFilter] = useState('all');
  const [subjectScreenName, setSubjectScreenName] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [showPostCard, setShowPostCard] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);
  const [postType, setPostType] = useState(null); // 'anuncio' ou 'postagem'
  const [showPostTypeModal, setShowPostTypeModal] = useState(false); // Novo estado para controlar o modal de escolha de tipo de postagem


  useEffect(() => {
    let foregroundSubscription;
    let responseSubscription;
    let channel;
    let channelRequests;

    const setupNotifications = async () => {
      // Configurar canal de alarme imediatamente
      await setupAlarmNotificationChannel();

      // Registrar para notificações push e salvar token
      await registerForPushNotificationsAsync();

      // Listener para notificações recebidas enquanto o app está em foreground
      foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        const data = notification.request.content.data;
        if (data?.type === 'alarm') {
          // Tocar som em foreground via Modal
          setShowAlarmRingModal(true);
        }
      });
      
      // Listener para interações com notificações (quando usuário toca na notificação)
      responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        if (data?.type === 'alarm') {
          // Abrir o modal de alarme tocando
          setShowAlarmRingModal(true);
          return;
        }

        if (data?.conversationId) {
          navigation.navigate('Chat', { conversationId: data.conversationId });
          return;
        }
        if (data?.type === 'follow_request') {
          setCurrentScreen('searchUsers');
          return;
        }
      });

      // Configurar listener do Supabase para novas mensagens (Notificações locais)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const newMessage = payload.new;
            
            // Ignorar mensagens enviadas pelo próprio usuário
            if (newMessage.sender_id === user.id) return;

            // Verificar se o usuário está atualmente na tela de chat dessa conversa
            const activeConversationId = getActiveConversationId();
            
            // Se estiver na mesma conversa, não notificar
            if (activeConversationId === newMessage.conversation_id) {
              return;
            }

            // Verificar se o usuário é participante desta conversa (se o RLS não filtrar já)
            // Como precaução, buscamos o nome do remetente para a notificação
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = senderProfile?.username || 'Novo Usuário';
            const messageContent = newMessage.content || (newMessage.media_url ? '📷 Imagem' : 'Nova mensagem');

            // Agendar notificação local
             console.log('Agendando notificação local para:', senderName);
             await scheduleLocalNotification(
               `💬 ${senderName}`,
               messageContent,
               { conversationId: newMessage.conversation_id }
             );
           }
         )
         .subscribe();

      channelRequests = supabase
        .channel('public:user_followers')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_followers',
          },
          async (payload) => {
            const req = payload.new;
            if (req.following_id !== user.id) return;
            const { data: followerProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', req.follower_id)
              .single();
            const followerName = followerProfile?.username || 'Novo Usuário';
            await scheduleLocalNotification(
              '👤 Nova solicitação',
              `${followerName} solicitou seguir você`,
              { type: 'follow_request', requestId: req.id, followerId: req.follower_id }
            );
          }
        )
        .subscribe();
    };

    setupNotifications();

    return () => {
      if (foregroundSubscription) foregroundSubscription.remove();
      if (responseSubscription) responseSubscription.remove();
      if (channel) supabase.removeChannel(channel);
      if (channelRequests) supabase.removeChannel(channelRequests);
    };
  }, []);

  useEffect(() => {
    // Sempre que o profileImage do admin mudar, atualize o avatar das publicações do admin
    if (isAdmin && profileImage) {
      const updateAdminPostsAvatar = async () => {
        try {
          // Atualizar o campo author_avatar em todos os posts do admin
          const { error } = await supabase
            .from('posts')
            .update({ author_avatar: profileImage })
            .eq('author', name);
          
          if (error) {
            logger.error('Erro ao atualizar avatar nos posts:', error);
          }
        } catch (err) {
          logger.error('Erro ao atualizar avatar nos posts:', err);
        }
      };
      
      updateAdminPostsAvatar();
    }
  }, [profileImage, isAdmin, name]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        // Remover a lógica de atualização de posts do admin, pois não há mais AdminPostModal
      }
    } catch (error) {
      // Erro ao selecionar imagem
    }
  };



  // Lógica para filtrar e ordenar posts
  const filteredAndSortedPosts = React.useMemo(() => {
    if (!searchText) {
      return []; // Retorna array vazio se não houver texto de busca
    }
    const lowercasedSearchText = searchText.toLowerCase();
    const matchingPosts = [];
    const nonMatchingPosts = [];

    // Remover a lógica de busca em posts do admin, pois não há mais AdminPostModal
    // A busca agora é feita diretamente nos posts do usuário
    // Se a busca for por texto, filtra os posts de texto
    if (searchText.length > 0) {
      notes.forEach(note => {
        const author = note.author ? note.author.toLowerCase() : '';
        const description = note.description ? note.description.toLowerCase() : '';
        const text = note.type === 'note' && note.content ? note.content.toLowerCase() : '';
        const isMatch =
          author.includes(lowercasedSearchText) ||
          description.includes(lowercasedSearchText) ||
          text.includes(lowercasedSearchText);
        if (isMatch) {
          matchingPosts.push(note);
        } else {
          nonMatchingPosts.push(note);
        }
      });
    }
    return [...matchingPosts, ...nonMatchingPosts];
  }, [notes, searchText]);

  // Função para lidar com o logout do admin
  const handleAdminLogout = () => {
    // Chamar a função de logout do contexto de autenticação
    logout();
    
    // Navegar de volta para a tela inicial
    setCurrentScreen('home');
    
    // Se houver uma função de logout do AppWrapper, chamá-la também
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Indicador de status da rede */}
      <NetworkStatusIndicator />
      
      <View style={{ 
        flex: 1, 
        flexDirection: 'column', 
        backgroundColor: theme.background, 
        width: '100%',
        minHeight: Platform.OS === 'web' ? '100vh' : undefined,
        paddingTop: Platform.OS === 'web' ? 0 : -20,
        paddingLeft: Platform.OS === 'web' ? 56 : 0,
        overflow: 'visible'
      }}>
      
      {currentScreen === 'profile' && (
        <View style={styles.profileTopRightButtonsContainer}>
          <View style={styles.profileButtonsColumn}>
            {/* Botão de avião abaixo do botão de configurações */}
            <TouchableOpacity
              onPress={() => {
                setShowPostTypeModal(true);
              }}
              style={[styles.settingsButton, { marginTop: 10 }]}
              accessibilityLabel="Criar nova publicação"
            >
              <Ionicons name="paper-plane-outline" size={28} color={theme.icon} style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            
            {/* Botão de configurações */}
            <TouchableOpacity
              onPress={() => setSettingsMenuVisible(true)}
              style={styles.settingsButton}
              accessibilityLabel="Abrir configurações"
            >
              <Ionicons name="settings-outline" size={28} color={theme.icon} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Platform.OS === 'web' ? (
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ minHeight: '100vh', backgroundColor: theme.background }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {currentScreen === 'home' && (
            <HomeScreen
              filteredAndSortedPosts={filteredAndSortedPosts}
              searchText={searchText}
              setSearchText={setSearchText}
              refreshKey={postsRefreshKey}
              setCurrentScreen={setCurrentScreen}
            />
          )}
          {currentScreen === 'profile' && (
            <ProfileScreen
              postFilter={postFilter}
              setPostFilter={setPostFilter}
              showNewPostModalFromApp={showNewPostModalFromApp}
              setShowNewPostModalFromApp={setShowNewPostModalFromApp}
              showNewTextPostModalFromApp={showNewTextPostModalFromApp}
              setShowNewTextPostModalFromApp={setShowNewTextPostModalFromApp}
              showPostCard={showPostCard}
              setShowPostCard={setShowPostCard}
              postType={postType}
              setPostType={setPostType}
              onPressAdmin={() => {
                if (isAdmin) {
                  setCurrentScreen('admin');
                } else {
                  setCurrentScreen('adminInfo');
                }
              }}
              setCurrentScreen={setCurrentScreen}
            />
          )}
          {currentScreen === 'agenda' && (
            <AgendaScreen
              notes={notes}
              searchedNotes={notes.filter(note => note.type === 'note' && note.content.toLowerCase().includes(searchText.toLowerCase()))}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              formatAlarmTime={scheduleAlarm}
              toggleAlarmEnabled={toggleAlarmEnabled}
              setSelectedAlarmToDelete={setSelectedAlarmToDelete}
              selectedAlarmToDelete={selectedAlarmToDelete}
              deleteAlarm={deleteAlarm}
              setCurrentNote={setCurrentNote}
              setEditingNoteIndex={setEditingNoteIndex}
              setCurrentScreen={setCurrentScreen}
              saveNote={saveNote}
              currentNote={currentNote}
              editingNoteIndex={editingNoteIndex}
              onPressAddOptions={() => setOptionMenuVisible(true)}
              commitments={commitments}
              setCommitments={setCommitments}
            />
          )}
          {currentScreen === 'statistics' && (
            <StatisticsScreen setCurrentScreen={setCurrentScreen} />
          )}
          {currentScreen === 'eventsComingSoon' && (
            <EventsComingSoonScreen setCurrentScreen={setCurrentScreen} />
          )}
          {currentScreen === 'books' && (
            <BooksScreen />
          )}
          {currentScreen === 'adminInfo' && (
            <AdminAccessInfoScreen
              onRequestAccess={() => setShowAdminLogin(true)}
              onCancel={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'admin' && (
            isAdmin ? (
              <AdminScreen onLogout={handleAdminLogout} setCurrentScreen={setCurrentScreen} />
            ) : null
          )}
          
          {currentScreen === 'searchUsers' && (
            <SearchUsersScreen 
              onViewProfile={(userId) => {
                setViewedUserId(userId);
                setCurrentScreen('userProfile');
              }}
            />
          )}
          {currentScreen === 'userProfile' && viewedUserId && (
            <UserProfileScreen 
              userId={viewedUserId}
              onBack={() => {
                setCurrentScreen('searchUsers');
                setViewedUserId(null);
              }}
            />
          )}
        </ScrollView>
      ) : (
        <View style={[styles.main, { flex: 1, backgroundColor: theme.background }]}>
        {currentScreen === 'home' && (
          <HomeScreen
            filteredAndSortedPosts={filteredAndSortedPosts}
            searchText={searchText}
            setSearchText={setSearchText}
            refreshKey={postsRefreshKey}
            setCurrentScreen={setCurrentScreen}
            // Remover a chamada de addAdminImagePost e addAdminTextPost, pois não há mais AdminPostModal
          />
        )}
        {currentScreen === 'profile' && (
          <ProfileScreen
            // Remover a chamada de handleRemoveHomePost, pois não há mais AdminPostModal
            // Remover a chamada de addAdminImagePost e addAdminTextPost, pois não há mais AdminPostModal
            postFilter={postFilter}
            setPostFilter={setPostFilter}
            showNewPostModalFromApp={showNewPostModalFromApp}
            setShowNewPostModalFromApp={setShowNewPostModalFromApp}
            showNewTextPostModalFromApp={showNewTextPostModalFromApp}
            setShowNewTextPostModalFromApp={setShowNewTextPostModalFromApp}
            showPostCard={showPostCard}
            setShowPostCard={setShowPostCard}
            postType={postType}
            setPostType={setPostType}
            onPressAdmin={() => {
              if (isAdmin) {
                setCurrentScreen('admin');
              } else {
                setCurrentScreen('adminInfo');
              }
            }}
            setCurrentScreen={setCurrentScreen}
          />
        )}
        {currentScreen === 'agenda' && (
          <AgendaScreen
            notes={notes}
            searchedNotes={notes.filter(note => note.type === 'note' && note.content.toLowerCase().includes(searchText.toLowerCase()))}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            formatAlarmTime={scheduleAlarm}
            toggleAlarmEnabled={toggleAlarmEnabled}
            setSelectedAlarmToDelete={setSelectedAlarmToDelete}
            selectedAlarmToDelete={selectedAlarmToDelete}
            deleteAlarm={deleteAlarm}
            setCurrentNote={setCurrentNote}
            setEditingNoteIndex={setEditingNoteIndex}
            setCurrentScreen={setCurrentScreen}
            saveNote={saveNote}
            currentNote={currentNote}
            editingNoteIndex={editingNoteIndex}
            onPressAddOptions={() => setOptionMenuVisible(true)}
            commitments={commitments}
            setCommitments={setCommitments}
          />
        )}
        {currentScreen === 'statistics' && (
          <StatisticsScreen setCurrentScreen={setCurrentScreen} />
        )}
        {currentScreen === 'eventsComingSoon' && (
          <EventsComingSoonScreen setCurrentScreen={setCurrentScreen} />
        )}
        {currentScreen === 'books' && (
          <BooksScreen />
        )}
        {currentScreen === 'adminInfo' && (
          <AdminAccessInfoScreen
            onRequestAccess={() => setShowAdminLogin(true)}
            onCancel={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'admin' && (
          isAdmin ? (
            <AdminScreen onLogout={handleAdminLogout} setCurrentScreen={setCurrentScreen} />
          ) : null
        )}
        
        {currentScreen === 'searchUsers' && (
          <SearchUsersScreen 
            onViewProfile={(userId) => {
              setViewedUserId(userId);
              setCurrentScreen('userProfile');
            }}
          />
        )}

        {currentScreen === 'userProfile' && viewedUserId && (
          <UserProfileScreen 
            userId={viewedUserId}
            onBack={() => {
              setCurrentScreen('searchUsers');
              setViewedUserId(null);
            }}
          />
        )}

      </View>
      )}
      <BottomNavigation
        setCurrentScreen={setCurrentScreen}
        onPressAdmin={() => {
          if (isAdmin) {
            setCurrentScreen('admin');
          } else {
            setCurrentScreen('adminInfo');
          }
        }}
        currentScreen={currentScreen}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Editar Perfil</Text>

          <TouchableOpacity onPress={pickImage} accessibilityLabel="Alterar imagem de perfil no modal">
            <OptimizedImage 
              source={profileImage} 
              style={styles.profileImage}
              fallbackIcon="person-circle-outline"
              fallbackSize={100}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={theme.text}
            accessibilityLabel="Campo nome"
            autoFocus
          />
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Usuário"
            placeholderTextColor={theme.text}
            accessibilityLabel="Campo usuário"
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            multiline
            placeholderTextColor={theme.text}
            accessibilityLabel="Campo bio"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(false)}
            accessibilityLabel="Salvar alterações do perfil"
          >
            <Text style={styles.buttonText}>Salvar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={optionMenuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setOptionMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setOptionMenuVisible(false)}
          accessibilityLabel="Fechar menu de opções"
        >
          <TouchableWithoutFeedback>
            <View style={[styles.optionMenu, { backgroundColor: theme.card }]}>
              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: theme.card }]}
                onPress={() => {
                  setCurrentScreen('postite');
                  setOptionMenuVisible(false);
                  setCurrentNote('');
                  setEditingNoteIndex(null);
                }}
                accessibilityLabel="Criar nova nota"
              >
                <Text style={[styles.optionText, { color: theme.text }]}>Criar Post-ite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: theme.card, marginTop: 10 }]}
                onPress={() => {
                  setOptionMenuVisible(false);
                  setCurrentAlarmTime(new Date());
                  setShowAlarmModal(true);
                }}
                accessibilityLabel="Agendar novo alarme"
              >
                <Text style={[styles.optionText, { color: theme.text }]}>Agendar Alarme</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={settingsMenuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsMenuVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 18, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20 }}>Configurações</Text>
            <TouchableOpacity
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
              onPress={() => {
                setShowAdditionalInfoModal(true);
                setSettingsMenuVisible(false);
              }}
              accessibilityLabel="Informações adicionais"
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>Informações Adicionais</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
              onPress={() => {
                setModalVisible(true);
                setSettingsMenuVisible(false);
              }}
              accessibilityLabel="Alterar perfil"
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>Alterar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                              onPress={async () => {
                Alert.alert(
                  'Sair',
                  'Tem certeza que deseja sair da sua conta?',
                  [
                    {
                      text: 'Cancelar',
                      style: 'cancel',
                    },
                    {
                      text: 'Sair',
                      onPress: async () => {
                        try {
                          // Limpar os dados do usuário
                          await CacheManager.saveRegistrationStatus(false);
                          await CacheManager.saveUserCredentials(null);
                          
                          // Limpar o contexto do usuário
                          setName('');
                          setUserEmail('');
                          setUserSchool('');
                          
                          // Fechar o menu de configurações
                          setSettingsMenuVisible(false);
                          
                          // Chamar a função de logout do AppWrapper para navegar de volta para a tela de login
                          if (onLogout) {
                            onLogout();
                          }
                        } catch (error) {
                          console.error('Erro ao fazer logout:', error);
                          setSettingsMenuVisible(false);
                          Alert.alert('Erro', 'Ocorreu um erro ao sair da conta. Por favor, tente novamente.');
                        }
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
              accessibilityLabel="Fazer logout"
            >
              <Text style={{ color: '#D32F2F', fontSize: 16 }}>Sair</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.text, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>Modo de exibição:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setSelectedMode('claro')} style={{ backgroundColor: selectedMode === 'claro' ? theme.border : theme.card, borderRadius: 8, padding: 10, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ color: theme.text }}>Claro</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedMode('escuro')} style={{ backgroundColor: selectedMode === 'escuro' ? theme.background : theme.card, borderRadius: 8, padding: 10, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ color: theme.text }}>Escuro</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setSettingsMenuVisible(false)} style={{ backgroundColor: theme.text, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: theme.card, fontWeight: 'bold', fontSize: 16 }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      <AdditionalInfoModal
        visible={showAdditionalInfoModal}
        onClose={() => setShowAdditionalInfoModal(false)}
      />

      {/* Image Post Modal */}
      {/* Remover a lógica de ImagePostModal, pois não há mais AdminPostModal */}

      {/* Text Post Modal */}
      {/* Remover a lógica de TextPostModal, pois não há mais AdminPostModal */}

      {/* Note (Postite) Modal */}
      <NoteModal
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        editingNoteIndex={editingNoteIndex}
        setEditingNoteIndex={setEditingNoteIndex}
        currentNote={currentNote}
        setCurrentNote={setCurrentNote}
        saveNote={saveNote}
        deleteNote={deleteNote}
        notes={notes}
      />

      {/* Modal de Opções de Adição de Conteúdo (renomeado para PostContentOptionsModal) */}
      {/* Remover a lógica de PostContentOptionsModal, pois não há mais AdminPostModal */}

      {/* Modal de Alarme */}
      <AlarmModal
        showAlarmModal={showAlarmModal}
        setShowAlarmModal={setShowAlarmModal}
        currentAlarmTime={currentAlarmTime}
        setCurrentAlarmTime={setCurrentAlarmTime}
        scheduleAlarm={scheduleAlarm}
        setNotes={setNotes}
        setActiveTab={setActiveTab}
        formatAlarmTime={formatAlarmTime}
      />
      
      {/* Tela de Alarme Tocando */}
      <AlarmRingModal 
        visible={showAlarmRingModal} 
        onClose={() => setShowAlarmRingModal(false)} 
      />

      {/* Modal de Edição de Perfil */}
      <ProfileEditModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />

      {/* Modal de Opções de Adição da Agenda */}
      <AgendaAddOptionsModal
        optionMenuVisible={optionMenuVisible}
        setOptionMenuVisible={setOptionMenuVisible}
        setCurrentScreen={setCurrentScreen}
        setCurrentNote={setCurrentNote}
        setEditingNoteIndex={setEditingNoteIndex}
        setCurrentAlarmTime={setCurrentAlarmTime}
        setShowAlarmModal={setShowAlarmModal}
        onCommitmentAdded={(commitments) => {
          // Atualizar compromissos na AgendaScreen
          setCommitments(commitments);
        }}
      />

      {/* Modal de opções de postagem */}
      <Modal
        visible={showPostOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostOptionsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 18, padding: 24, width: '90%', maxWidth: 350 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
              Escolha o tipo de postagem
            </Text>
            
            <TouchableOpacity
              onPress={() => {
                setShowPostOptionsModal(false);
                setPostType('postagem');
                setShowPostCard(true);
              }}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="image-outline" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: 'bold', fontSize: 16 }}>Postagem</Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.8, fontSize: 12 }}>Foto com descrição</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setShowPostOptionsModal(false);
                setPostType('anuncio');
                setShowPostCard(true);
              }}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: 'bold', fontSize: 16 }}>Anúncio</Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.8, fontSize: 12 }}>Postagem só com letras</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowPostOptionsModal(false)}
              style={{
                backgroundColor: theme.textSecondary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.card, fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de escolha de tipo de postagem */}
      <Modal
        visible={showPostTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Criar nova publicação</Text>
            
            <TouchableOpacity
              style={[styles.postTypeButton, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={() => {
                setShowPostTypeModal(false);
                setShowTextPostModal(true);
              }}
            >
              <Ionicons name="document-text-outline" size={28} color={theme.text} style={styles.postTypeIcon} />
              <View style={styles.postTypeTextContainer}>
                <Text style={[styles.postTypeTitle, { color: theme.text }]}>Criar post de texto</Text>
                <Text style={[styles.postTypeDescription, { color: theme.textSecondary }]}>
                  Compartilhe seus pensamentos com uma publicação de texto
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.postTypeButton, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={() => {
                setShowPostTypeModal(false);
                setShowImagePostModal(true);
              }}
            >
              <Ionicons name="image-outline" size={28} color={theme.text} style={styles.postTypeIcon} />
              <View style={styles.postTypeTextContainer}>
                <Text style={[styles.postTypeTitle, { color: theme.text }]}>Publicar foto</Text>
                <Text style={[styles.postTypeDescription, { color: theme.textSecondary }]}>
                  Compartilhe uma imagem com seus seguidores
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.postTypeButton, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowPostTypeModal(false);
                setShowVideoPostModal(true);
              }}
            >
              <Ionicons name="videocam-outline" size={28} color={theme.text} style={styles.postTypeIcon} />
              <View style={styles.postTypeTextContainer}>
                <Text style={[styles.postTypeTitle, { color: theme.text }]}>Publicar vídeo</Text>
                <Text style={[styles.postTypeDescription, { color: theme.textSecondary }]}>
                  Compartilhe um vídeo com seus seguidores
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.textSecondary }]}
              onPress={() => setShowPostTypeModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.card }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de post de texto */}
      <TextPostModal
        visible={showTextPostModal}
        onClose={() => setShowTextPostModal(false)}
        onPostCreated={(newPost) => {
          // Forçar atualização dos posts na HomeScreen
          setPostsRefreshKey(prev => prev + 1);
        }}
      />

      {/* Modal de post com imagens */}
      <ImagePostModal
        visible={showImagePostModal}
        onClose={() => setShowImagePostModal(false)}
        onPostCreated={(newPost) => {
          // Forçar atualização dos posts na HomeScreen
          setPostsRefreshKey(prev => prev + 1);
        }}
      />

      {/* Modal de post com vídeos */}
      <VideoPostModal
        visible={showVideoPostModal}
        onClose={() => setShowVideoPostModal(false)}
        onPostCreated={(newPost) => {
          // Forçar atualização dos posts na HomeScreen
          setPostsRefreshKey(prev => prev + 1);
        }}
      />

      {/* Modal de login admin só aparece quando solicitado */}
      <Modal
        visible={showAdminLogin}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAdminLogin(false);
          setAdminStep(0);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowAdminLogin(false);
          setAdminStep(0);
        }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback>
              <View style={{ width: 340, backgroundColor: theme.card, borderRadius: 20, padding: 28, alignItems: 'center', elevation: 10, borderWidth: 1, borderColor: theme.border }}>
                <Ionicons name="shield-checkmark" size={44} color={theme.icon} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 18, color: theme.icon, letterSpacing: 0.5 }}>
                  {adminStep === 0 ? 'Acesso Administrativo' : adminStep === 1 ? 'Bem-vindo' : adminStep === 2 ? 'Login Admin' : 'Cadastro Admin'}
                </Text>

                {/* Passo 0: Chave Mestra (Argos/Gideon) */}
                {adminStep === 0 && (
                  <>
                    <TextInput
                      placeholder="Passaporte"
                      placeholderTextColor={isDark ? '#aaa' : theme.text}
                      value={adminPassaporte}
                      onChangeText={setAdminPassaporte}
                      style={{ width: '100%', borderWidth: 1.5, borderColor: theme.icon, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 17, backgroundColor: theme.background, color: theme.text }}
                      autoCapitalize="words"
                      autoFocus
                    />
                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.icon, borderRadius: 10, backgroundColor: theme.background, marginBottom: 10 }}>
                      <TextInput
                        placeholder="Senha"
                        placeholderTextColor={isDark ? '#aaa' : theme.text}
                        value={adminSenha}
                        onChangeText={setAdminSenha}
                        style={{ flex: 1, padding: 12, fontSize: 17, color: theme.text, backgroundColor: 'transparent' }}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ paddingHorizontal: 8 }}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={theme.icon} />
                      </TouchableOpacity>
                    </View>
                    {adminError ? <Text style={{ color: '#D32F2F', marginBottom: 8, fontWeight: 'bold' }}>{adminError}</Text> : null}
                    <TouchableOpacity
                      style={{ backgroundColor: theme.icon, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 40, marginTop: 8, width: '100%', alignItems: 'center', shadowColor: theme.icon, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}
                      onPress={async () => {
                        const isValid = await verifyCredentials(adminPassaporte.trim(), adminSenha.trim());
                        if (isValid) {
                          setAdminError('');
                          setAdminStep(1); // Vai para a escolha (Login/Cadastro)
                        } else {
                          setAdminError('Passaporte ou senha incorretos.');
                        }
                      }}
                    >
                      <Text style={{ color: theme.background, fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}>Entrar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Passo 1: Escolha entre Login e Cadastro */}
                {adminStep === 1 && (
                  <View style={{ width: '100%' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: theme.icon, borderRadius: 10, paddingVertical: 15, marginBottom: 15, width: '100%', alignItems: 'center' }}
                      onPress={() => setAdminStep(2)}
                    >
                      <Text style={{ color: theme.background, fontWeight: 'bold', fontSize: 17 }}>Já tenho conta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.icon, borderRadius: 10, paddingVertical: 15, width: '100%', alignItems: 'center' }}
                      onPress={() => setAdminStep(3)}
                    >
                      <Text style={{ color: theme.icon, fontWeight: 'bold', fontSize: 17 }}>Criar nova conta</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Passo 2: Login (CPF e Senha) */}
                {adminStep === 2 && (
                  <>
                    <TextInput
                      placeholder="CPF"
                      placeholderTextColor={isDark ? '#aaa' : theme.text}
                      value={adminRegData.cpf}
                      onChangeText={(t) => setAdminRegData({...adminRegData, cpf: t})}
                      keyboardType="numeric"
                      style={{ width: '100%', borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                    />
                    <TextInput
                      placeholder="Senha"
                      placeholderTextColor={isDark ? '#aaa' : theme.text}
                      value={adminRegData.newPassword}
                      onChangeText={(t) => setAdminRegData({...adminRegData, newPassword: t})}
                      secureTextEntry
                      style={{ width: '100%', borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: theme.icon, borderRadius: 10, paddingVertical: 13, marginTop: 8, width: '100%', alignItems: 'center' }}
                      onPress={async () => {
                        if (!adminRegData.cpf || !adminRegData.newPassword) {
                          alert('Preencha todos os campos!');
                          return;
                        }
                        
                        const result = await login(adminRegData.cpf, adminRegData.newPassword);
                        
                        if (result.success) {
                          setAdminPassaporte('');
                          setAdminSenha('');
                          setAdminError('');
                          setShowAdminLogin(false);
                          setAdminStep(0);
                          setAdminRegData({ ...adminRegData, cpf: '', newPassword: '' });
                          setCurrentScreen('admin');
                        } else {
                          alert('Erro: ' + (result.error || 'Falha no login'));
                        }
                      }}
                    >
                      <Text style={{ color: theme.background, fontWeight: 'bold', fontSize: 17 }}>Entrar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Passo 3: Cadastro Completo */}
                {adminStep === 3 && (
                  <>
                    <ScrollView style={{ width: '100%', maxHeight: 300 }}>
                      <TextInput
                        placeholder="Nome Completo"
                        placeholderTextColor={isDark ? '#aaa' : theme.text}
                        value={adminRegData.name}
                        onChangeText={(t) => setAdminRegData({...adminRegData, name: t})}
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                      />
                      <TextInput
                        placeholder="CPF"
                        placeholderTextColor={isDark ? '#aaa' : theme.text}
                        value={adminRegData.cpf}
                        onChangeText={(t) => setAdminRegData({...adminRegData, cpf: t})}
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                      />
                      <TextInput
                        placeholder="Escola"
                        placeholderTextColor={isDark ? '#aaa' : theme.text}
                        value={adminRegData.school}
                        onChangeText={(t) => setAdminRegData({...adminRegData, school: t})}
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowRoleSelector(!showRoleSelector)}
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: theme.background, flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text style={{ color: adminRegData.role ? theme.text : (isDark ? '#aaa' : theme.text) }}>{adminRegData.role || "Selecione a Função"}</Text>
                        <Ionicons name="chevron-down" size={20} color={theme.text} />
                      </TouchableOpacity>
                      {showRoleSelector && (
                        <View style={{ marginBottom: 12, borderColor: theme.border, borderWidth: 1, borderRadius: 8 }}>
                          {['Gestor', 'Coordenador', 'Suplente do Gestor', 'Chefe de Disciplina', 'Professor', 'Outro'].map(role => (
                            <TouchableOpacity key={role} onPress={() => { setAdminRegData({...adminRegData, role}); setShowRoleSelector(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                              <Text style={{ color: theme.text }}>{role}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <TextInput
                        placeholder="Criar Senha"
                        placeholderTextColor={isDark ? '#aaa' : theme.text}
                        value={adminRegData.newPassword}
                        onChangeText={(t) => setAdminRegData({...adminRegData, newPassword: t})}
                        secureTextEntry
                        style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginBottom: 12, color: theme.text, backgroundColor: theme.background }}
                      />
                    </ScrollView>
                    <TouchableOpacity
                      style={{ backgroundColor: theme.icon, borderRadius: 10, paddingVertical: 13, marginTop: 8, width: '100%', alignItems: 'center' }}
                      onPress={async () => {
                        if (!adminRegData.name || !adminRegData.cpf || !adminRegData.school || !adminRegData.role || !adminRegData.newPassword) {
                          alert('Preencha todos os campos!');
                          return;
                        }
                        
                        const result = await register({
                          cpf: adminRegData.cpf,
                          name: adminRegData.name,
                          role: adminRegData.role,
                          school: adminRegData.school,
                          password: adminRegData.newPassword
                        });
                        
                        if (result.success) {
                          setAdminPassaporte('');
                          setAdminSenha('');
                          setAdminError('');
                          setShowAdminLogin(false);
                          setAdminStep(0);
                          // Reset form
                          setAdminRegData({
                            name: '', email: '', school: '', role: '', cpf: '', newPassword: ''
                          });
                          setCurrentScreen('admin');
                        } else {
                          alert('Erro no cadastro: ' + (result.error || 'Erro desconhecido'));
                        }
                      }}
                    >
                      <Text style={{ color: theme.background, fontWeight: 'bold', fontSize: 17 }}>Cadastrar e Entrar</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={() => { 
                  if (adminStep > 1) {
                    setAdminStep(1); // Voltar para escolha
                  } else if (adminStep === 1) {
                    setAdminStep(0); // Voltar para chave mestra
                  } else {
                    setShowAdminLogin(false); setAdminStep(0); 
                  }
                }} style={{ marginTop: 18 }}>
                  <Text style={{ color: theme.icon, fontSize: 15, fontWeight: 'bold' }}>
                    {adminStep === 0 ? 'Cancelar' : 'Voltar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
    </>
  );
}

// Componente App que envolve a aplicação com AuthProvider
export default function App() {
  // Inicializar monitoramento de rede uma vez quando o app carrega
  React.useEffect(() => {
    startNetworkMonitoring();
    logger.info('Monitoramento de rede iniciado');
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer 
          linking={linking} 
          fallback={
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <Text>Carregando...</Text>
            </View>
          }
        >
          <AppWrapper />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}
