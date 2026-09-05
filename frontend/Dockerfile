FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG PORT=5173
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["sh", "-c", "npx vite --host 0.0.0.0 --port ${PORT}"]

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ARG PORT=5173
ENV PORT=${PORT}
EXPOSE ${PORT}
# You can use serve or nginx here. For now, vite preview
CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
