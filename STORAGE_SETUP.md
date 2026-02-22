# 🖼️ Configuração do Supabase Storage para Imagens

## 📋 Visão Geral

Este guia explica como configurar o Supabase Storage para permitir que as imagens de perfil sejam compartilhadas entre dispositivos e usuários.

## 🚀 Configuração no Supabase

### 1. Criar Bucket de Storage

1. Acesse o painel do Supabase
2. Vá para **Storage** no menu lateral
3. Clique em **"New bucket"**
4. Configure o bucket:
   - **Name**: `images`
   - **Public bucket**: ✅ Marque esta opção
   - **File size limit**: 50MB (ou o valor desejado)
   - **Allowed MIME types**: `image/*`

### 2. Executar Script SQL

Execute o arquivo `database/storage_setup.sql` no **SQL Editor** do Supabase.

### 3. Verificar Políticas

Após executar o script, verifique se as políticas foram criadas:

```sql
SELECT * FROM storage.policies WHERE bucket_id = 'images';
```

## 🔧 Configuração do App

### 1. Instalar Dependências

Certifique-se de que o `expo-file-system` está instalado:

```bash
npx expo install expo-file-system
```

### 2. Configurar Variáveis de Ambiente

Verifique se as variáveis do Supabase estão configuradas em `utils/supabase.js`:

```javascript
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseAnonKey = 'SUA_CHAVE_ANONIMA';
```

## 📱 Como Funciona

### Upload de Imagens

1. **Seleção**: Usuário escolhe uma imagem da galeria
2. **Upload**: Imagem é enviada para o Supabase Storage
3. **URL Pública**: O app recebe uma URL pública da imagem
4. **Cache**: URL é salva localmente para uso offline

### Exibição de Imagens

1. **Verificação**: App verifica se a URL é válida
2. **Carregamento**: Imagem é carregada da URL pública
3. **Fallback**: Se houver erro, mostra ícone padrão
4. **Cache**: Imagem é cacheada localmente

## 🎯 Benefícios

✅ **Compartilhamento**: Imagens visíveis em todos os dispositivos
✅ **Performance**: URLs públicas carregam mais rápido
✅ **Confiabilidade**: Sistema de fallback robusto
✅ **Escalabilidade**: Storage gerenciado pelo Supabase
✅ **Segurança**: Políticas de acesso configuradas

## 🔍 Estrutura de Pastas

```
images/
├── profile-images/
│   ├── profile_user1_timestamp.jpg
│   ├── profile_user2_timestamp.jpg
│   └── ...
└── post-images/
    ├── post_post1_timestamp.jpg
    ├── post_post2_timestamp.jpg
    └── ...
```

## 🛠️ Componentes Criados

### `ImageUploadManager`
- Gerencia upload de imagens para o Supabase Storage
- Suporte a diferentes tipos de imagem
- Geração de nomes únicos para arquivos
- Tratamento de erros

### `OptimizedImage`
- Componente de imagem otimizado
- Suporte a URLs locais e remotas
- Estados de loading e erro
- Fallback automático

## 📊 Monitoramento

### Verificar Uploads

```sql
SELECT * FROM storage.objects 
WHERE bucket_id = 'images' 
ORDER BY created_at DESC;
```

### Limpar Imagens Órfãs

```sql
SELECT clean_orphaned_images();
```

## 🚨 Troubleshooting

### Problema: Upload falha
**Solução**: Verificar políticas de storage e permissões

### Problema: Imagem não carrega
**Solução**: Verificar se a URL é pública e acessível

### Problema: Erro de CORS
**Solução**: Verificar configuração do bucket como público

### Problema: Tamanho de arquivo excedido
**Solução**: Ajustar limite no bucket ou comprimir imagem

## 🔒 Segurança

### Políticas Implementadas

1. **Upload**: Apenas usuários autenticados
2. **Visualização**: Pública para todas as imagens
3. **Atualização**: Apenas o proprietário da imagem
4. **Exclusão**: Apenas o proprietário da imagem

### Boas Práticas

- ✅ Sempre validar tipos de arquivo
- ✅ Limitar tamanho de upload
- ✅ Usar nomes únicos para arquivos
- ✅ Implementar fallback para erros
- ✅ Monitorar uso do storage

## 📈 Próximos Passos

1. **Teste**: Fazer upload de uma imagem de perfil
2. **Verificação**: Confirmar que a imagem aparece em outros dispositivos
3. **Monitoramento**: Acompanhar uso do storage
4. **Otimização**: Ajustar qualidade e tamanho conforme necessário

---

**Sistema de Imagens com Supabase Storage** - Configurado e Pronto para Uso

