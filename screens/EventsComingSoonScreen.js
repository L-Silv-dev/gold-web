import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';

const EventsComingSoonScreen = ({ setCurrentScreen }) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Botão voltar */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentScreen('statistics')}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Conteúdo central */}
      <View style={styles.content}>
        {/* Ícone de mistério/ansiedade */}
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={120} color={theme.icon} />
          <View style={styles.mysteryOverlay}>
            <Ionicons name="help-circle" size={40} color={theme.primary} />
          </View>
        </View>

        {/* Título */}
        <Text style={[styles.title, { color: theme.text }]}>
          Eventos da Gideon
        </Text>

        {/* Subtítulo */}
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Em breve...
        </Text>

        {/* Mensagem */}
        <Text style={[styles.message, { color: theme.text }]}>
          Aguarde! Estamos preparando eventos incríveis para você.
        </Text>

        {/* Ícones de ansiedade/mistério */}
        <View style={styles.mysteryIcons}>
          <Ionicons name="sparkles" size={24} color={theme.primary} style={styles.sparkle} />
          <Ionicons name="sparkles" size={20} color={theme.icon} style={styles.sparkle} />
          <Ionicons name="sparkles" size={28} color={theme.primary} style={styles.sparkle} />
        </View>

        {/* Botão voltar */}
        <TouchableOpacity
          style={[styles.backToStatsButton, { backgroundColor: theme.icon }]}
          onPress={() => setCurrentScreen('statistics')}
        >
          <Ionicons name="arrow-back" size={20} color={theme.background} />
          <Text style={[styles.backToStatsText, { color: theme.background }]}>
            Voltar às Estatísticas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  mysteryOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.8,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    opacity: 0.7,
  },
  mysteryIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  sparkle: {
    marginHorizontal: 8,
    opacity: 0.8,
  },
  backToStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backToStatsText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EventsComingSoonScreen; 