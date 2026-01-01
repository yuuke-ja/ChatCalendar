'use strict';

function registerSocketHandlers({ io, prisma, normalizeDate }) {
  function socketlogincheck(socket, next) {
    if (!socket.request.session || !socket.request.session.logined) {
      next(new Error('ログインしてください'));
    } else {
      next();
    }
  }
  io.use(socketlogincheck);

  io.on('connection', async (socket) => {
    console.log('新しいSocket接続:', socket.id);
    const session = socket.request.session;

    const email = session.logined;
    if (!session || !session.logined) {
      console.log('セッションなし、またはログインしていません');
      return;
    }

    console.log('セッションあり、ログインユーザー:', session.logined);
    console.log('ユーザー接続');
    socket.on('joinRoom', (chatroomid) => {
      console.log(`Socket ${socket.id} joined room ${chatroomid}`);
      if (socket.deleteRoom) {
        socket.leave(socket.deleteRoom);
      }
      socket.deleteRoom = chatroomid;
      socket.join(chatroomid);
      socket.emit('room-joined');
    });
    socket.on('get-chat-date', async (data) => {
      const chatroomid = data.chatroomid;
      console.log('get-chat-date 受信 chatroomid:', chatroomid);
      console.log('typeof chatroomid:', typeof chatroomid);
      const chatrooms = await prisma.chatroom.findUnique({ where: { id: chatroomid } });
      try {
        if (!chatrooms) return;

        const chatss = await prisma.chatmessage.findMany({
          where: {
            OR: [
              { content: { not: '' } },
              {
                AND: [
                  { imageUrl: { not: null } },
                  { imageUrl: { not: '' } },
                ],
              },
            ],

            chatroom: { is: { id: chatroomid } },
          },
          select: { date: true },
        });

        const dates = chatss.map(post => {
          const da = new Date(post.date);
          return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
        });

        io.to(chatroomid).emit('chat-dates-response', { dates });
        console.log('chat-dates-response sousinn chatroomid:', chatroomid);
      } catch (error) {
        console.error('get-chat-date エラー:', error);
        socket.emit('送信失敗');
      }
    });
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      socket.join(user.id);
      console.log(`user.id: ${user.id}`);
    }

    console.log('ユーザー接続2');
    socket.on('savereaction', async ({ messageId, emoji, roomId, email, type }) => {
      try {
        const user = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
        if (!user) return;
        console.log(`ユーザ${user}`);
        console.log(`ユーザ${user.username}`);
        const check = await prisma.reaction.findUnique({
          where: {
            userId_messageId_emoji_type: {
              userId: user.id,
              messageId,
              emoji,
              type,
            },
          },
        });
        if (!check) {
          const saved = await prisma.reaction.create({
            data: {
              messageId: messageId,
              userId: user.id,
              emoji: emoji,
              type: type,
            },
          });
          io.to(roomId).emit('newreaction', {
            type: 'true',
            reaction: {
              ...saved,
              user: { id: user.id, username: user.username, email: user.email },
            },
            chatroomId: roomId,
          });
          console.log(`チャットID${roomId}`);
        } else {
          const deleted = await prisma.reaction.delete({
            where: {
              userId_messageId_emoji_type: {
                messageId: messageId,
                userId: user.id,
                emoji: emoji,
                type: type,
              },
            },
          });
          io.to(roomId).emit('newreaction', {
            type: 'false',
            reaction: deleted,
            user: { id: user.id, username: user.username, email: user.email },
            chatroomId: roomId,
          });
        }
        console.log(`ユーザ${user.username}`);
      } catch (e) {
        console.log('リアクションエラー', e);
      }
    });

    socket.on('savechat', async ({ roomId, date, chat, imageUrl, important }) => {
      try {
        const user = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
        if (!user) return;

        const datestamp = new Date(normalizeDate(date) + 'T00:00:00.000Z');
        if (isNaN(datestamp)) {
          socket.emit('送信失敗', '無効な日付です');
          return;
        }
        console.log(`ユーザ情報${user}`);

        const saved = await prisma.chatmessage.create({
          data: {
            imageUrl,
            content: chat,
            email: user.email,
            date: datestamp,
            chatroomId: roomId,
            userId: user.id,
            important,
          },
          include: {
            user: { select: { username: true, email: true } },
          },
        });
        console.log('保存されたchatmessage:', saved);
        io.to(roomId).emit('newchat', {
          chat: saved,
          date,
          chatroomId: roomId,
        });
        console.log(`チャットID${roomId}`);
        //通知
        const otherMembers = await prisma.chatmember.findMany({
          where: {
            chatroomId: roomId,
            NOT: { userId: user.id },
          },
          select: { userId: true },
        });

        await Promise.all(
          otherMembers.map(async (m) => {
            try {
              const upserted = await prisma.countbatch.upsert({
                where: {
                  userId_chatroomId_date: {
                    userId: m.userId,
                    chatroomId: roomId,
                    date: datestamp,
                  },
                },
                update: { count: { increment: 1 }, chatmessageId: { push: saved.id } },
                create: {
                  userId: m.userId,
                  chatroomId: roomId,
                  date: datestamp,
                  count: 1,
                  chatmessageId: [saved.id],
                },
              });
              io.to(m.userId).emit('countbatchupdate', {
                chatroomId: roomId,
                date,
                count: upserted.count,
              });
              console.log('通知送信:', m.userId, upserted.count, date);
            } catch (e) {
              console.error(`countbatch upsert failed for user ${m.userId}:`, e);
            }
          })
        );

        console.log('保存しました:', saved.id);
      } catch (error) {
        console.error('DBエラー:', error);
        socket.emit('送信失敗');
      }
    });
    socket.on('delete-message', async ({ messageId, roomId, type }) => {
      try {
        const message = await prisma.chatmessage.findUnique({
          where: { id: messageId },
          select: {
            date: true,
            chatroomId: true,
            content: true,
            imageUrl: true,
            contentdeleted: true,
            imagedeleted: true,
          },
        });
        if (!message) return;
        const nextContentDeleted = message.contentdeleted || type === 'text';
        const nextImageDeleted = message.imagedeleted || type === 'image';
        const newcontent = nextContentDeleted ? '' : message.content;
        const newimageUrl = nextImageDeleted ? null : message.imageUrl;
        const alldeleted = newcontent === '' && newimageUrl === null ? true : false;

        await prisma.chatmessage.update({
          where: { id: messageId },
          data: {
            contentdeleted: nextContentDeleted,
            imagedeleted: nextImageDeleted,
            deleted: alldeleted,
            important: false,
            content: newcontent,
            imageUrl: newimageUrl,
            createdAt: new Date(),
          },
        });
        io.to(roomId).emit('message-deleted', { messageId, type });

        const affected = await prisma.countbatch.findMany({
          where: {
            chatroomId: roomId,
            date: message.date,
            chatmessageId: { has: messageId },
          },
        });
        if (!alldeleted) return;
        await prisma.reaction.deleteMany({
          where: { messageId },
        });
        await Promise.all(
          affected.map(async (batch) => {
            const newList = batch.chatmessageId.filter((id) => id !== messageId);
            const newCount = Math.max(0, batch.count - 1);

            await prisma.countbatch.update({
              where: { id: batch.id },
              data: {
                chatmessageId: newList,
                count: newCount,
              },
            });

            const dateIso = message.date.toISOString().split('T')[0];
            io.to(batch.userId).emit('countbatchupdate', {
              chatroomId: roomId,
              date: dateIso,
              count: newCount,
            });
          })
        );

        const remaining = await prisma.chatmessage.count({
          where: {
            chatroomId: roomId,
            date: message.date,
            deleted: false,
            OR: [{ content: { not: '' } }, { imageUrl: { not: null } }],
          },
        });

        if (remaining === 0) {
          const clearedDate = message.date.toISOString().split('T')[0];
          io.to(roomId).emit('chat-date-cleared', {
            chatroomId: roomId,
            date: clearedDate,
          });
        }
      } catch (error) {
        console.error('delete-message error:', error);
        socket.emit('送信失敗');
      }
    });

    socket.on('/newchat', async ({ chatid }) => {
      console.log('aaaaaaaaaaaaaaaaaa');
      const email = socket.request.session.logined;
      if (!email) {
        socket.emit('error-message', { message: 'ログインしてください' });
        return;
      }
      const user = await prisma.user.findUnique({ where: { email } });
      try {
        const chatroomdata = await prisma.chatroom.create({
          data: {
            chatid,
          },
        });
        await prisma.chatmember.create({
          data: {
            chatroomId: chatroomdata.id,
            userId: user.id,
            role: 'leader',
          },
        });
        io.to(user.id).emit('newchatlist', {
          chatid: chatroomdata.chatid,
          id: chatroomdata.id,
        });
        console.log(`ユーザイアでー${user.id}`);
        console.log('ddddddddddddddddd');
      } catch (error) {
        console.error('チャット作成エラー:', error);
        socket.emit('error-message', 'IDが既に存在しています');
      }
    });

    socket.on('chenge-authority', async ({ chatroomId, val }) => {
      try {
        const myuser = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
        const myuserMember = await prisma.chatmember.findFirst({
          where: { chatroomId, userId: myuser.id },
        });
        if (!myuserMember || myuserMember.role !== 'leader') {
          socket.emit('error-message', { message: '権限がありません' });
          return;
        }
        await prisma.chatroom.update({
          where: { id: chatroomId },
          data: { authority: val },
        });
        socket.to(chatroomId).emit('authority-changed', { chatroomId, val });
      } catch (e) {
        console.error('make-subleader error:', e);
      }
    });
    socket.on('chenge-invitation-authority', async ({ chatroomId, val }) => {
      try {
        const myuser = await prisma.user.findFirst({
          where: { email: socket.request.session.useremail },
        });
        const mymember = await prisma.chatmember.findFirst({
          where: { chatroomId, userId: myuser.id },
        });
        if (!mymember || mymember.role !== 'leader') {
          socket.emit('error-message', { message: '権限がありません' });
          return;
        }

        await prisma.chatroom.update({
          where: { id: chatroomId },
          data: { invitationauthority: val },
        });

        socket.to(chatroomId).emit('invitation-authority-changed', { chatroomId, val });
      } catch (e) {
        console.error('chenge-invitation-authority error:', e);
      }
    });

    socket.on('make-subleader', async ({ chatroomId, userEmail }) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        const member = await prisma.chatmember.findUnique({
          where: { chatroomId_userId: { chatroomId, userId: user.id } },
          select: { role: true },
        });
        const newrole = member.role === 'member' ? 'subleader' : 'member';
        await prisma.chatmember.update({
          where: { chatroomId_userId: { chatroomId, userId: user.id } },
          data: { role: newrole },
        });

        const participants = await prisma.chatmember.findMany({
          where: { chatroomId },
          include: { user: { select: { username: true, email: true } } },
        });

        io.to(chatroomId).emit('newrole', {
          userEmail,
          newrole,
        });
      } catch (e) {
        console.error('make-subleader error:', e);
      }
    });

    socket.on('change-leader', async ({ chatroomId, userEmail }) => {
      try {
        const myuser = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
        const isuser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!myuser) return;
        const myuserMember = await prisma.chatmember.findFirst({
          where: { chatroomId, userId: myuser.id },
        });
        if (!myuserMember || myuserMember.role !== 'leader') {
          socket.emit('error-message', { message: '権限がありません' });
          return;
        }
        if (!isuser) {
          socket.emit('error-message', { message: '対象ユーザーが存在しません' });
          return;
        }

        await prisma.chatmember.update({
          where: { chatroomId_userId: { chatroomId, userId: isuser.id } },
          data: { role: 'leader' },
        });
        await prisma.chatmember.update({
          where: { chatroomId_userId: { chatroomId, userId: myuser.id } },
          data: { role: 'member' },
        });
        io.to(chatroomId).emit('newrole', {
          userEmail,
          newrole: 'leader',
        });
        io.to(chatroomId).emit('newrole', {
          userEmail: myuser.email,
          newrole: 'member',
        });
      } catch (e) {
        console.error('change-leader error:', e);
      }
    });
    socket.on('favorite-save', async ({ targetEmail, myEmail }) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: myEmail } });
        const target = await prisma.user.findUnique({ where: { email: targetEmail } });
        if (targetEmail === myEmail) {
          io.to(socket.id).emit('favorite-added', { success: false, reason: 'self' });
          return;
        }
        if (!target) {
          io.to(socket.id).emit('favorite-added', { success: false, reason: 'notfound' });
          return;
        }
        await prisma.favorite.create({
          data: { userId: user.id, targetId: target.id },
        });

        //  送った本人のソケットだけに返す
        io.to(socket.id).emit('favorite-added', {
          success: true,
          username: target.username,
          email: target.email,
        });
      } catch (e) {
        if (e.code === 'P2002') {
          io.to(socket.id).emit('favorite-added', { success: false, reason: 'already' });
        } else {
          console.error('お気に入り追加エラー:', e);
          io.to(socket.id).emit('favorite-added', { success: false, reason: 'error' });
        }
      }
    });

    socket.on('delete-member', async ({ chatroomId, userEmail }) => {
      try {
        const issuerEmail = socket.request.session?.logined;
        const issuer = await prisma.user.findUnique({ where: { email: issuerEmail } });
        if (!issuer) return;

        const issuerMember = await prisma.chatmember.findFirst({
          where: { chatroomId, userId: issuer.id },
        });
        if (!issuerMember || issuerMember.role !== 'leader') {
          socket.emit('error-message', { message: '権限がありません' });
          return;
        }
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!user) return;
        await prisma.chatmember.delete({
          where: { chatroomId_userId: { chatroomId, userId: user.id } },
        });
        io.to(chatroomId).emit('member-removed', { chatroomId, userEmail });
        io.to(user.id).emit('kicked', { chatroomId });

        console.log(`removed ${userEmail} from ${chatroomId}`);
      } catch (e) {
        console.error('remove-member error:', e);
        socket.emit('error-message', { message: 'サーバーエラー' });
      }
    });

    socket.on('delete-myuser', async ({ chatroomId, userEmail }) => {
      try {
        const currentEmail = socket.request.session?.logined;
        if (!currentEmail || currentEmail !== userEmail) {
          socket.emit('error-message', { message: '権限がありません' });
          return;
        }
        const user = await prisma.user.findUnique({ where: { email: currentEmail } });
        if (!user) return;
        await prisma.chatmember.delete({
          where: { chatroomId_userId: { chatroomId, userId: user.id } },
        });
        io.to(chatroomId).emit('member-removed', { chatroomId, userEmail });
        io.to(user.id).emit('kicked', { chatroomId });
        console.log(`User ${currentEmail} left room ${chatroomId}`);
      } catch (e) {
        console.error('delete-myuser error:', e);
        socket.emit('error-message', { message: 'サーバーエラー' });
      }
    });

    socket.on('update-username', async (usernameData) => {
      const email = socket.request.session.useremail;
      const user = await prisma.user.findUnique({ where: { email } });
      // 文字列かオブジェクトか判定する
      const username =
        typeof usernameData === 'string'
          ? usernameData
          : usernameData.username;

      console.log('名前変更:', username);

      const updateuser = await prisma.user.update({
        where: { id: user.id },
        data: { username: username },
      });
      socket.request.session.username = updateuser.username;
      socket.request.session.save();
      io.to(user.id).emit('reflection-username', updateuser.username);
      const [rooms, favoritedBy] = await Promise.all([
        prisma.chatmember.findMany({
          where: { userId: user.id },
          select: { chatroomId: true },
        }),
        prisma.favorite.findMany({
          where: { targetId: user.id },
          include: { user: true },
        }),
      ]);

      //  その全ルーム
      rooms.forEach(({ chatroomId }) => {
        io.to(chatroomId).emit('user-rename', {
          email: user.email,
          newName: updateuser.username,
        });
      });
      favoritedBy.forEach(f => {
        io.to(f.user.id).emit('favorite-rename', {
          targetEmail: user.email,
          newName: updateuser.username,
        });
      });
    });

    socket.on('friend', async (data) => {
      const email = session.logined;
      const user = await prisma.user.findUnique({ where: { email } });
      console.log('フレンド', data);
      const friend = await prisma.user.findUnique({ where: { email: data.friendlist } });
      console.log('friend:', JSON.stringify(friend, null, 2));
      let user1Id = user.id;
      let user2Id = friend.id;
      if (user1Id > user2Id) {
        [user1Id, user2Id] = [user2Id, user1Id];
      }
      try {
        await prisma.friend.create({
          data: {
            user1Id,
            user2Id,
          },
        });
        io.to(friend.id).emit('newfriend', {
          friendId: user.id,
          friendname: user.username,
        });
        io.to(user.id).emit('newfriend', {
          friendId: friend.id,
          friendname: friend.username,
        });
      } catch (error) {
        console.error('friendエラー:', error);
        socket.emit('追加失敗');
      }
    });
  });
}

module.exports = registerSocketHandlers;
