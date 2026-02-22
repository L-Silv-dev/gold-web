import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkUsernameAvailability } from '../services/userService';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';

const RegisterScreen = ({ navigation }) => {
  const { signUpWithEmail } = useAuth();
  const { theme } = useThemeContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null = não verificado, true = disponível, false = em uso

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateUsername = (username) => {
    // Username deve ter entre 3 e 20 caracteres, apenas letras, números e underscore
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
  };

  const checkUsername = async (value) => {
    if (!value) {
      setUsernameError('');
      setUsernameAvailable(null);
      return;
    }

    if (!validateUsername(value)) {
      setUsernameError('Username deve ter 3-20 caracteres (letras, números e _)');
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    setUsernameAvailable(null);

    try {
      const { available, error: checkError } = await checkUsernameAvailability(value);
      
      if (checkError) {
        setUsernameError('Erro ao verificar username. Tente novamente.');
        setUsernameAvailable(false);
        return;
      }

      if (available) {
        setUsernameAvailable(true);
        setUsernameError(''); // Limpar erro se estiver disponível
      } else {
        setUsernameAvailable(false);
        setUsernameError('Este username já está em uso');
      }
    } catch (error) {
      console.error('Erro ao verificar username:', error);
      setUsernameError('Erro ao verificar username. Tente novamente.');
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleRegister = async () => {
    // Validação dos campos
    if (!name || !email || !password || !confirmPassword || !school || !username) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (name.length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido');
      return;
    }

    if (!validateUsername(username)) {
      setError('Username inválido. Use 3-20 caracteres (letras, números e _)');
      return;
    }

    if (usernameAvailable === null && username) {
      setError('Por favor, aguarde a verificação do username');
      return;
    }

    if (usernameError || usernameAvailable === false) {
      setError('Por favor, escolha um username disponível');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      // Verificar novamente se o username está disponível
      const { available } = await checkUsernameAvailability(username);
      if (!available) {
        setError('Este username já está em uso. Escolha outro.');
        setIsLoading(false);
        return;
      }

      // Criar o usuário no Supabase
      const { data, error: signUpError } = await signUpWithEmail(email, password, {
        name,
        school,
        username: username.toLowerCase().trim()
      });

      if (signUpError) {
        console.error('Erro ao cadastrar:', signUpError);
        
        // Tratamento de erros mais amigável
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (signUpError.message.includes('weak_password')) {
          setError('A senha é muito fraca. Use uma senha mais forte.');
        } else if (signUpError.message.includes('email')) {
          setError('Por favor, insira um email válido.');
        } else {
          setError(signUpError.message || 'Ocorreu um erro ao criar sua conta. Tente novamente.');
        }
        
        return;
      }

      // Se chegou aqui, o cadastro foi bem-sucedido
      Alert.alert(
        'Conta criada com sucesso!',
        'Sua conta foi criada. Verifique seu email para confirmar a conta e faça seu login!.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login', { email })
          }
        ]
      );
      
    } catch (error) {
      console.error('Erro inesperado ao cadastrar:', error);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text style={[styles.title, { color: theme.text }]}>Criar Conta</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Preencha os dados para se cadastrar
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Nome Completo</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Digite seu nome completo"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <TextInput
                  style={[styles.input, styles.usernameInput, { 
                    backgroundColor: theme.cardBackground, 
                    color: theme.text,
                    borderColor: usernameAvailable === false ? '#D32F2F' : 
                                usernameAvailable === true ? '#4CAF50' : 
                                theme.border 
                  }]}
                  placeholder="escolha_um_username"
                  placeholderTextColor={theme.textSecondary}
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    checkUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  }}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!isLoading}
                />
                {checkingUsername && (
                  <ActivityIndicator size="small" color={theme.primary} style={styles.checkingIndicator} />
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.checkingIndicator} />
                )}
                {!checkingUsername && usernameAvailable === false && username && (
                  <Ionicons name="close-circle" size={20} color="#D32F2F" style={styles.checkingIndicator} />
                )}
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatusText, { color: theme.textSecondary }]}>
                  Verificando disponibilidade...
                </Text>
              ) : usernameError ? (
                <Text style={styles.usernameErrorText}>{usernameError}</Text>
              ) : usernameAvailable === true && username ? (
                <Text style={styles.usernameSuccessText}>✓ Username disponível</Text>
              ) : username && usernameAvailable === false ? (
                <Text style={styles.usernameErrorText}>✗ Este username já está em uso</Text>
              ) : username && validateUsername(username) ? (
                <Text style={[styles.usernameStatusText, { color: theme.textSecondary }]}>
                  Digite para verificar disponibilidade
                </Text>
              ) : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Escola/Instituição</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Digite o nome da sua escola"
                placeholderTextColor={theme.textSecondary}
                value={school}
                onChangeText={setSchool}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Senha (mínimo 6 caracteres)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Digite sua senha"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, { marginBottom: 20 }]}>
              <Text style={[styles.label, { color: theme.text }]}>Confirmar Senha</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Confirme sua senha"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleRegister}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton, 
                isLoading && styles.disabledButton,
                { backgroundColor: theme.primary }
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>
                  Criar Conta
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: theme.textSecondary }]}>Já tem uma conta? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login', { email })}
                disabled={isLoading}
              >
                <Text style={[styles.loginLink, { color: theme.primary }]}>Faça login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
  },
  checkingIndicator: {
    marginLeft: 10,
  },
  usernameErrorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 5,
  },
  usernameSuccessText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  usernameStatusText: {
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  registerButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontWeight: '500',
    fontSize: 14,
  },
});

export default RegisterScreen;
