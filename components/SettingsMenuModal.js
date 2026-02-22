import React from 'react';
import { Modal, View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';

const SettingsMenuModal = ({
  settingsMenuVisible,
  setSettingsMenuVisible,
  setShowAdditionalInfoModal,
  setModalVisible,
  navigation
}) => {
  const { theme, selectedMode, setSelectedMode } = useThemeContext();

  return (
    <Modal
      visible={settingsMenuVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSettingsMenuVisible(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 18, padding: 24, width: '90%', maxWidth: 400 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20 }}>Configurações</Text>
          <TouchableOpacity
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
            onPress={() => {
              setShowAdditionalInfoModal(true);
              setSettingsMenuVisible(false);
            }}
            accessibilityLabel="Informações adicionais"
          >
            <Text style={{ color: theme.text, fontSize: 16 }}>Informações Adicionais</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
            onPress={() => {
              setModalVisible(true);
              setSettingsMenuVisible(false);
            }}
            accessibilityLabel="Alterar perfil"
          >
            <Text style={{ color: theme.text, fontSize: 16 }}>Alterar Perfil</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>Modo de exibição:</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setSelectedMode('claro')} style={{ backgroundColor: selectedMode === 'claro' ? theme.border : theme.card, borderRadius: 8, padding: 10, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.text }}>Claro</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedMode('escuro')} style={{ backgroundColor: selectedMode === 'escuro' ? theme.background : theme.card, borderRadius: 8, padding: 10, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.text }}>Escuro</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 20 }}
            onPress={() => {
              Alert.alert(
                'Sair',
                'Tem certeza que deseja sair da sua conta?',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                  {
                    text: 'Sair',
                    onPress: () => {
                      // Navega para a tela de login
                      if (navigation) {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }
                    },
                    style: 'destructive',
                  },
                ]
              );
            }}
          >
            <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '600' }}>Sair</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setSettingsMenuVisible(false)} 
            style={{ backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SettingsMenuModal; 