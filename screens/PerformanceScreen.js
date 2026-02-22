import React from 'react';
import { View, Text, ScrollView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import Svg, { Path, Rect } from 'react-native-svg';

const subjects = [
  { title: 'Matemática', status: 'current', percent: 0, color: '#7C3AED', icon: <MaterialCommunityIcons name="math-compass" size={32} color="#fff" /> },
  { title: 'Português', status: 'locked', color: '#F59E42', icon: <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#fff" /> },
  { title: 'Ciências', status: 'special', color: '#10B981', icon: <MaterialCommunityIcons name="flask" size={32} color="#fff" /> },
  { title: 'História', status: 'locked', color: '#F43F5E', icon: <FontAwesome5 name="landmark" size={28} color="#fff" /> },
  { title: 'Geografia', status: 'special', color: '#3B82F6', icon: <MaterialCommunityIcons name="earth" size={32} color="#fff" /> },
];

const NODE_SIZE = 72;
const VERTICAL_GAP = 110;
const STROKE_COLOR = '#a78bfa';

const PerformanceScreen = () => {
  const { theme } = useThemeContext();
  const width = Dimensions.get('window').width * 0.9;
  const height = (subjects.length - 1) * VERTICAL_GAP + NODE_SIZE;

  // Gerar pontos alternando esquerda/direita
  const points = subjects.map((_, idx) => {
    const x = idx % 2 === 0 ? NODE_SIZE / 2 : width - NODE_SIZE / 2;
    const y = idx * VERTICAL_GAP + NODE_SIZE / 2;
    return { x, y };
  });

  // Gerar path SVG em zigue-zague
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = prev.x + (curr.x - prev.x) / 2;
    path += ` Q${cpx},${prev.y} ${cpx},${(prev.y + curr.y) / 2}`;
    path += ` T${curr.x},${curr.y}`;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ alignItems: 'center', paddingTop: 40 }}>
      {/* Logo decorativo e título */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Image source={require('../assets/app_logo.jpeg')} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, borderWidth: 2, borderColor: '#a78bfa' }} />
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: 'bold', letterSpacing: 1 }}>Trilha do Conhecimento</Text>
        <Ionicons name="star" size={28} color="#facc15" style={{ marginLeft: 8 }} />
      </View>
      <Text style={{ color: theme.text, fontSize: 16, marginBottom: 18, textAlign: 'center', width: '90%' }}>
        Cada conquista representa uma matéria diferente! Complete a trilha e desbloqueie novos conhecimentos.
      </Text>
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderRadius: 24, marginBottom: 32, borderWidth: 2, borderColor: '#a78bfa' }}>
        {/* Linha SVG em zigue-zague */}
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={path} stroke={STROKE_COLOR} strokeWidth={8} fill="none" />
        </Svg>
        {/* Nós das matérias */}
        {subjects.map((item, idx) => {
          const isLeft = idx % 2 === 0;
          const point = points[idx];
          return (
            <View
              key={idx}
              style={{
                position: 'absolute',
                left: point.x - NODE_SIZE / 2,
                top: point.y - NODE_SIZE / 2,
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: 20,
                backgroundColor: item.color,
                borderWidth: item.status === 'current' ? 4 : 0,
                borderColor: '#facc15',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {item.icon}
              {item.status === 'current' && (
                <Ionicons name="trophy" size={24} color="#facc15" style={{ position: 'absolute', top: 6, right: 6 }} />
              )}
            </View>
          );
        })}
        {/* Títulos das matérias */}
        {subjects.map((item, idx) => {
          const isLeft = idx % 2 === 0;
          const point = points[idx];
          return (
            <Text
              key={item.title}
              style={{
                position: 'absolute',
                left: isLeft ? point.x + NODE_SIZE / 2 + 12 : undefined,
                right: !isLeft ? width - point.x + NODE_SIZE / 2 + 12 : undefined,
                top: point.y - 10,
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 18,
                textAlign: isLeft ? 'left' : 'right',
                width: 140,
                zIndex: 3,
                textShadowColor: '#fff',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {item.title}
              {item.status === 'current' && item.percent !== undefined ? `  ${item.percent}%` : ''}
            </Text>
          );
        })}
      </View>
      {/* Botão estilizado para motivar o aluno */}
      <TouchableOpacity style={{ backgroundColor: '#7C3AED', paddingVertical: 16, paddingHorizontal: 36, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}>
        <Ionicons name="rocket" size={24} color="#fff" style={{ marginRight: 10 }} />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>Começar Jornada</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.text, fontSize: 14, opacity: 0.7, marginBottom: 24, textAlign: 'center', width: '90%' }}>
        Dica: conquiste todas as matérias para liberar um prêmio especial!
      </Text>
    </ScrollView>
  );
};

export default PerformanceScreen; 
