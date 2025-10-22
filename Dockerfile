FROM node:22.12.0-slim

RUN apt-get update && \
    apt-get install -y locales git procps vim tmux curl
RUN locale-gen ja_JP.UTF-8
RUN localedef -f UTF-8 -i ja_JP ja_JP
ENV LANG=ja_JP.UTF-8
ENV TZ=Asia/Tokyo
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json frontend/

RUN npm install \
 && npm --prefix frontend install

COPY . .

RUN npm --prefix frontend run build -- --config chatcalendar/vite.config.js \
 && npm --prefix frontend run build -- --config privatecalendar/vite.config.js \
 && npx prisma generate

CMD ["sh", "run.sh"]
