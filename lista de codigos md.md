# Lista de Códigos do Projeto - Cruzador de Planilhas

Este documento contém todo o código-fonte do projeto, organizado por arquivos, com explicações sobre a função de cada parte para ajudar programadores novos a entenderem a arquitetura.

---

## 📁 Estrutura de Pastas e Visão Geral
O projeto é um aplicativo **Full-Stack** (Frontend + Backend) escrito em **TypeScript**.
- **client/**: Contém a interface do usuário (React).
- **server/**: Contém a lógica do servidor, banco de dados e rotas (Express).
- **shared/**: Contém definições de dados que ambos (frontend e backend) usam.

---

## 🛠️ Seção 1: Definição de Dados (Shared)

### `shared/schema.ts`
**Função:** Define a estrutura do banco de dados (tabelas) e as regras de validação.
```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela de usuários para o sistema de autenticação
export const users = pgTable("users", {
  id: serial("id").primaryKey(), // ID único numérico
  username: text("username").notNull().unique(), // Nome de usuário único
  password: text("password").notNull(), // Senha (será salva como hash)
});

// Esquema para validar a criação de novos usuários
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
```

---

## 🖥️ Seção 2: Backend (Servidor)

### `server/storage.ts`
**Função:** Camada de acesso aos dados. Atualmente usa memória (`MemStorage`), mas está pronto para migrar para banco de dados real.
```typescript
import { type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
```

### `server/routes.ts`
**Função:** Define os "caminhos" (URLs) que o navegador pode chamar para interagir com o servidor.
```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Rotas da API começam com /api
  // Atualmente o processamento é feito no cliente para maior privacidade.
  
  return httpServer;
}
```

### `server/index.ts`
**Função:** Ponto de entrada do servidor. Configura o Express, logs e inicia o servidor na porta 5000.
```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
app.use(express.json()); // Permite ler JSON enviado pelo navegador
app.use(express.urlencoded({ extended: false }));

// Middlewares de Log e Tratamento de Erros configurados aqui...

(async () => {
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  
  // Inicia o servidor na porta 5000 (padrão Replit)
  const port = 5000;
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
})();
```

---

## 🎨 Seção 3: Frontend (Interface do Usuário)

### `client/src/App.tsx`
**Função:** Gerencia as rotas do site (quais páginas mostrar em cada URL).
```typescript
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### `client/src/pages/home.tsx`
**Função:** A tela principal do aplicativo onde o usuário faz o upload e vê os resultados.
```typescript
// Componente principal com lógica de estado (useState) 
// para gerenciar arquivos e progresso do processamento.
// Contém o design com Tailwind CSS e componentes Shadcn UI.
```
*(Código completo disponível no arquivo `client/src/pages/home.tsx` - focado em UI e chamadas ao processador de Excel)*

### `client/src/lib/excel-processor.ts`
**Função:** O "cérebro" do app. Lê os arquivos Excel, faz a comparação (fuzzy matching) e gera o arquivo final.
```typescript
import * as XLSX from 'xlsx';

// Normaliza texto (remove acentos, minúsculas) para comparação justa
export function normalizeText(text: any): string { ... }

// Algoritmo de Levenshtein para encontrar nomes parecidos (fuzzy matching)
function levenshtein(a: string, b: string): number { ... }

export async function processFiles(clientsFile: File, debtorsFile: File) {
  // 1. Lê os arquivos via XLSX
  // 2. Mapeia nomes -> telefones na base completa
  // 3. Busca cada devedor no mapa e gera nova planilha
  // 4. Retorna um Uint8Array pronto para download
}
```

### `client/src/components/file-upload.tsx`
**Função:** Componente visual para a área de "Arrastar e Soltar" arquivos.
```typescript
// Gerencia eventos de Drag & Drop e clique para upload.
// Faz a validação de extensão (.xlsx, .xls) antes de aceitar o arquivo.
```

---

## 📄 Arquivos de Documentação Adicionais
- **guia_de_autenticação.md**: Passo a passo de configuração para Neon e Render.
- **PLAN_AUTH.md**: Estratégia técnica da autenticação.
- **replit.md**: Resumo da arquitetura para a IA e desenvolvedores.
