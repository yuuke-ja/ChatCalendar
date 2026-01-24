'use strict';

function registerAuthRoutes({
  app,
  io,
  prisma,
  bcrypt,
  body,
  validationResult,
  getRndStr,
  sendVerificationEmail,
  resolveInviteContext,
  clearInviteSession,
}) {
  app.get('/newuser', (req, res) => {
    res.render('newuser');
  });

  // 新規ユーザー登録
  app.post(
    '/newuser',
    [
      body('email')
        .isEmail()
        .withMessage('有効なメールアドレスを入力してください'),

      body('password')
        .trim()
        .isLength({ min: 4, max: 20 })
        .withMessage('パスワードは4~20文字でお願いします。'),
    ],

    async (req, res) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log('バリデーションエラー:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, username, password } = req.body;
      const code = getRndStr();
      try {
        const hashpassword = await bcrypt.hash(password, 10);
        const existing = await prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          const now = new Date();
          const expireTime = new Date(existing.timerimit);
          console.log('既存ユーザー発見:', existing.email, '期限:', expireTime, '現在:', now);
          if (!existing.isVerified && expireTime < now) {
            console.log('認証未済で期限切れ→削除して再登録');
            // 認証されてない＆期限切れ → 上書きOK
            await prisma.user.delete({ where: { email } });
          } else if (existing.isVerified) {
            console.log('認証済みのメールアドレス');
            return res.status(409).send('このメールアドレスはすでに使われている');
          } else {
            // 認証済み または まだ期限内で 登録させない
            console.log('期限内なので登録拒否');
            return res.status(409).send('認証コード期限内');
          }
        } else {
          //  新規登録
          console.log('ここは新規登録の処理に進む');
          await prisma.user.create({
            data: {
              username,
              email,
              password: hashpassword,
              code: code,
              timerimit: new Date(Date.now() + 10 * 60 * 1000),
              isVerified: false,
            },
          });
        }

        try {
          await sendVerificationEmail({ email, username, code });
        } catch (err) {
          console.error('Error while sending mail', err);
        }
        req.session.userId = email;
        req.session.isverified = false;

        res.redirect('/verify');
      } catch (error) {
        if (error.code === 'P2002') {
          res.status(409).send('このメールアドレスはすでに使われています。');
        } else {
          res.status(500).send('ユーザー登録中に予期せぬエラーが発生しました。');
        }
      }
    }
  );

  app.get('/verify', (req, res) => {
    res.render('verify');
  });
  app.post('/verify', async (req, res) => {
    try {
      const email = req.session.userId;
      const user = await prisma.user.findUnique({ where: { email } });
      const { code } = req.body;
      const now = new Date();
      const expireTime = new Date(user.timerimit);
      if (user.code === code && now <= expireTime) {
        console.log(`正しい？コード${user.code}`);
        console.log(`正しい？送信コード${code}`);
        await prisma.user.update({
          where: { email },
          data: { isVerified: true },
        });
        const inviteContext = await resolveInviteContext(req, res);
        if (inviteContext) {
          const chatroomId = inviteContext.chatroomId;
          const token = inviteContext.token;
          try {
            await prisma.chatmember.create({
              data: { chatroomId, userId: user.id },
            });
          } catch (e) {
            if (e.code !== 'P2002') throw e;
          }
          await prisma.invite.update({ where: { token }, data: { invited: true } });
          clearInviteSession(req, res);
        }
        res.redirect('/login');
      } else if (now > expireTime) {
        return res.redirect('/verify?error=timeover');
      } else {
        console.log(`コード${user.code}`);
        console.log(`送信コード${code}`);
        return res.redirect('/verify?error=notcode');
      }
    } catch (err) {
      console.error('認証処理中にエラー:', err);
      res.status(500).send('サーバーエラー');
    }
  });

  app.get('/login', (req, res) => {
    if (req.session.logined) {
      return res.render('login', {
        currentuser: req.session.logined,
      });
    }
    res.render('login');
  });

  app.post('/login', async (req, res) => {
    try {
      console.log(req.body);
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.redirect('/login?error=notemail');
      }
      if (!user.password) {
        return res.redirect('/login?error=oauth');
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.redirect('/login?error=password');
      }
      if (!user.isVerified) {
        return res.redirect('/login?error=unverified');
      }
      req.session.useremail = user.email;
      req.session.logined = user.email;
      req.session.username = user.username;
      req.session.userid = user.id;
      const inviteContext = await resolveInviteContext(req, res);
      if (inviteContext) {
        const chatroomId = inviteContext.chatroomId;
        clearInviteSession(req, res);
        return res.redirect(`/chatcalendar?roomId=${encodeURIComponent(chatroomId)}`);
      }
      res.redirect('/privatecalendar');
    } catch (error) {
      console.error(error);
      res.status(500).send('サーバーエラー');
    }
  });

  app.get('/api/session-latest', (req, res) => {
    res.json({ user: req.session.useremail || null });
  });

  app.get('/logout', (req, res) => {
    const userId = req.session.userid;
    if (userId && io) {
      io.to(userId).disconnectSockets(true);
    }
    delete req.session.userid;
    delete req.session.useremail;
    delete req.session.logined;
    delete req.session.username;
    res.redirect('/login');
  });
}

module.exports = registerAuthRoutes;
