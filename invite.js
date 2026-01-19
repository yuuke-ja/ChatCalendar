'use strict';

function registerInviteRoutes({
  app,
  prisma,
  io,
  crypto,
  sendInviteEmail,
  rememberInviteSession,
  logincheck,
}) {
  app.post('/api/invite-email', async (req, res) => {
    const { email, myUsername, chatroomName, chatroomId } = req.body;
    try {
      const useremail = req.session.logined;
      const user = await prisma.user.findUnique({ where: { email: useremail } });
      const Token = crypto.randomBytes(32).toString('hex');
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
      const tokenurl = `${baseUrl}/invite/email?token=${Token}`;
      await prisma.invite.create({
        data: {
          email,
          chatroomId,
          token: Token,
        },
      });
      await sendInviteEmail({ email, myUsername, chatroomName, tokenurl });
      return res.json({ ok: true });
    } catch (err) {
      console.error('invite-email error', err);
      return res
        .status(500)
        .json({ ok: false, message: '招待メール送信に失敗しました' });
    }
  });

  app.get('/invite/email', async (req, res) => {
    const { token } = req.query;
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.invited) return res.status(400).send('無効な招待です');

    rememberInviteSession(req, res, invite);
    res.redirect('/login');
  });

  //招待真
  app.post('/api/invite', logincheck, async (req, res) => {
    try {
      const chatroomId = req.query.roomId;
      if (!chatroomId) return res.redirect('/privatecalendar');
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ ok: false, reason: 'bad_request' });
      const room = await prisma.chatroom.findUnique({ where: { id: chatroomId } });
      if (!room || room.deleted) return res.status(404).json({ ok: false, reason: 'room_not_found' });
      const inviter = await prisma.user.findUnique({ where: { email: req.session.useremail } });
      if (!inviter) return res.redirect('/login');
      const inviterMember = await prisma.chatmember.findFirst({ where: { chatroomId, userId: inviter.id } });
      if (!inviterMember) return res.redirect('/privatecalendar');
      const target = await prisma.user.findUnique({ where: { email } });
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ ok: false, reason: 'invalid_email' });
      }
      if (!target) return res.status(200).json({ ok: false, reason: 'notfound' });
      const exists = await prisma.chatmember.findFirst({
        where: { chatroomId, userId: target.id },
        select: { userId: true },
      });
      if (exists) return res.status(200).json({ ok: false, reason: 'already' });
      await prisma.chatmember.create({
        data: { chatroomId, userId: target.id, enter: false },
      });
      const members = await prisma.chatmember.findMany({
        where: { chatroomId },
        include: { user: { select: { username: true, email: true } } },
      });

      io.to(target.id).emit('invitelist', { chatid: room.chatid, id: room.id });
      return res.json({ ok: true });
    } catch (e) {
      console.error('api/invite error:', e);
      return res.status(500).json({ ok: false, reason: 'error' });
    }
  });
}

module.exports = registerInviteRoutes;
