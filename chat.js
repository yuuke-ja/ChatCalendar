'use strict';

const path = require('path');
const express = require('express');

function registerChatRoutes({
  app,
  prisma,
  io,
  upload,
  cloudinary,
  logincheck,
  loginchatcheck,
  normalizeDate,
}) {
  //プライベートカレンダー
  app.get('/carender', logincheck, (req, res) => {
    res.render('karennder');
  });
  app.get('/get-date', async (req, res) => {
    try {
      const email = req.session.logined;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).send('ユーザーが見つかりません');
      const posts = await prisma.post.findMany({
        where: {
          userId: user.id,
          memos: {
            some: {
              content: { not: '' },
            },
          },
        },
        select: { createdAt: true },
      });
      const dates = posts.map(post => {
        const da = new Date(post.createdAt);
        return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
      });

      const uniqueDates = [...new Set(dates)];
      res.json(uniqueDates);
    } catch (error) {
      console.error(error);
      res.status(500).send('エラー');
    }
  });

  app.get('/get-memo', logincheck, async (req, res) => {
    try {
      const email = req.session.logined;
      const user = await prisma.user.findUnique({ where: { email } });

      const normalizedDate = normalizeDate(req.query.date);
      const start = new Date(`${normalizedDate}T00:00:00.000Z`);
      const end = new Date(`${normalizedDate}T23:59:59.999Z`);

      const post = await prisma.post.findFirst({
        where: {
          createdAt: { gte: start, lt: end },
          userId: user.id,
        },
        include: { memos: true }, // ← 関連メモも取る
      });

      if (post && post.memos.length > 0) {
        res.json({ memoList: post.memos.map((m) => m.content) });
      } else {
        res.json({ memoList: [] });
      }
    } catch (error) {
      console.error('データ取り出し失敗', error);
      res.status(500).send('失敗');
    }
  });

  app.get('/api/enterchat', logincheck, async (req, res) => {
    const email = req.session.logined;
    const user = await prisma.user.findUnique({ where: { email } });
    const chatmembers = await prisma.chatmember.findMany({
      where: { userId: user.id, chatroom: { deleted: false } },
      include: { chatroom: true },
    });

    const chatlist = chatmembers.map(cm => ({
      chatid: cm.chatroom.chatid,
      id: cm.chatroom.id,
    }));

    res.json(chatlist);
  });

  app.post('/api/deletecount', loginchatcheck, async (req, res) => {
    try {
      const email = req.session.useremail;
      const user = await prisma.user.findUnique({ where: { email } });
      const { chatroomId, date } = req.body;
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      await prisma.countbatch.deleteMany({
        where: {
          userId: user.id,
          chatroomId,
          date: {
            gte: start,
            lt: end,
          },
        },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('deletecount エラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  });

  app.post('/api/mycountbatch', logincheck, loginchatcheck, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.session.useremail } });
    const { chatroomId } = req.body;
    const counts = await prisma.countbatch.findMany({
      where: { userId: user.id, chatroomId },
    });
    const result = {};
    counts.forEach(c => {
      const dateStr = c.date.toISOString().slice(0, 10);
      result[dateStr] = c.count;
    });
    res.json(result);
    console.log(`通知内容${result}`);
  });

  app.post('/api/mycountbatch/all', logincheck, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.session.useremail } });
    const counts = await prisma.countbatch.findMany({
      where: { userId: user.id },
    });
    const result = {};
    counts.forEach(c => {
      const dateStr = c.date.toISOString().slice(0, 10);
      if (!result[c.chatroomId]) {
        result[c.chatroomId] = {};
      }
      result[c.chatroomId][dateStr] = c.count;
    });
    res.json(result);
    console.log(`通知内容${result}`);
  });

  app.get('/api/chatcalendar-info', logincheck, async (req, res) => {
    const chatroomId = req.query.roomId || req.params.roomId;
    console.log(`あいデー${chatroomId}`);
    if (!chatroomId) return res.redirect('/privatecalendar');
    const username = req.session.username;
    const useremail = req.session.useremail;
    const user = await prisma.user.findUnique({ where: { email: useremail } });
    if (!user) return res.redirect('/login');
    const member = await prisma.chatmember.findFirst({ where: { chatroomId, userId: user.id } });
    if (!member) return res.redirect('/privatecalendar');

    const chatroom = await prisma.chatroom.findUnique({ where: { id: chatroomId } });
    if (!chatroom || chatroom.deleted) return res.redirect('/privatecalendar');
    const chatss = await prisma.chatmessage.findMany({
      where: {
        chatroomId: chatroomId,
        OR: [
          { content: { not: '' } },
          {
            AND: [
              { imageUrl: { not: null } },
              { imageUrl: { not: '' } },
            ],
          },
        ],
      },
      select: { date: true },
    });

    const dates = chatss.map(post => {
      const da = new Date(post.date);
      return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
    });

    const members = await prisma.chatmember.findMany({
      where: {
        chatroomId: chatroomId,
      },
      include: {
        user: {
          select: { username: true, email: true },
        },
      },
    });
    res.json({
      chatroomId,
      authority: chatroom.authority,
      invitationauthority: chatroom.invitationauthority,
      username,
      useremail,
      chatroomname: chatroom.chatid,
      memodate: [...new Set(dates)],
      participants: members.map(m => ({
        name: m.user.username,
        email: m.user.email,
        role: m.role,
      })),
    });
  });

  app.get(
    ['/api/privatecalendar-info', '/privatecalendar-info'],
    logincheck,
    async (req, res) => {
      const username = req.session.username;
      const useremail = req.session.useremail;
      res.json({ username, useremail });
    }
  );

  app.post('/save-memo', logincheck, async (req, res) => {
    const email = req.session.logined;
    const { date, memoList } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    try {
      const datestamp = new Date(`${normalizeDate(date)}T00:00:00.000Z`);
      if (isNaN(datestamp)) {
        return res.status(400).send('無効な日付です');
      }

      // その日のPostを探す（なければ作る）
      let post = await prisma.post.findFirst({
        where: { userId: user.id, createdAt: datestamp },
      });

      if (!post) {
        post = await prisma.post.create({
          data: {
            userId: user.id,
            postedBy: user.username,
            createdAt: datestamp,
            content: '',
          },
        });
      }

      // 既存のメモを全部削除してから新しいメモを追加
      await prisma.memo.deleteMany({
        where: { postId: post.id },
      });

      let savedMemoCount = 0;

      if (Array.isArray(memoList)) {
        const nonEmptyMemos = memoList.filter(text => text.trim() !== '');
        if (nonEmptyMemos.length > 0) {
          await prisma.memo.createMany({
            data: nonEmptyMemos.map((text) => ({
              content: text,
              postId: post.id,
            })),
          });
          savedMemoCount = nonEmptyMemos.length;
        }
      }

      if (savedMemoCount > 0) {
        io.to(user.id).emit('newmemo', datestamp.toISOString().split('T')[0]);
      } else {
        io.to(user.id).emit('deletememo', datestamp.toISOString().split('T')[0]);
      }

      res.status(200).send('保存成功');
    } catch (error) {
      console.error('DBエラー:', error);
      res.status(500).send('保存失敗');
    }
  });
  app.post('/add-memo', logincheck, async (req, res) => {
    const email = req.session.logined;
    const { date, memoList } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    try {
      const datestamp = new Date(`${normalizeDate(date)}T00:00:00.000Z`);
      if (isNaN(datestamp)) {
        return res.status(400).send('無効な日付です');
      }

      let post = await prisma.post.findFirst({
        where: { userId: user.id, createdAt: datestamp },
      });

      if (!post) {
        post = await prisma.post.create({
          data: {
            userId: user.id,
            postedBy: user.username,
            createdAt: datestamp,
            content: '',
          },
        });
      }

      let savedMemoCount = 0;

      if (Array.isArray(memoList)) {
        const nonEmptyMemos = memoList.filter(text => text.trim() !== '');
        if (nonEmptyMemos.length > 0) {
          await prisma.memo.createMany({
            data: nonEmptyMemos.map((text) => ({
              content: text,
              postId: post.id,
            })),
          });
          savedMemoCount = nonEmptyMemos.length;
        }
      }

      if (savedMemoCount > 0) {
        io.to(user.id).emit('newmemo', datestamp.toISOString().split('T')[0]);
      } else {
        io.to(user.id).emit('deletememo', datestamp.toISOString().split('T')[0]);
      }

      res.status(200).send('保存成功');
    } catch (error) {
      console.error('DBエラー:', error);
      res.status(500).send('保存失敗');
    }
  });

  app.get('/getchat', logincheck, async (req, res) => {
    try {
      if (!req.query.date) {
        res.status(400).send('dateパラメータが必要です');
        return;
      }
      const chatroomid = req.query.roomId;
      if (!chatroomid) return res.redirect('/privatecalendar');
      const normalizedDate = normalizeDate(req.query.date);
      const start = new Date(normalizedDate + 'T00:00:00.000Z');
      const end = new Date(normalizedDate + 'T23:59:59.999Z');
      const email = req.session.logined;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.redirect('/login');
      const member = await prisma.chatmember.findFirst({ where: { chatroomId: chatroomid, userId: user.id } });
      if (!member) return res.redirect('/privatecalendar');
      const chatroom = await prisma.chatroom.findUnique({ where: { id: chatroomid } });
      if (!chatroom || chatroom.deleted) return res.redirect('/privatecalendar');
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).send('無効な日付です');
      }

      const result = await prisma.chatmessage.findMany({
        where: {
          date: { gte: start, lt: end },
          chatroomId: chatroom.id,
        },
        include: {
          user: { select: { username: true, email: true } },
          reactions: {
            include: {
              user: { select: { username: true, email: true } },
            },
          },
        },
      });
      console.log(`取得件数: ${result.length}`);

      res.json({
        chat: result,
        user,
      });
    } catch (error) {
      console.error('データ取り出し失敗', error);
      res.status(500).send('失敗');
    }
  });

  app.get('/api/favorite', async (req, res) => {
    try {
      const email = req.session.useremail;
      if (!email) return res.status(401).json({ error: 'ログインが必要です' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

      const list = await prisma.favorite.findMany({
        where: { userId: user.id },
        include: { target: { select: { username: true, email: true } } },
      });

      res.json(list.map(f => f.target));
    } catch (err) {
      console.error('お気に入り一覧取得エラー:', err);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  });

  app.get('/home', logincheck, async (req, res) => {
    try {
      const email = req.session.logined;
      const user = await prisma.user.findUnique({ where: { email } });
      const user1 = await prisma.friend.findMany({
        where: {
          user1Id: user.id,
        },
        include: { user2: true },
      });
      const user2 = await prisma.friend.findMany({
        where: {
          user2Id: user.id,
        },
        include: { user1: true },
      });
      const friendlist1 = user1.map(f => f.user2.username);
      const friendlist2 = user2.map(f => f.user1.username);
      const friendlist = [...friendlist1, ...friendlist2];

      res.render('home', { friendlist });
    } catch (error) {
      console.error('getfriendエラー:', error);
      res.status(500).send('フレンド取得失敗');
    }
  });
  app.get('/api/friends', logincheck, async (req, res) => {
    const email = req.session.logined;
    const user = await prisma.user.findUnique({ where: { email } });

    const user1 = await prisma.friend.findMany({
      where: { user1Id: user.id },
      include: { user2: true },
    });

    const user2 = await prisma.friend.findMany({
      where: { user2Id: user.id },
      include: { user1: true },
    });

    const friendlist1 = user1.map(f => f.user2.username);
    const friendlist2 = user2.map(f => f.user1.username);

    res.json([...friendlist1, ...friendlist2]);
  });

  app.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '画像ファイルがありません' });
      }

      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'carender' },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(req.file.buffer);
        });

      const result = await uploadStream();
      res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
      console.error(`画像アップロード${error}`);
      res.status(500).json({ error: 'サーバエラー' });
    }
  });

  function roomIdGuard(req, res, next) {
    const roomId = req.query.roomId;
    if (!roomId) {
      return res.redirect('/privatecalendar');
    }
    next();
  }
  // チャットカレンダー
  const chatPath = '/app/frontend/chatcalendar/dist';

  app.get('/chatcalendar', logincheck, roomIdGuard, (req, res) => {
    res.sendFile(path.join(chatPath, 'index.html'));
  });
  app.use('/chatcalendar', express.static(chatPath));
  app.get('/chatcalendar/*', logincheck, roomIdGuard, (req, res) => {
    res.sendFile(path.join(chatPath, 'index.html'));
  });

  // プライベートカレンダー
  const privatePath = '/app/frontend/privatecalendar/dist';

  app.get('/privatecalendar', logincheck, (req, res) => {
    res.sendFile(path.join(privatePath, 'index.html'));
  });
  app.use('/privatecalendar', express.static(privatePath));
  app.get('/privatecalendar/*', logincheck, (req, res) => {
    res.sendFile(path.join(privatePath, 'index.html'));
  });
}

module.exports = registerChatRoutes;
