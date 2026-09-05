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
ARG API_BASE_URL
ENV VITE_API_BASE_URL=${API_BASE_URL}
ARG MERCURE_PUBLIC_URL
ENV VITE_MERCURE_PUBLIC_URL=${MERCURE_PUBLIC_URL}
ARG BASE_DOMAIN
ENV VITE_BASE_DOMAIN=${BASE_DOMAIN}
ARG GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ARG ALLOWED_HOSTS
ENV VITE_ALLOWED_HOSTS=${ALLOWED_HOSTS}
RUN npm run build
ARG PORT=5173
ENV PORT=${PORT}
EXPOSE ${PORT}
# You can use serve or nginx here. For now, vite preview
CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
