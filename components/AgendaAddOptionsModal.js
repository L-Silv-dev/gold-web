import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CacheManager from '../utils/cache';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';

const AgendaAddOptionsModal = ({
  optionMenuVisible,
  setOptionMenuVisible,
  setCurrentScreen,
  setCurrentNote,
  setEditingNoteIndex,
  setCurrentAlarmTime,
  setShowAlarmModal,
  onCommitmentAdded
}) => {
  const { theme } = useThemeContext();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [commitmentText, setCommitmentText] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const saveCommitment = async (date, text) => {
    try {
      const commitment = {
        id: Date.now().toString(),
        date: date.toISOString(),
        text: text.trim(),
        createdAt: new Date().toISOString()
      };

      // Carregar compromissos existentes
      const existingCommitments = await CacheManager.loadCommitments();
      
      // Adicionar novo compromisso
      const updatedCommitments = [...existingCommitments, commitment];
      
      // Salvar no cache
      await CacheManager.saveCommitments(updatedCommitments);
      
      // Chamar callback para atualizar a lista
      if (onCommitmentAdded) {
        onCommitmentAdded(updatedCommitments);
      }
      
      return true;
    } catch (error) {
      console.log('Erro ao salvar compromisso:', error);
      return false;
    }
  };

  return (
    <>
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
                <Text style={[styles.optionText, { color: theme.text }]}>Criar Postite</Text>
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
              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: theme.card, marginTop: 10 }]}
                onPress={() => {
                  setOptionMenuVisible(false);
                  setShowCalendarModal(true);
                  setSelectedDate(null);
                  setCommitmentText('');
                }}
                accessibilityLabel="Agendar novo compromisso"
              >
                <Text style={[styles.optionText, { color: theme.text }]}>Agendar Compromissos</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Calendário para Compromissos */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.optionMenu, { backgroundColor: theme.card, width: '90%', maxHeight: '80%' }]}>
            {/* Header do Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.optionText, { color: theme.text, fontSize: 20, fontWeight: 'bold' }]}>
                Agendar Compromisso
              </Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Navegação do Mês */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => {
                const prevMonth = new Date(currentMonth);
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                setCurrentMonth(prevMonth);
              }}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.optionText, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}>
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => {
                const nextMonth = new Date(currentMonth);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                setCurrentMonth(nextMonth);
              }}>
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Dias da Semana */}
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.optionText, { color: theme.textSecondary, fontSize: 12 }]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendário */}
            <ScrollView style={{ maxHeight: 300 }}>
              {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                const days = [];
                for (let i = 0; i < 42; i++) {
                  const date = new Date(startDate);
                  date.setDate(startDate.getDate() + i);
                  days.push(date);
                }

                const weeks = [];
                for (let i = 0; i < days.length; i += 7) {
                  weeks.push(days.slice(i, i + 7));
                }

                return weeks.map((week, weekIndex) => (
                  <View key={weekIndex} style={{ flexDirection: 'row', marginBottom: 5 }}>
                    {week.map((date, dayIndex) => {
                      const isCurrentMonth = date.getMonth() === month;
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                      
                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          style={{
                            flex: 1,
                            height: 40,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isSelected ? theme.primary : 'transparent',
                            borderRadius: 20,
                            margin: 2,
                            opacity: isCurrentMonth ? 1 : 0.3
                          }}
                          onPress={() => {
                            if (isCurrentMonth) {
                              setSelectedDate(date);
                            }
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            {
                              color: isSelected ? '#fff' : (isToday ? theme.primary : theme.text),
                              fontWeight: isToday ? 'bold' : 'normal',
                              fontSize: 14
                            }
                          ]}>
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()}
            </ScrollView>

            {/* Data Selecionada */}
            {selectedDate && (
              <View style={{ marginTop: 20, marginBottom: 15 }}>
                <Text style={[styles.optionText, { color: theme.text, fontSize: 16, fontWeight: 'bold' }]}>
                  Data Selecionada: {selectedDate.toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}

            {/* Campo de Texto para Compromisso */}
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 12,
                color: theme.text,
                backgroundColor: theme.background,
                marginBottom: 20,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              placeholder="Digite seu compromisso..."
              placeholderTextColor={theme.textSecondary}
              value={commitmentText}
              onChangeText={setCommitmentText}
              multiline
              numberOfLines={3}
            />

            {/* Botões */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: theme.border, flex: 0.48 }]}
                onPress={() => setShowCalendarModal(false)}
              >
                <Text style={[styles.optionText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: selectedDate && commitmentText.trim() ? theme.primary : theme.border,
                    flex: 0.48
                  }
                ]}
                onPress={() => {
                  if (selectedDate && commitmentText.trim()) {
                    saveCommitment(selectedDate, commitmentText);
                    setShowCalendarModal(false);
                    setSelectedDate(null);
                    setCommitmentText('');
                  }
                }}
                disabled={!selectedDate || !commitmentText.trim()}
              >
                <Text style={[
                  styles.optionText,
                  { color: selectedDate && commitmentText.trim() ? '#fff' : theme.textSecondary }
                ]}>
                  Salvar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AgendaAddOptionsModal; 