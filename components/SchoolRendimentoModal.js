import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSchoolContext } from '../contexts/SchoolContext';

const unidades = ['1ª Unidade', '2ª Unidade', '3ª Unidade', '4ª Unidade'];

export default function SchoolRendimentoModal({ visible, onClose, school }) {
  const { theme } = useThemeContext();
  const { updateSchoolRendimento } = useSchoolContext();
  
  const [rendimentoData, setRendimentoData] = useState({
    unidade1: { numAlunos: '', porcentagem: '' },
    unidade2: { numAlunos: '', porcentagem: '' },
    unidade3: { numAlunos: '', porcentagem: '' },
    unidade4: { numAlunos: '', porcentagem: '' }
  });

  const handleInputChange = (unidade, field, value) => {
    setRendimentoData(prev => ({
      ...prev,
      [unidade]: {
        ...prev[unidade],
        [field]: value
      }
    }));
  };

  const validateData = () => {
    for (let i = 1; i <= 4; i++) {
      const unidade = `unidade${i}`;
      const data = rendimentoData[unidade];
      
      if (!data.numAlunos || !data.porcentagem) {
        Alert.alert('Erro', `Preencha todos os campos da ${unidades[i-1]}`);
        return false;
      }
      
      const numAlunos = parseInt(data.numAlunos);
      const porcentagem = parseFloat(data.porcentagem);
      
      if (isNaN(numAlunos) || numAlunos <= 0) {
        Alert.alert('Erro', `Número de alunos inválido na ${unidades[i-1]}`);
        return false;
      }
      
      if (isNaN(porcentagem) || porcentagem < 0 || porcentagem > 100) {
        Alert.alert('Erro', `Porcentagem deve estar entre 0 e 100 na ${unidades[i-1]}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateData()) return;
    
    const formattedData = {
      unidade1: {
        numAlunos: parseInt(rendimentoData.unidade1.numAlunos),
        porcentagem: parseFloat(rendimentoData.unidade1.porcentagem)
      },
      unidade2: {
        numAlunos: parseInt(rendimentoData.unidade2.numAlunos),
        porcentagem: parseFloat(rendimentoData.unidade2.porcentagem)
      },
      unidade3: {
        numAlunos: parseInt(rendimentoData.unidade3.numAlunos),
        porcentagem: parseFloat(rendimentoData.unidade3.porcentagem)
      },
      unidade4: {
        numAlunos: parseInt(rendimentoData.unidade4.numAlunos),
        porcentagem: parseFloat(rendimentoData.unidade4.porcentagem)
      }
    };
    
    updateSchoolRendimento(school.id, formattedData);
    Alert.alert('Sucesso', 'Dados de rendimento salvos com sucesso!');
    handleClose();
  };

  const handleClose = () => {
    setRendimentoData({
      unidade1: { numAlunos: '', porcentagem: '' },
      unidade2: { numAlunos: '', porcentagem: '' },
      unidade3: { numAlunos: '', porcentagem: '' },
      unidade4: { numAlunos: '', porcentagem: '' }
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <View style={{ 
          backgroundColor: theme.card, 
          borderRadius: 18, 
          padding: 24, 
          width: '95%', 
          maxWidth: 420, 
          maxHeight: '90%' 
        }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="school" size={24} color={theme.icon} />
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                marginLeft: 12,
                color: theme.text 
              }}>
                Dados de Rendimento
              </Text>
            </View>
            
            <Text style={{ 
              fontSize: 16, 
              marginBottom: 20, 
              textAlign: 'center',
              color: theme.text,
              fontWeight: '600'
            }}>
              {school?.name}
            </Text>

            {unidades.map((unidade, index) => {
              const unidadeKey = `unidade${index + 1}`;
              const data = rendimentoData[unidadeKey];
              
              return (
                <View key={unidadeKey} style={{ 
                  borderWidth: 1, 
                  borderColor: theme.border, 
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 16,
                  backgroundColor: theme.background
                }}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 16, 
                    marginBottom: 12,
                    color: theme.text
                  }}>
                    {unidade}
                  </Text>
                  
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ 
                      fontSize: 14, 
                      marginBottom: 6,
                      color: theme.text 
                    }}>
                      Número de Alunos:
                    </Text>
                    <TextInput
                      style={{ 
                        borderWidth: 1, 
                        borderColor: theme.border, 
                        borderRadius: 8, 
                        padding: 12, 
                        fontSize: 16,
                        color: theme.text,
                        backgroundColor: theme.card
                      }}
                      placeholder="Ex: 150"
                      placeholderTextColor={theme.text}
                      keyboardType="numeric"
                      value={data.numAlunos}
                      onChangeText={(value) => handleInputChange(unidadeKey, 'numAlunos', value)}
                    />
                  </View>
                  
                  <View>
                    <Text style={{ 
                      fontSize: 14, 
                      marginBottom: 6,
                      color: theme.text 
                    }}>
                      Porcentagem de Rendimento:
                    </Text>
                    <TextInput
                      style={{ 
                        borderWidth: 1, 
                        borderColor: theme.border, 
                        borderRadius: 8, 
                        padding: 12, 
                        fontSize: 16,
                        color: theme.text,
                        backgroundColor: theme.card
                      }}
                      placeholder="Ex: 85.5"
                      placeholderTextColor={theme.text}
                      keyboardType="numeric"
                      value={data.porcentagem}
                      onChangeText={(value) => handleInputChange(unidadeKey, 'porcentagem', value)}
                    />
                  </View>
                </View>
              );
            })}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity 
                onPress={handleSave}
                style={{ 
                  flex: 1,
                  backgroundColor: theme.primary, 
                  borderRadius: 12, 
                  padding: 16, 
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={{ 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: 16,
                  marginLeft: 8
                }}>
                  Salvar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleClose}
                style={{ 
                  flex: 1,
                  backgroundColor: theme.icon, 
                  borderRadius: 12, 
                  padding: 16, 
                  alignItems: 'center',
                  shadowColor: theme.icon,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Ionicons name="close" size={20} color={theme.card} />
                <Text style={{ 
                  color: theme.card, 
                  fontWeight: 'bold', 
                  fontSize: 16,
                  marginLeft: 8
                }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
} 