import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserContext } from '../contexts/UserContext';
import { useThemeContext } from '../contexts/ThemeContext';

const AdditionalInfoModal = ({ visible, onClose }) => {
  const { name, userEmail, userSchool } = useUserContext();
  const { theme } = useThemeContext();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-circle-outline" size={30} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Informações Adicionais</Text>

        <View style={styles.infoSection}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>Nome:</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>{name}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>Email:</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>{userEmail}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>Escola:</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>{userSchool}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 18,
  },
});

export default AdditionalInfoModal; 