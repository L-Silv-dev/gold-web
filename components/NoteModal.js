import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';

const NoteModal = ({
  currentScreen,
  setCurrentScreen,
  editingNoteIndex,
  setEditingNoteIndex,
  currentNote,
  setCurrentNote,
  saveNote,
  deleteNote,
  notes // Adiciona notes como prop
}) => {
  const { theme, selectedMode } = useThemeContext();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={currentScreen === 'postite'}
      onRequestClose={() => setCurrentScreen('agenda')}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, selectedMode === 'escuro' && styles.modalViewDark]}>
          <Text style={[styles.modalTitle, selectedMode === 'escuro' && { color: theme.text }]}>
            {editingNoteIndex !== null ? 'Editar Postite' : 'Criar Postite'}
          </Text>
          <TextInput
            style={[styles.modalTextInput, { height: 100, textAlignVertical: 'top' }, selectedMode === 'escuro' && { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            placeholder="Escreva seu postite aqui..."
            placeholderTextColor={selectedMode === 'escuro' ? '#bbb' : theme.text}
            multiline={true}
            onChangeText={setCurrentNote}
            value={currentNote}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
            <TouchableOpacity
              style={[styles.modalButton, { flex: 1, marginRight: 5 }]}
              onPress={() => {
                saveNote();
                setCurrentScreen('agenda');
              }}
            >
              <Text style={[styles.buttonText, selectedMode === 'escuro' && { color: theme.text }]}>Salvar</Text>
            </TouchableOpacity>
            {editingNoteIndex !== null && (
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#dc3545', flex: 1, marginHorizontal: 5 }]}
                onPress={() => {
                  if (notes && notes[editingNoteIndex]) {
                    deleteNote(notes[editingNoteIndex].id);
                  }
                  setCurrentScreen('agenda');
                }}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>Apagar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonClose, { flex: 1, marginLeft: 5 }]}
              onPress={() => {
                setCurrentNote('');
                setEditingNoteIndex(null);
                setCurrentScreen('agenda');
              }}
            >
              <Text style={[styles.textStyle, selectedMode === 'escuro' && { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NoteModal; 