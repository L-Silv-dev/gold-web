import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthRecovery from '../utils/authRecovery';

const AuthRecoveryButton = ({ style, textStyle }) => {
  const { clearAuthStorage } = useAuth();

  const handleRecovery = async () => {
    Alert.alert(
      'Corrigir Problemas de Login',
      'Isso irá limpar todos os dados de autenticação e você precisará fazer login novamente. Continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Corrigir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Usar a função do contexto ou a utilitária
              if (clearAuthStorage) {
                await clearAuthStorage();
              } else {
                await AuthRecovery.forceLogout();
              }
              
              Alert.alert(
                'Sucesso',
                'Dados de autenticação limpos. Você pode fazer login novamente.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Erro na recuperação:', error);
              Alert.alert(
                'Erro',
                'Não foi possível limpar os dados. Tente reiniciar o app.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handleRecovery}
    >
      <Text style={[styles.buttonText, textStyle]}>
        Corrigir Problemas de Login
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AuthRecoveryButton;