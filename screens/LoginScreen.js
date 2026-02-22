import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation, onLogin, route }) => {
  const { signInWithEmail, resetPassword } = useAuth();
  const { theme } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Preencher email se vier da tela de cadastro
  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, insira um email válido');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      const { data, error: signInError } = await signInWithEmail(email.trim(), password);
      
      if (signInError) {
        console.error('Erro ao fazer login:', signInError);
        
        // Tratamento de erros mais amigável
        if (signInError.message.includes('Invalid login credentials') || 
            signInError.message.includes('Invalid credentials')) {
          setError('Email ou senha incorretos');
        } else if (signInError.message.includes('Email not confirmed') ||
                   signInError.message.includes('email_not_confirmed')) {
          setError('Por favor, verifique seu email para confirmar sua conta');
        } else if (signInError.message.includes('too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(signInError.message || 'Ocorreu um erro ao fazer login. Tente novamente.');
        }
        
        return;
      }
      
      // Se chegou aqui, o login foi bem-sucedido
      if (onLogin) {
        onLogin();
      }
      
    } catch (error) {
      console.error('Erro inesperado ao fazer login:', error);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignUp = () => {
    navigation.navigate('Register', { email });
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Atenção', 'Por favor, insira seu email para redefinir a senha');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Atenção', 'Por favor, insira um email válido');
      return;
    }
    
    try {
      setIsLoading(true);
      const { error } = await resetPassword(email.trim());
      
      if (error) throw error;
      
      Alert.alert(
        'Email enviado',
        'Enviamos um link para redefinir sua senha para o seu email. Verifique sua caixa de entrada e a pasta de spam.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao enviar email de redefinição de senha:', error);
      
      // Tratamento de erros específicos
      if (error.message.includes('For security purposes')) {
        const seconds = error.message.match(/\d+/)?.[0] || 'alguns';
        Alert.alert(
          'Aguarde um momento',
          `Por questões de segurança, você só pode solicitar um novo link após ${seconds} segundos.`
        );
      } else if (error.message.includes('user not found')) {
        Alert.alert(
          'Email não encontrado',
          'Não encontramos nenhuma conta com este endereço de email.'
        );
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível enviar o email de redefinição de senha. Por favor, tente novamente mais tarde.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={theme.isDark ? [theme.background, '#1a1a2e'] : [theme.background, '#f0f4f8']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="school-outline" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.primary }]}>Bem-vindo</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Acesse sua conta para continuar seus estudos
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff3b30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: theme.text }]}>E-mail</Text>
                <View style={[
                  styles.inputContainer, 
                  isEmailFocused && { borderColor: theme.primary, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#fff' },
                  { backgroundColor: theme.cardBackground }
                ]}>
                  <Ionicons name="mail-outline" size={20} color={isEmailFocused ? theme.primary : theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="seu@email.com"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: theme.text }]}>Senha</Text>
                <View style={[
                  styles.inputContainer, 
                  isPasswordFocused && { borderColor: theme.primary, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#fff' },
                  { backgroundColor: theme.cardBackground }
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color={isPasswordFocused ? theme.primary : theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1, color: theme.text }]}
                    placeholder="Sua senha"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="password"
                    textContentType="password"
                    editable={!isLoading}
                    onSubmitEditing={handleLogin}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    style={styles.togglePassword}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, { 
                  opacity: isLoading ? 0.7 : 1,
                  shadowColor: theme.primary,
                }]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'dd']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Não tem uma conta?
              </Text>
              <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>
                  Cadastre-se agora
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  togglePassword: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 10,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
});

export default LoginScreen;
