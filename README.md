# ChatCalendar

ChatCalendar is a calendar‑based group chat app.  
Each date is treated as its own chat room, so conversations stay tied to specific days and events.

## Demo
- https://chatcalendar.onrender.com

## Features
- Date‑based group chat
- Create rooms / invite members
- Unread counters
- Google Calendar integration
- Personal calendar

## Tech Stack
- Frontend: JavaScript (React)
- Backend: Node.js / Express
- Realtime: Socket.io
- Database: PostgreSQL
- Auth: Google OAuth
- External API: Google Calendar API
- Deploy: Render


## How to Use
1. Open the app and log in with Google.
2. Click “Create Room” to make a new chat room.
3. Open **Room Details** to view members and permissions.
4. In **Invite**, enter the user’s email address:
   - If the account exists, they receive an in‑app invitation.
   - If the account does not exist, an invitation link is sent by email.
5. Select a date on the calendar to open that day’s chat.
6. Send messages or images in the date‑based chat.
7. Open the user menu to link Google Calendar if needed.

## 実行方法（審査用）
本作品はWebアプリのため、審査時の動作確認は公開URLをご利用ください。

- 公開URL（Render）: https://chatcalendar.onrender.com

GitHub（ソースコード公開）:
※ ZIPファイルが正しく展開できない場合の参照用として、同一内容のソースコードを以下でも公開しています。
https://github.com/yuuke-ja/ChatCalendar

ローカルで動作確認が必要な場合は、以下のDocker手順を使用してください。

## ローカル実行（任意・Docker）
1. `.env.example` を `.env` にコピーして値を埋める
2. `docker compose up --build`
3. `http://localhost:8000` にアクセス
4. `/login` でログイン（メール認証またはGoogleログイン）

## 環境変数
必須:
- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_BASE_URL`

機能ごとに必要:
- Google OAuth / Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- メール送信（認証/招待）: `GMAIL_USER`, `GMAIL_PASS`
- 画像アップロード: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 補足
- Dockerビルド時に `chatcalendar` と `privatecalendar` のViteビルドを行います。
- Googleカレンダー機能はOAuth連携が必要です。
- 未設定の外部サービス機能は利用できません。
