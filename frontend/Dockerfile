# frontend/Dockerfile
FROM node:18
WORKDIR /app
# Copiar package.json y package-lock.json
COPY package*.json ./
# Instalar dependencias
RUN npm install
# Copiar el resto de la aplicación
COPY . .
# Exponer puerto
EXPOSE 3000
# Usar esta opción para desarrollo
CMD ["npm", "start"]