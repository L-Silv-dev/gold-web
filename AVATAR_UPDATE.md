# Atualização de Avatar em Postagens

## Descrição

Esta atualização implementa a funcionalidade para que a imagem de perfil do administrador seja atualizada automaticamente em todas as suas postagens quando ele muda sua foto de perfil.

## Alterações Realizadas

1. **Adição de coluna no banco de dados**:
   - Foi adicionada a coluna `author_avatar` na tabela `posts` para armazenar a URL da imagem de perfil do autor.

2. **Atualização automática de avatar**:
   - Quando o administrador atualiza sua foto de perfil, todas as suas postagens são atualizadas automaticamente com a nova imagem.

3. **Exibição de avatar nas postagens**:
   - As postagens agora exibem a imagem de perfil do autor em vez de apenas mostrar a inicial do nome.

4. **Inclusão de avatar em novas postagens**:
   - Ao criar uma nova postagem, a imagem de perfil atual do autor é automaticamente incluída.

## Como Aplicar a Migração

Para aplicar a migração no banco de dados Supabase, siga os passos abaixo:

1. Certifique-se de ter as dependências necessárias instaladas:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Execute o script de migração:
   ```bash
   node scripts/apply_migration.js
   ```

## Arquivos Modificados

- `App.js`: Adicionada lógica para atualizar o avatar nas postagens do administrador.
- `hooks/usePostsSupabase.js`: Modificada a função `createPost` para incluir o avatar do autor.
- `screens/HomeScreen.js`: Atualizada a exibição dos posts para mostrar a imagem de perfil do autor.
- `screens/ProfileScreen.js`: Modificada a criação de posts para incluir a imagem de perfil do autor.
- `utils/imageUpload.js`: Corrigida a função `decode` para ser compatível com React Native e adicionado `await` na obtenção de URL pública.

## Observações

- A migração atualiza automaticamente os posts existentes do administrador com sua imagem de perfil atual.
- Para posts de outros usuários, a imagem de perfil será exibida apenas se eles tiverem definido uma imagem de perfil antes de criar o post.