# ============================================================
# Atlas Pré-Data — PWA de campo
#
# Build do Vite + Nginx servindo o estático, com /api/v1 indo por proxy
# para o backend do Atlas. O app usa caminho RELATIVO (`/api/v1`), nunca a
# URL do backend: assim o navegador do colaborador fala só com a origem de
# onde baixou o app, e não há CORS nem endereço de servidor escrito no
# bundle.
# ============================================================

# --- Estágio 1: build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .

# As fichas do Atlas viram JSON no build (`npm run fichas`), mas o repo do
# app principal NÃO está aqui dentro. O `src/fichas/servicos.json` e o
# `recorte.json` são versionados justamente por isso — o build de produção
# usa o que está commitado, e regerar é tarefa de quem tem os dois repos na
# máquina.
RUN npm run build

# --- Estágio 2: servir ---
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Para onde o /api aponta. O EasyPanel injeta o endereço do serviço do Atlas;
# o padrão serve para um docker-compose local na mesma rede.
ENV ATLAS_API=http://atlas-backend:8080
ENV PORT=80

EXPOSE 80

# A imagem do nginx já expande ${VARIAVEL} dos templates em /etc/nginx/templates
# na subida — é por isso que o proxy pode mudar de endereço sem rebuild.
CMD ["nginx", "-g", "daemon off;"]
