import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import ImageUploadManager from '../utils/imageUpload';

const OptimizedImage = ({ 
  source, 
  style, 
  fallbackIcon = 'person', 
  fallbackSize = 24,
  showLoading = true,
  resizeMode = 'cover',
  ...props 
}) => {
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Verificar se a source é válida
  const isValidSource = () => {
    if (!source) return false;
    
    if (typeof source === 'object' && source.uri) {
      return !!source.uri;
    }
    
    if (typeof source === 'string') {
      return !!source;
    }
    
    return false;
  };

  // Processar a source para garantir que seja uma URL válida
  const getProcessedSource = () => {
    if (!isValidSource()) return null;

    let uri = source;
    
    if (typeof source === 'object' && source.uri) {
      uri = source.uri;
    }

    // Se é uma URI local, retornar como está
    if (ImageUploadManager.isLocalUri(uri)) {
      return { uri };
    }

    // Se é uma URL válida, retornar como está
    if (ImageUploadManager.isValidUrl(uri)) {
      return { uri };
    }

    // Se não é nem URI local nem URL válida, retornar null
    return null;
  };

  const processedSource = getProcessedSource();

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Se não há source válida, mostrar ícone de fallback
  if (!processedSource) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons 
          name={fallbackIcon} 
          size={fallbackSize} 
          color={theme.textSecondary} 
        />
      </View>
    );
  }

  // Se houve erro no carregamento, mostrar ícone de erro
  if (error) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons 
          name="alert-circle" 
          size={fallbackSize} 
          color={theme.textSecondary} 
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={processedSource}
        style={[styles.image, { resizeMode }]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
      
      {showLoading && loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export default OptimizedImage;
