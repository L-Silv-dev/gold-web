import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../utils/supabase';
import * as Linking from 'expo-linking';
import StorageHelper from '../utils/storageHelper';
import { checkConnectivity } from '../utils/networkHelper';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../contexts/AuthContext';

const BooksScreen = () => {
  const { theme } = useThemeContext();
  const { recordEvent } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const numColumns = 2;
  const cardWidth = (Dimensions.get('window').width * 0.9 - 12) / numColumns - 8;

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const online = await checkConnectivity();
        if (online) {
          const { data, error: fetchError } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });
          if (fetchError) throw fetchError;
          setBooks(data || []);
          try {
            await StorageHelper.setItem('books_cache', JSON.stringify(data || []));
          } catch {}
          try {
            const toPrefetch = (data || []).slice(0, 3).filter(b => b?.pdf_url);
            for (const b of toPrefetch) {
              ensurePdfCached(b).catch(() => {});
            }
          } catch {}
        } else {
          const cached = await StorageHelper.getItem('books_cache');
          if (cached) {
            setBooks(JSON.parse(cached));
          } else {
            setBooks([]);
          }
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar livros');
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const openPdf = async (book) => {
    try {
      if (!book?.pdf_url) return;
      if (Platform.OS === 'web') {
        await Linking.openURL(book.pdf_url);
      } else {
        const localPath = await ensurePdfCached(book);
        await Linking.openURL(localPath);
      }
      try { recordEvent('opened_pdf'); } catch {}
    } catch {
      if (book?.pdf_url) {
        Linking.openURL(book.pdf_url).catch(() => {});
      }
    }
  };

  const getLocalPdfPath = (book) => {
    return `${FileSystem.cacheDirectory}books/${book.id}.pdf`;
  };

  const ensurePdfCached = async (book) => {
    if (Platform.OS === 'web') {
      return book.pdf_url;
    }
    const dir = `${FileSystem.cacheDirectory}books`;
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}
    const target = getLocalPdfPath(book);
    const info = await FileSystem.getInfoAsync(target);
    if (info.exists) return target;
    const res = await FileSystem.downloadAsync(book.pdf_url, target);
    return res.uri;
  };

  const sharePdf = async (book) => {
    try {
      if (!book?.pdf_url) return;
      setSharingId(book.id);
      if (Platform.OS === 'web') {
        await Linking.openURL(book.pdf_url);
      } else {
        const localPath = await ensurePdfCached(book);
        await Sharing.shareAsync(localPath, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar PDF' });
      }
      try { recordEvent('opened_pdf'); } catch {}
    } catch {
    } finally {
      setSharingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <Ionicons name="library" size={24} color={theme.text} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>PDFs Compartilhados</Text>
      </View>
      {error ? (
        <View style={styles.loading}>
          <Text style={{ color: theme.text }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          showsVerticalScrollIndicator
          style={Platform.OS === 'web' ? { overflow: 'auto' } : undefined}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ justifyContent: 'space-between', width: '90%', alignSelf: 'center' }}
          ListEmptyComponent={<Text style={{ color: theme.text, opacity: 0.7 }}>Nenhum PDF disponível.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.cardGrid, { backgroundColor: theme.card, borderColor: theme.border, width: cardWidth }]}>
              <View style={styles.coverGrid}>
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={styles.coverGrid} />
                ) : (
                  <View style={[styles.coverGrid, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="document-text" size={32} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.infoGrid}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{item.title || 'Documento'}</Text>
                {item.author ? (
                  <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>{item.author}</Text>
                ) : null}
                <View style={styles.actions}>
                  {item.pdf_url ? (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => openPdf(item)}>
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Abrir</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.pdf_url ? (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.icon }]} onPress={() => sharePdf(item)}>
                      {sharingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="share-social-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Compartilhar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  cardGrid: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  coverGrid: {
    width: '100%',
    height: 150,
  },
  infoGrid: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default BooksScreen;
