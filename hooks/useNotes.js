/**
 * Hook para gerenciar notas e alarmes.
 * @param {function} formatAlarmTime - Função para formatar o horário do alarme.
 * @param {function} scheduleAlarm - Função para agendar um novo alarme.
 * @returns {object} Estados e funções para manipulação de notas e alarmes.
 */
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import CacheManager from '../utils/cache';

export default function useNotes(formatAlarmTime, scheduleAlarm) {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [currentAlarmTime, setCurrentAlarmTime] = useState(new Date());
  const [selectedAlarmToDelete, setSelectedAlarmToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar notas do cache ao iniciar
  useEffect(() => {
    const loadNotes = async () => {
      const savedNotes = await CacheManager.loadNotes();
      if (savedNotes && savedNotes.length > 0) {
        setNotes(savedNotes);
      }
      setIsLoaded(true);
    };
    loadNotes();
  }, []);

  // Salvar notas no cache sempre que mudar (apenas após carregar)
  useEffect(() => {
    if (isLoaded) {
      CacheManager.saveNotes(notes);
    }
  }, [notes, isLoaded]);

  // Salvar nota
  const saveNote = () => {
    if (currentNote.trim()) {
      if (editingNoteIndex !== null) {
        // Editando nota existente
        const updatedNotes = [...notes];
        updatedNotes[editingNoteIndex] = {
          ...updatedNotes[editingNoteIndex],
          content: currentNote.trim(),
          updatedAt: new Date().toISOString(),
        };
        setNotes(updatedNotes);
        setEditingNoteIndex(null);
      } else {
        // Nova nota
        const newNote = {
          id: Date.now(),
          type: 'note',
          content: currentNote.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setNotes([newNote, ...notes]);
      }
      setCurrentNote('');
    }
  };

  // Deletar nota
  const deleteNote = (noteId) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
  };

  // Editar nota
  const editNote = (noteIndex) => {
    const note = notes[noteIndex];
    setCurrentNote(note.content);
    setEditingNoteIndex(noteIndex);
  };

  // Salvar alarme
  const saveAlarm = async () => {
    if (currentAlarmTime) {
      try {
        const notificationId = await scheduleAlarm(currentAlarmTime);
        if (notificationId) {
          const newAlarm = {
            id: Date.now(),
            type: 'alarm',
            content: `Alarme para ${formatAlarmTime(currentAlarmTime)}`,
            time: currentAlarmTime,
            isEnabled: true,
            notificationId: notificationId,
            createdAt: new Date().toISOString(),
          };
          setNotes([newAlarm, ...notes]);
          setCurrentAlarmTime(new Date());
          setActiveTab('alarms');
        }
      } catch (error) {
        console.log('Erro ao salvar alarme:', error);
      }
    }
  };

  // Alternar alarme
  const toggleAlarmEnabled = (alarmId) => {
    const updatedNotes = notes.map(note => {
      if (note.id === alarmId && note.type === 'alarm') {
        return { ...note, isEnabled: !note.isEnabled };
      }
      return note;
    });
    setNotes(updatedNotes);
  };

  // Deletar alarme
  const deleteAlarm = (alarmId) => {
    const updatedNotes = notes.filter(note => note.id !== alarmId);
    setNotes(updatedNotes);
    setSelectedAlarmToDelete(null);
  };

  // Limpar todas as notas
  const clearAllNotes = () => {
    setNotes([]);
  };

  // Limpar todos os alarmes
  const clearAllAlarms = () => {
    const notesOnly = notes.filter(note => note.type === 'note');
    setNotes(notesOnly);
  };

  return {
    notes,
    setNotes,
    currentNote,
    setCurrentNote,
    editingNoteIndex,
    setEditingNoteIndex,
    currentAlarmTime,
    setCurrentAlarmTime,
    selectedAlarmToDelete,
    setSelectedAlarmToDelete,
    activeTab,
    setActiveTab,
    saveNote,
    deleteNote,
    editNote,
    saveAlarm,
    toggleAlarmEnabled,
    deleteAlarm,
    clearAllNotes,
    clearAllAlarms,
  };
} 