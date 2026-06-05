FROM node:24-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install --legacy-peer-deps

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar resto do código
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar aplicação
CMD ["npm", "run", "start"]
