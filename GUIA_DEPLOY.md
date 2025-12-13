# Guia Completo: Como Publicar seu Cruzador de Planilhas

Este guia vai te ensinar passo a passo como colocar seu aplicativo no ar usando o **Render** (que é gratuito e excelente) ou o próprio Replit.

## Opção 1: Publicar no Render (Recomendado para Site Gratuito)

Como seu aplicativo roda 100% no navegador (não precisa de servidor processando dados), a melhor opção é usar o serviço de "Static Site" do Render. É rápido, seguro e gratuito.

### Passo 1: Preparar o Código (GitHub)
Para usar o Render, seu código precisa estar no GitHub.
1. No menu lateral esquerdo do Replit, clique no ícone do **Git** (parece um losango com ramificações).
2. Clique em **"Connect to GitHub"** (ou "Create Repository").
3. Siga os passos para conectar sua conta e criar um repositório novo. Dê um nome como `cruzador-planilhas`.
4. Envie (Push) todo o código para lá.

### Passo 2: Configurar no Render
1. Crie uma conta em [render.com](https://render.com).
2. No painel (Dashboard), clique em **"New +"** e selecione **"Static Site"**.
3. Conecte sua conta do GitHub e selecione o repositório `cruzador-planilhas` que você acabou de criar.

### Passo 3: Preencher as Configurações
O Render vai pedir algumas informações. Preencha EXATAMENTE assim:

*   **Name:** (Escolha um nome, ex: `meu-cruzador`)
*   **Branch:** `main` (ou `master`)
*   **Root Directory:** (Deixe em branco)
*   **Build Command:** `npm install && npx vite build`
*   **Publish Directory:** `dist/public`

> **Atenção:** É muito importante que o *Publish Directory* seja `dist/public` e o comando de build inclua `npx vite build`. Isso garante que apenas a parte visual (frontend) seja construída.

### Passo 4: Finalizar
1. Clique em **"Create Static Site"**.
2. Aguarde alguns minutos enquanto o Render constrói seu site.
3. Quando terminar, você verá um link (ex: `https://meu-cruzador.onrender.com`).
4. Pronto! Esse é o link que você pode enviar para seus clientes.

---

## Opção 2: Publicar no Replit (Mais Fácil)

Se você não quiser configurar GitHub e Render, pode usar o próprio Replit.

1. No topo da tela do Replit, clique no botão **"Deploy"** (canto superior direito).
2. Escolha a opção **"Replit Deployments"** (Geralmente é pago, mas é a forma oficial).
3. **Alternativa Grátis no Replit:** O link que você usa para testar o app (aquele que aparece acima da janela de visualização) já funciona publicamente!
    *   Porém, na versão grátis do Replit, ele pode "dormir" se ninguém usar por um tempo e demorar alguns segundos para acordar.

---

## Dicas para Manter o App Profissional

1. **Domínio Próprio:** No Render, você pode conectar um domínio personalizado (ex: `www.seusite.com`) nas configurações do site, mesmo na conta gratuita.
2. **Atualizações:** Sempre que quiser mudar algo (texto, cor), basta alterar aqui no Replit, ir na aba Git, fazer um "Commit" e "Push". O Render vai detectar a mudança e atualizar o site automaticamente em minutos.

---

## Resumo Técnico (Caso precise passar para outro dev)
*   **Stack:** React + Vite + TypeScript + TailwindCSS.
*   **Lógica:** Processamento de Excel puramente Client-Side (Navegador) usando bibliotecas `xlsx`.
*   **Hospedagem Ideal:** Static Site Hosting (Vercel, Netlify, Render).
*   **Output de Build:** `dist/public`.
