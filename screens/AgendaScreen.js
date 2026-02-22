import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';
import CacheManager from '../utils/cache';

const AgendaScreen = ({
  notes,
  searchedNotes,
  activeTab,
  setActiveTab,
  formatAlarmTime,
  toggleAlarmEnabled,
  setSelectedAlarmToDelete,
  selectedAlarmToDelete,
  deleteAlarm,
  setCurrentNote,
  setEditingNoteIndex,
  setCurrentScreen,
  saveNote,
  currentNote,
  editingNoteIndex,
  onPressAddOptions,
  commitments,
  setCommitments
}) => {
  const { theme } = useThemeContext();
  const [selectedCommitmentToDelete, setSelectedCommitmentToDelete] = useState(null);

  const handleDeleteCommitment = async (commitmentId) => {
    try {
      const updatedCommitments = commitments.filter(item => item.id !== commitmentId);
      setCommitments(updatedCommitments);
      await CacheManager.saveCommitments(updatedCommitments);
      setSelectedCommitmentToDelete(null);
    } catch (error) {
      console.log('Erro ao deletar compromisso:', error);
    }
  };

  const handleCommitmentAdded = (updatedCommitments) => {
    setCommitments(updatedCommitments);
  };

  return (
    <View style={{ flex: 1, paddingTop: 60, backgroundColor: theme.background }}>
      <View style={styles.headerImagesContainer}>
        <TouchableOpacity onPress={() => setActiveTab('alarms')} accessibilityLabel="Mostrar alarmes">
          <Ionicons name="alarm-outline" size={32} color={activeTab === 'alarms' ? theme.icon : theme.border} style={{ marginHorizontal: 40 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('agenda')} accessibilityLabel="Mostrar agenda">
          <Ionicons name="calendar-outline" size={32} color={activeTab === 'agenda' ? theme.icon : theme.border} style={{ marginHorizontal: 40 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('notes')} accessibilityLabel="Mostrar notas">
          <Ionicons name="document-outline" size={32} color={activeTab === 'notes' ? theme.icon : theme.border} style={{ marginHorizontal: 40 }} />
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {(activeTab === 'notes' || activeTab === 'all') && searchedNotes.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.noteCard, { backgroundColor: theme.card } ]}
            onPress={() => {
              const originalIndex = notes.findIndex(n => n.id === item.id);
              setCurrentNote(item.content);
              setEditingNoteIndex(originalIndex);
              setCurrentScreen('postite');
            }}
            accessibilityLabel={`Nota ${index + 1}`}
            accessibilityHint="Abre a nota para edição"
          >
            <Text numberOfLines={3} style={[styles.noteText, { color: theme.text }]}>
              {item.content}
            </Text>
          </TouchableOpacity>
        ))}
        
        {(activeTab === 'agenda' || activeTab === 'all') && commitments.map((commitment, index) => (
          <View key={commitment.id} style={styles.alarmItemContainer}>
            <TouchableOpacity
              style={[styles.noteCard, { backgroundColor: theme.card }]}
              onPress={() =>
                setSelectedCommitmentToDelete(
                  selectedCommitmentToDelete === commitment.id ? null : commitment.id
                )
              }
              accessibilityLabel={`Compromisso ${index + 1}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="calendar" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.noteText, { color: theme.primary, fontWeight: 'bold', fontSize: 14 }]}>
                  {new Date(commitment.date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={[styles.noteText, { color: theme.text }]}>
                {commitment.text}
              </Text>
            </TouchableOpacity>
            {selectedCommitmentToDelete === commitment.id && (
              <TouchableOpacity
                style={styles.deleteAlarmButton}
                onPress={() => handleDeleteCommitment(commitment.id)}
                accessibilityLabel="Excluir compromisso"
              >
                <Ionicons name="close" size={20} color={theme.card} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {(activeTab === 'alarms' || activeTab === 'all') && notes.filter(item => item.type === 'alarm').map((item, index) => {
          // Extrai o horário do alarme do conteúdo ou formata a data diretamente
          let alarmTime;
          try {
            if (item.time) {
              // Se tiver um objeto de data, formata corretamente
              const date = new Date(item.time);
              alarmTime = date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            } else {
              // Se não tiver data, tenta extrair do conteúdo
              alarmTime = item.content.replace('Alarme para ', '');
            }
          } catch (error) {
            console.error('Erro ao formatar horário do alarme:', error);
            alarmTime = 'Horário inválido';
          }
          
          return (
            <View key={item.id} style={styles.alarmItemContainer}>
              <TouchableOpacity
                style={[styles.noteCard, styles.alarmCard, { backgroundColor: theme.card }, !item.isEnabled && styles.alarmCardDisabled]}
                accessibilityLabel={`Alarme marcado para ${alarmTime}`}
                onPress={() => setSelectedAlarmToDelete(selectedAlarmToDelete === item.id ? null : item.id)}
              >
                <View style={styles.alarmContent}>
                  <View>
                    <Text style={[styles.alarmTimeText, { color: theme.text }]}>{alarmTime}</Text>
                    <Text style={[styles.alarmSubtitleText, { color: theme.text }]}>Alarme agendado</Text>
                  </View>
                  <Switch
                    trackColor={{ false: theme.border, true: theme.icon }}
                    thumbColor={item.isEnabled ? theme.text : theme.card}
                    ios_backgroundColor={theme.border}
                    value={item.isEnabled}
                    onValueChange={(newValue) => toggleAlarmEnabled(item.id, newValue)}
                  />
                </View>
              </TouchableOpacity>
              {selectedAlarmToDelete === item.id && (
                <TouchableOpacity
                  style={styles.deleteAlarmButton}
                  onPress={() => deleteAlarm(item.id, item.notificationId)}
                  accessibilityLabel="Excluir alarme"
                >
                  <Ionicons name="close" size={20} color={theme.card} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.text }]}
        onPress={onPressAddOptions}
        accessibilityLabel="Adicionar novo item"
        accessibilityHint="Abre menu de opções para criar post-ite ou agendar alarme"
      >
        <Text style={[styles.fabText, { color: theme.card }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AgendaScreen; 
