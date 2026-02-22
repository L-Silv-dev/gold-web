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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const SignupScreen = ({ 
  onSignup, 
  onSwitchToLogin, 
  formData,
  setFormData,
  isLoading = false 
}) => {
  const { theme, selectedMode } = useThemeContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showCPF, setShowCPF] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
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
      return 'E-mail é obrigatório';
    } else if (!emailRegex.test(email)) {
      return 'E-mail inválido';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Senha é obrigatória';
    } else if (password.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    return '';
  };

  const validateName = (name) => {
    if (!name) {
      return 'Nome é obrigatório';
    } else if (name.length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres';
    }
    return '';
  };

  const validateCPF = (cpf) => {
    if (!cpf) {
      return 'CPF é obrigatório';
    }
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      return 'CPF deve ter 11 dígitos';
    }
    // Validação básica de CPF
    if (/(\d)\1{10}/.test(cleanCPF)) {
      return 'CPF inválido';
    }
    return '';
  };

  const validateBirthDate = (date) => {
    if (!date) {
      return 'Data de nascimento é obrigatória';
    }
    const today = new Date();
    const birthDate = new Date(date);
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
      return 'Você deve ter pelo menos 13 anos';
    } else if (age > 120) {
      return 'Data de nascimento inválida';
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      name: validateName(formData.name),
      cpf: validateCPF(formData.cpf),
      birthDate: validateBirthDate(formData.birthDate),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSignup = () => {
    if (validateForm()) {
      onSignup();
    }
  };

  const formatCPF = (text) => {
    const cleanText = text.replace(/\D/g, '');
    const formatted = cleanText.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return formatted;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR');
  };

  const isDark = selectedMode === 'escuro';

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingVertical: 20,
          }}
          showsVerticalScrollIndicator={false}
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
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: isDark ? '#10b981' : '#059669',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                shadowColor: isDark ? '#10b981' : '#059669',
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 8,
              }}>
                <Ionicons name="person-add" size={40} color="#fff" />
              </View>
              <Text style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: isDark ? '#f1f5f9' : '#1e293b',
                marginBottom: 8,
              }}>
                Criar Conta
              </Text>
              <Text style={{
                fontSize: 16,
                color: isDark ? '#94a3b8' : '#64748b',
                textAlign: 'center',
              }}>
                Junte-se à nossa comunidade educacional
              </Text>
            </View>

            {/* Card de cadastro */}
            <View style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderRadius: 24,
              padding: 32,
              shadowColor: isDark ? '#000' : '#059669',
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
                Vamos começar!
              </Text>

              {/* Campo Nome */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#e2e8f0' : '#374151',
                  marginBottom: 8,
                }}>
                  Nome Completo
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#334155' : '#f8fafc',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: errors.name ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}>
                  <Ionicons 
                    name="person-outline" 
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
                    placeholder="Digite seu nome completo"
                    placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      if (errors.name) {
                        setErrors({ ...errors, name: validateName(text) });
                      }
                    }}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
                {errors.name ? (
                  <Text style={{
                    color: '#ef4444',
                    fontSize: 14,
                    marginTop: 4,
                    marginLeft: 4,
                  }}>
                    {errors.name}
                  </Text>
                ) : null}
              </View>

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
                  borderColor: errors.email ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
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
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      if (errors.email) {
                        setErrors({ ...errors, email: validateEmail(text) });
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
                {errors.email ? (
                  <Text style={{
                    color: '#ef4444',
                    fontSize: 14,
                    marginTop: 4,
                    marginLeft: 4,
                  }}>
                    {errors.email}
                  </Text>
                ) : null}
              </View>

              {/* Campo Data de Nascimento */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#e2e8f0' : '#374151',
                  marginBottom: 8,
                }}>
                  Data de Nascimento
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#334155' : '#f8fafc',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: errors.birthDate ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                  }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{
                    flex: 1,
                    fontSize: 16,
                    color: formData.birthDate ? (isDark ? '#f1f5f9' : '#1e293b') : (isDark ? '#64748b' : '#9ca3af'),
                  }}>
                    {formData.birthDate ? formatDate(formData.birthDate) : 'Selecione sua data de nascimento'}
                  </Text>
                </TouchableOpacity>
                {errors.birthDate ? (
                  <Text style={{
                    color: '#ef4444',
                    fontSize: 14,
                    marginTop: 4,
                    marginLeft: 4,
                  }}>
                    {errors.birthDate}
                  </Text>
                ) : null}
              </View>

              {/* Campo CPF */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#e2e8f0' : '#374151',
                  marginBottom: 8,
                }}>
                  CPF
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#334155' : '#f8fafc',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: errors.cpf ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}>
                  <Ionicons 
                    name="card-outline" 
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
                    placeholder="000.000.000-00"
                    placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                    value={formData.cpf}
                    onChangeText={(text) => {
                      const formatted = formatCPF(text);
                      setFormData({ ...formData, cpf: formatted });
                      if (errors.cpf) {
                        setErrors({ ...errors, cpf: validateCPF(formatted) });
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>
                {errors.cpf ? (
                  <Text style={{
                    color: '#ef4444',
                    fontSize: 14,
                    marginTop: 4,
                    marginLeft: 4,
                  }}>
                    {errors.cpf}
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
                  borderColor: errors.password ? '#ef4444' : (isDark ? '#475569' : '#e2e8f0'),
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
                    value={formData.password}
                    onChangeText={(text) => {
                      setFormData({ ...formData, password: text });
                      if (errors.password) {
                        setErrors({ ...errors, password: validatePassword(text) });
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
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
                {errors.password ? (
                  <Text style={{
                    color: '#ef4444',
                    fontSize: 14,
                    marginTop: 4,
                    marginLeft: 4,
                  }}>
                    {errors.password}
                  </Text>
                ) : null}
              </View>

              {/* Botão de Cadastro */}
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? '#10b981' : '#059669',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginBottom: 24,
                  shadowColor: isDark ? '#10b981' : '#059669',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  opacity: isLoading ? 0.7 : 1,
                }}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="reload" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                      Criando conta...
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    Criar Conta
                  </Text>
                )}
              </TouchableOpacity>

              {/* Link para Login */}
              <TouchableOpacity
                onPress={onSwitchToLogin}
                style={{ alignItems: 'center' }}
              >
                <Text style={{
                  color: isDark ? '#10b981' : '#059669',
                  fontSize: 16,
                  fontWeight: '500',
                }}>
                  Já tem uma conta?{' '}
                  <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    Entrar
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DatePicker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.birthDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData({ ...formData, birthDate: selectedDate });
              if (errors.birthDate) {
                setErrors({ ...errors, birthDate: validateBirthDate(selectedDate) });
              }
            }
          }}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </SafeAreaView>
  );
};

export default SignupScreen; 