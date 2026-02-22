import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';

const LoginScreen = ({ 
  onLogin, 
  onSwitchToSignup, 
  email, 
  setEmail, 
  password, 
  setPassword,
  isLoading = false 
}) => {
  const { theme, selectedMode } = useThemeContext();
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('E-mail é obrigatório');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('E-mail inválido');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const validatePassword = (password) => {
    if (!password) {
      setPasswordError('Senha é obrigatória');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Senha deve ter pelo menos 6 caracteres');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };

  const handleLogin = () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (isEmailValid && isPasswordValid) {
      onLogin();
    }
  };

  const isDark = selectedMode === 'escuro';

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
      >
        {/* Background com gradiente */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        }}>
          {/* Círculos decorativos */}
          <View style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: isDark ? '#1e293b' : '#e0e7ff',
            opacity: 0.3,
          }} />
          <View style={{
            position: 'absolute',
            top: 120,
            left: 180,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: isDark ? '#334155' : '#a5b4fc',
            opacity: 0.2,
          }} />
          <View style={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: isDark ? '#475569' : '#c7d2fe',
            opacity: 0.15,
          }} />
        </View>

        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          width: '90%',
          maxWidth: 400,
        }}>
          {/* Logo/Ícone */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? '#3b82f6' : '#6366f1',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: isDark ? '#3b82f6' : '#6366f1',
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 8,
            }}>
              <Ionicons name="school" size={40} color="#fff" />
            </View>
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: isDark ? '#f1f5f9' : '#1e293b',
              marginBottom: 8,
            }}>
              Gideon
            </Text>
            <Text style={{
              fontSize: 16,
              color: isDark ? '#94a3b8' : '#64748b',
              textAlign: 'center',
            }}>
              Sua plataforma educacional
            </Text>
          </View>

          {/* Card de login */}
          <View style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRadius: 24,
            padding: 32,
            shadowColor: isDark ? '#000' : '#6366f1',
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#e2e8f0',
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: isDark ? '#f1f5f9' : '#1e293b',
              marginBottom: 32,
              textAlign: 'center',
            }}>
              Bem-vindo!
            </Text>

            {/* Campo E-mail */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? '#e2e8f0' : '#374151',
                marginBottom: 8,
              }}>
                E-mail
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#334155' : '#f8fafc',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: emailError ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    paddingVertical: 12,
                  }}
                  placeholder="Digite seu e-mail"
                  placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) validateEmail(text);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
              {emailError ? (
                <Text style={{
                  color: '#ef4444',
                  fontSize: 14,
                  marginTop: 4,
                  marginLeft: 4,
                }}>
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Campo Senha */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? '#e2e8f0' : '#374151',
                marginBottom: 8,
              }}>
                Senha
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#334155' : '#f8fafc',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: passwordError ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    paddingVertical: 12,
                  }}
                  placeholder="Digite sua senha"
                  placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={22} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={{
                  color: '#ef4444',
                  fontSize: 14,
                  marginTop: 4,
                  marginLeft: 4,
                }}>
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Botão de Login */}
            <TouchableOpacity
              style={{
                backgroundColor: isDark ? '#3b82f6' : '#6366f1',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 24,
                shadowColor: isDark ? '#3b82f6' : '#6366f1',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="reload" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    Entrando...
                  </Text>
                </View>
              ) : (
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  Entrar
                </Text>
              )}
            </TouchableOpacity>

            {/* Link para Cadastro */}
            <TouchableOpacity
              onPress={onSwitchToSignup}
              style={{ alignItems: 'center' }}
            >
              <Text style={{
                color: isDark ? '#3b82f6' : '#6366f1',
                fontSize: 16,
                fontWeight: '500',
              }}>
                Não tem uma conta?{' '}
                <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                  Cadastre-se
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen; 