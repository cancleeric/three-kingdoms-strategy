# 三國誌 PvP 伺服器 — 內部容器（掛閘道 /sanguo/socket）
# context = three-kingdoms-strategy 根（需 engine/ + server/ 為 /app 下 siblings，配合相對 import）
FROM node:20-alpine
WORKDIR /app
COPY engine/src ./engine/src
COPY server/package.json ./server/package.json
WORKDIR /app/server
RUN npm install --no-audit --no-fund
COPY server/src ./src
ENV PORT=3300
ENV SOCKET_PATH=/sanguo/socket
EXPOSE 3300
CMD ["npm", "start"]
