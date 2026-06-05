FROM node:24-alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npx prisma generate

# Build com banco desabilitado (páginas dinâmicas resolvem em runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm", "run", "start"]
