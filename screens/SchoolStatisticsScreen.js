import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { useThemeContext } from '../contexts/ThemeContext';

const SchoolStatisticsScreen = ({ route, navigation }) => {
  const { theme } = useThemeContext();
  const { school } = route.params;
  const notas = school.notas || [];
  const totalAlunos = school.totalAlunos || 0;

  // Garantir dados válidos para o gráfico
  const notasMedias = notas.map(unidade => {
    if (!unidade) return 0;
    if (typeof unidade === 'number') return unidade || 0;
    const alta = Number(unidade.alta) || 0;
    const media = Number(unidade.media) || 0;
    const baixa = Number(unidade.baixa) || 0;
    const total = alta + media + baixa;
    if (total === 0) return 0;
    const notaMedia = ((alta * 9) + (media * 7) + (baixa * 4)) / total;
    return Number.isFinite(notaMedia) ? notaMedia : 0;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{school.name}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Total de alunos:</Text>
          <Text style={[styles.value, { color: theme.primary }]}>{totalAlunos}</Text>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Rendimento das 4 Unidades</Text>
          <BarChart
            data={{
              labels: ['1ª', '2ª', '3ª', '4ª'],
              datasets: [{ data: notasMedias.map(n => Number.isFinite(n) ? n : 0) }],
            }}
            width={Dimensions.get('window').width * 0.9}
            height={220}
            yAxisSuffix=""
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
            style={{ borderRadius: 10 }}
            showBarTops
            withInnerLines={false}
            withHorizontalLabels
          />
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Distribuição de Notas por Unidade</Text>
          {notas.map((unidade, idx) => (
            <View key={idx} style={{ marginBottom: 12, backgroundColor: theme.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 4 }}>{idx + 1}ª Unidade</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#059669', fontWeight: 'bold' }}>Alta: {unidade?.alta || 0}</Text>
                <Text style={{ color: '#f59e42', fontWeight: 'bold' }}>Média: {unidade?.media || 0}</Text>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Baixa: {unidade?.baixa || 0}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default SchoolStatisticsScreen; 