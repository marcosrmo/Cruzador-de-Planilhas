# Guia Completo de Autenticação - Cruzador de Planilhas

Este guia detalha cada passo para configurar a autenticação no seu projeto, desde o banco de dados até a hospedagem.

## 1. Configuração do Banco de Dados (Neon)

O Neon é onde guardaremos os nomes de usuário e as senhas (criptografadas).

1.  **Acesse o Console do Neon**: Entre na sua conta e selecione seu projeto.
2.  **Obtenha a URL de Conexão**:
    *   No painel principal (Dashboard), procure por **Connection String**.
    *   Certifique-se de que a opção **Pooled connection** esteja marcada (geralmente termina com `-pooler`).
    *   Copie a URL que começa com `postgresql://...`.
3.  **Configuração no Projeto**:
    *   Aqui no Replit, vá na aba **Secrets** (ícone de cadeado).
    *   Adicione uma chave chamada `DATABASE_URL` e cole o valor copiado.

---

## 2. Configuração dos Arquivos do Projeto

Vou configurar os arquivos necessários para que o sistema entenda como lidar com usuários.

### A. O Esquema (shared/schema.ts)
Vou criar uma tabela de usuários no código:
```typescript
import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
```

### B. O Armazenamento (server/storage.ts)
O arquivo de armazenamento será atualizado para incluir funções como `getUser`, `getUserByUsername` e `createUser`.

### C. A Lógica de Segurança (server/auth.ts)
Criaremos um arquivo que usa o **Passport.js** para validar o login e o **scrypt** para esconder as senhas.

---

## 3. Configuração no Render (Hospedagem)

Para que o site funcione ao vivo com segurança:

1.  **Acesse o Painel do Render**: Vá em **Dashboard** e selecione seu Web Service.
2.  **Configurações de Ambiente (Environment)**:
    *   Clique em **Environment**.
    *   Adicione as seguintes variáveis:
        *   `DATABASE_URL`: A mesma URL do Neon que você usou no passo 1.
        *   `SESSION_SECRET`: Escreva qualquer frase longa e aleatória (ex: `minha-chave-secreta-muito-segura-123`). Isso protege as sessões dos usuários.
3.  **Deploy**: O Render detectará as mudanças e fará o deploy automático.

---

## 4. Como Usar no Site

1.  **Acesso**: Quando você abrir o site, ele redirecionará para uma tela de Login.
2.  **Primeiro Acesso**: Clique em "Registrar" para criar sua conta.
3.  **Uso**: Após o login, você terá acesso total à ferramenta de cruzamento de planilhas.

---

### Observação para Leigos:
*   **Não compartilhe a DATABASE_URL**: Ela dá acesso total ao seu banco de dados.
*   **Senhas**: O sistema nunca guarda sua senha "limpa", apenas um código embaralhado (hash). Nem o dono do banco consegue ver sua senha real.
