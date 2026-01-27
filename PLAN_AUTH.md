# Plano de Autenticação Simples

Para implementar uma autenticação segura e simples utilizando o que já temos (Neon PostgreSQL + Render), seguiremos este plano:

## 1. Modelo de Dados (shared/schema.ts)
*   Criar uma tabela `users` com: `id`, `username` (único), `password` (hash) e `role`.
*   Utilizar o Drizzle ORM para gerenciar as migrações no banco de dados Neon.

## 2. Segurança no Backend (server/auth.ts)
*   **Passport.js**: Utilizar para gerenciar a estratégia de autenticação (Local Strategy).
*   **scrypt**: Para hashing seguro de senhas antes de salvar no banco.
*   **Express Session**: Gerenciar sessões de usuário, armazenando-as no PostgreSQL para persistência entre restarts no Render.

## 3. Rotas de API (server/routes.ts)
*   `/api/register`: Criar novos usuários.
*   `/api/login`: Validar credenciais e iniciar sessão.
*   `/api/logout`: Encerrar sessão.
*   `/api/user`: Retornar os dados do usuário logado.
*   **Middleware**: Proteger as rotas de processamento de planilhas para que apenas usuários logados possam acessar.

## 4. Interface do Usuário (client/src/pages/auth-page.tsx)
*   Criar uma página central de Login/Registro utilizando os componentes do Shadcn UI.
*   Utilizar o hook `useAuth` para gerenciar o estado global de autenticação no frontend.
*   Proteger a rota principal (`/`) redirecionando para `/auth` caso o usuário não esteja autenticado.

## 5. Deploy no Render
*   Configurar a variável de ambiente `SESSION_SECRET` no painel do Render.
*   O banco Neon já está integrado, então a persistência das sessões e usuários será automática.
