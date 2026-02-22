import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';

export default function AdminAccessInfoScreen({ onRequestAccess, onCancel }) {
  const { theme, selectedMode } = useThemeContext();
  const isDark = selectedMode === 'escuro';
  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Ionicons name="shield-checkmark" size={60} color={theme.icon} style={{ marginBottom: 18 }} />
      <Text style={[styles.title, { color: theme.icon } ]}>Painel Administrativo</Text>
      <Text style={[styles.text, { color: theme.text } ]}>
        O Painel Administrativo é uma área restrita para gestores e responsáveis.
        Nele é possível:
        {'\n'}• Adicionar, editar e excluir escolas
        {'\n'}• Gerenciar desempenho das escolas
        {'\n'}• Visualizar estatísticas gerais
        {'\n'}• Atualizar dados exibidos para todos os usuários
        {'\n'}Apenas pessoas autorizadas devem acessar este painel.
      </Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.icon, shadowColor: theme.icon }]} onPress={onRequestAccess}>
        <Text style={styles.buttonText}>Acessar Painel Administrativo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={{ marginTop: 18 }}>
        <Text style={{ color: theme.icon, fontWeight: 'bold', fontSize: 15 }}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
}); 