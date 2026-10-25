FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p db
RUN node src/db/init.js
RUN node src/db/seed.js
RUN node src/db/migrate-v2.js
EXPOSE 3847
ENV PORT=3847
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
