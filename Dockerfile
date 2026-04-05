FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy pre-built dist (built locally with VITE_FIREBASE_* vars baked in)
COPY dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 8080
CMD ["node", "dist/index.js"]
