import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Sistema de upload de imagens para o Supabase Storage
 */
class ImageUploadManager {
  
  /**
   * Faz upload de uma imagem para o Supabase Storage
   * @param {string} imageUri - URI local da imagem
   * @param {string} folder - Pasta onde salvar (ex: 'profile-images', 'post-images')
   * @param {string} fileName - Nome do arquivo (opcional, será gerado automaticamente se não fornecido)
   * @returns {Promise<string>} URL pública da imagem
   */
  static async uploadImage(imageUri, folder = 'profile-images', fileName = null) {
    try {
      // Gerar nome único para o arquivo se não fornecido
      if (!fileName) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = imageUri.split('.').pop() || 'jpg';
        fileName = `${timestamp}_${randomString}.${extension}`;
      }

      // Caminho completo no storage
      const filePath = `${folder}/${fileName}`;

      // Ler o arquivo como base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Fazer upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, FileSystem.decodeBase64(base64), {
          contentType: this.getMimeType(imageUri),
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload da imagem:', error);
        throw new Error('Falha no upload da imagem');
      }

      // Obter URL pública da imagem
      const { data: urlData } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  /**
   * Faz upload da imagem de perfil do usuário
   * @param {string} imageUri - URI local da imagem
   * @param {string} userId - ID do usuário (opcional, para organização)
   * @returns {Promise<string>} URL pública da imagem
   */
  static async uploadProfileImage(imageUri, userId = null) {
    try {
      const fileName = userId ? `profile_${userId}_${Date.now()}.jpg` : null;
      return await this.uploadImage(imageUri, 'profile-images', fileName);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem de perfil:', error);
      throw error;
    }
  }

  /**
   * Faz upload de imagem para post
   * @param {string} imageUri - URI local da imagem
   * @param {string} postId - ID do post (opcional, para organização)
   * @returns {Promise<string>} URL pública da imagem
   */
  static async uploadPostImage(imageUri, postId = null) {
    try {
      const fileName = postId ? `post_${postId}_${Date.now()}.jpg` : null;
      return await this.uploadImage(imageUri, 'post-images', fileName);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem do post:', error);
      throw error;
    }
  }

  /**
   * Remove uma imagem do storage
   * @param {string} filePath - Caminho do arquivo no storage
   * @returns {Promise<boolean>} true se removido com sucesso
   */
  static async deleteImage(filePath) {
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao deletar imagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      return false;
    }
  }

  /**
   * Obtém o tipo MIME baseado na extensão do arquivo
   * @param {string} imageUri - URI da imagem
   * @returns {string} Tipo MIME
   */
  static getMimeType(imageUri) {
    const extension = imageUri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Verifica se uma URL é válida
   * @param {string} url - URL para verificar
   * @returns {boolean} true se a URL é válida
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se uma URI é local (file://) ou remota (http://, https://)
   * @param {string} uri - URI para verificar
   * @returns {boolean} true se é uma URI local
   */
  static isLocalUri(uri) {
    return uri.startsWith('file://') || uri.startsWith('content://');
  }

  /**
   * Processa uma imagem: se for local, faz upload; se for remota, retorna a URL
   * @param {string} imageUri - URI da imagem
   * @param {string} folder - Pasta para upload (se necessário)
   * @returns {Promise<string>} URL pública da imagem
   */
  static async processImage(imageUri, folder = 'profile-images') {
    try {
      // Se já é uma URL pública, retorna ela mesma
      if (this.isValidUrl(imageUri) && !this.isLocalUri(imageUri)) {
        return imageUri;
      }

      // Se é uma URI local, faz upload
      if (this.isLocalUri(imageUri)) {
        return await this.uploadImage(imageUri, folder);
      }

      // Se não é nem URL nem URI local, retorna null
      return null;
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      return null;
    }
  }
}

/**
 * Função auxiliar para decodificar base64
 * @param {string} base64 - String base64
 * @returns {Uint8Array} Array de bytes
 */
function decode(base64) {
  // Implementação compatível com React Native
  const binaryString = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default ImageUploadManager;
