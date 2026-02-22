import React from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VideoLoadingOverlay = ({ 
  visible, 
  message = "Carregando vídeo...",
  showRetry = false,
  onRetry
}) => {
  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <View style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        minWidth: 200,
      }}>
        {!showRetry ? (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{
              color: '#fff',
              fontSize: 16,
              marginTop: 15,
              textAlign: 'center',
            }}>
              {message}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="refresh-outline" size={40} color="#fff" />
            <Text style={{
              color: '#fff',
              fontSize: 16,
              marginTop: 15,
              marginBottom: 10,
              textAlign: 'center',
            }}>
              Erro ao carregar vídeo
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
              }}
              onPress={onRetry}
            >
              <Text style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '600',
              }}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default VideoLoadingOverlay;