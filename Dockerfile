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

# Para onde o /api aponta — DEFINA no EasyPanel.
#
# Aceita as duas formas: o nome interno do serviço do Atlas
# (ex.: http://nome-do-servico:8080) ou a URL pública
# (ex.: https://yachtsatlas.online).
#
# O padrão abaixo é só um marcador. Com ele, o app SOBE e serve normalmente —
# o nginx resolve o endereço a cada requisição, não na subida — e apenas as
# chamadas de API falham, que é o caso que a tela já sabe tratar. Antes desta
# mudança o contêiner nem iniciava: `host not found in upstream`.
ENV ATLAS_API=http://atlas-backend:8080
ENV PORT=80

# Rede de seguranca para o `resolver` do nginx.
#
# O entrypoint da imagem (15-local-resolvers.envsh) define NGINX_LOCAL_RESOLVERS
# a partir do /etc/resolv.conf, e normalmente e ele que vale. Mas se por algum
# motivo esse script nao rodar, o envsubst substituiria a variavel por VAZIO e o
# arquivo final ficaria com `resolver ;` — sintaxe invalida, e o nginx se recusa
# a subir. Trocariamos um erro de DNS por um erro de sintaxe, que e pior porque
# nao diz o que houve.
#
# 127.0.0.11 e o DNS interno do Docker; serve como ultimo recurso.
ENV NGINX_LOCAL_RESOLVERS=127.0.0.11

EXPOSE 80

# A imagem do nginx já expande ${VARIAVEL} dos templates em /etc/nginx/templates
# na subida — é por isso que o proxy pode mudar de endereço sem rebuild.
CMD ["nginx", "-g", "daemon off;"]
