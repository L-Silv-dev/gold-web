import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const unidades = ['1ª Unidade', '2ª Unidade', '3ª Unidade', '4ª Unidade'];
const screenWidth = Dimensions.get('window').width;

export default function SchoolRendimentoDisplayModal({ visible, onClose, school, rendimentoData }) {
  const { theme } = useThemeContext();

  if (!rendimentoData) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            width: '90%', 
            maxWidth: 400 
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="information-circle" size={48} color={theme.icon} />
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                marginTop: 12,
                color: theme.text,
                textAlign: 'center'
              }}>
                Dados não disponíveis
              </Text>
              <Text style={{ 
                fontSize: 14, 
                marginTop: 8,
                color: theme.text,
                textAlign: 'center',
                opacity: 0.7
              }}>
                Os dados de rendimento desta escola ainda não foram cadastrados pelo administrador.
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={onClose}
              style={{ 
                backgroundColor: theme.primary, 
                borderRadius: 12, 
                padding: 16, 
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Preparar dados para o gráfico
  const chartData = {
    labels: unidades,
    datasets: [
      {
        data: [
          rendimentoData.unidade1?.porcentagem || 0,
          rendimentoData.unidade2?.porcentagem || 0,
          rendimentoData.unidade3?.porcentagem || 0,
          rendimentoData.unidade4?.porcentagem || 0
        ]
      }
    ]
  };

  const totalAlunos = rendimentoData.unidade4?.numAlunos || 0;

  const mediaRendimento = Object.values(rendimentoData).reduce((sum, unidade) => {
    return sum + (unidade?.porcentagem || 0);
  }, 0) / 4;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
                Rendimento Escolar
              </Text>
            </View>
            
            <Text style={{ 
              fontSize: 18, 
              marginBottom: 20, 
              textAlign: 'center',
              color: theme.text,
              fontWeight: '600'
            }}>
              {school?.name}
            </Text>

            {/* Estatísticas Gerais */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-around', 
              marginBottom: 24,
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary }}>
                  {totalAlunos}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>
                  Total de Alunos
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary }}>
                  {mediaRendimento.toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>
                  Média Geral
                </Text>
              </View>
            </View>

            {/* Gráfico */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                marginBottom: 12,
                color: theme.text,
                textAlign: 'center'
              }}>
                Evolução do Rendimento por Unidade
              </Text>
              <BarChart
                data={chartData}
                width={screenWidth * 0.8}
                height={220}
                yAxisSuffix="%"
                fromZero
                chartConfig={{
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: (opacity = 1) => theme.text,
                  barPercentage: 0.6,
                }}
                style={{ borderRadius: 12 }}
                showBarTops
                withInnerLines={false}
                withHorizontalLabels
              />
            </View>

            {/* Detalhes por Unidade */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                marginBottom: 12,
                color: theme.text
              }}>
                Detalhes por Unidade:
              </Text>
              
              {unidades.map((unidade, index) => {
                const unidadeKey = `unidade${index + 1}`;
                const data = rendimentoData[unidadeKey];
                
                if (!data) return null;
                
                return (
                  <View key={unidadeKey} style={{ 
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: theme.background,
                    borderRadius: 8,
                    marginBottom: 8
                  }}>
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '600',
                      color: theme.text
                    }}>
                      {unidade}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold',
                        color: theme.primary
                      }}>
                        {data.porcentagem}%
                      </Text>
                      <Text style={{ 
                        fontSize: 12,
                        color: theme.text,
                        opacity: 0.7
                      }}>
                        {data.numAlunos} alunos
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              onPress={onClose}
              style={{ 
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
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={{ 
                color: '#fff', 
                fontWeight: 'bold', 
                fontSize: 16,
                marginLeft: 8
              }}>
                Fechar
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
} 