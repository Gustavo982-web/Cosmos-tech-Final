FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 APP_PORT=3000 APP_HOST=0.0.0.0
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["node", "app.js"]
