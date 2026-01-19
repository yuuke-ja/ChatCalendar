'use strict';

const { google } = require('googleapis');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

function registerGoogleRoutes({
  app,
  passport,
  prisma,
  logincheck,
  resolveInviteContext,
  clearInviteSession,
  getPendingInviteToken,
}) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:8000/auth/google/callback',
        passReqToCallback: true,
      },
      async function (request, accessToken, refreshToken, profile, done) {
        try {
          const state = request.query.state || '';
          const isLink = state.startsWith('link:');

          console.log('==== [GoogleStrategy START] ====');
          console.log('SessionID:', request.sessionID);
          console.log('Session before setting tokens:', request.session);
          console.log('req.session.logined:', request.session.logined);
          request.session.oauthAccessToken = accessToken;
          request.session.oauthRefreshToken = refreshToken;
          console.log('Google profile:', profile);
          console.log('req.session.logined (after):', request.session.logined);
          console.log('Google profile.id:', profile.id);
          console.log('Google profile.email:', profile.email);
          let googleuser = await prisma.user.findUnique({
            where: { googleid: profile.id },
          });
          if (isLink) {
            if (googleuser) {
              const updateData = {
                googleAccessToken: accessToken,
              };
              if (refreshToken) {
                updateData.googleRefreshToken = refreshToken;
              }
              const updatedUser = await prisma.user.update({
                where: { id: googleuser.id },
                data: updateData,
              });
              return done(null, updatedUser);
            } else {
              const emailuser = await prisma.user.findUnique({
                where: { email: profile.email },
              });
              if (emailuser) {
                const updateuser = await prisma.user.update({
                  where: { email: profile.email },
                  data: {
                    googleid: profile.id,
                    googleAccessToken: accessToken,
                    googleRefreshToken: refreshToken,
                  },
                });
                return done(null, updateuser);
              } else {
                const newuser = await prisma.user.create({
                  data: {
                    username: profile.displayName || profile.email,
                    email: profile.email,
                    password: '',
                    code: 'some-value',
                    timerimit: new Date(),
                    googleid: profile.id,
                    isVerified: true,
                  },
                });
                return done(null, newuser);
              }
            }
          }
          if (googleuser) {
            return done(null, googleuser);
          } else {
            const emailuser = await prisma.user.findUnique({
              where: { email: profile.email },
            });
            if (emailuser) {
              const updateuser = await prisma.user.update({
                where: { email: profile.email },
                data: { googleid: profile.id },
              });
              return done(null, updateuser);
            } else {
              const newuser = await prisma.user.create({
                data: {
                  username: profile.displayName || profile.email,
                  email: profile.email,
                  password: '',
                  code: 'some-value',
                  timerimit: new Date(),
                  googleid: profile.id,
                  isVerified: true,
                },
              });
              return done(null, newuser);
            }
          }
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  app.get('/auth/google', (req, res, next) => {
    const options = {
      scope: ['email', 'profile'],
      accessType: 'offline',
      prompt: 'consent',
    };

    const inviteToken = getPendingInviteToken(req);
    if (inviteToken) {
      options.state = `invite:${encodeURIComponent(inviteToken)}`;
    }

    passport.authenticate('google', options)(req, res, next);
  });

  app.get('/auth/google/link', logincheck, (req, res, next) => {
    const currentEmail = req.session.logined;
    console.log('[link] sid=', req.sessionID, 'logined=', currentEmail);

    req.session.googleLinkReturnTo =
      req.query.return || req.headers.referer || '/chatcalendar';

    const state = 'link:' + encodeURIComponent(currentEmail);

    passport.authenticate('google', {
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
      accessType: 'offline',
      prompt: 'consent',
      state,
    })(req, res, next);
  });

  app.get(
    '/auth/google/callback',
    (req, res, next) => {
      console.log(
        '[cb:start] sid=',
        req.sessionID,
        'logined=',
        req.session.logined,
        'state=',
        req.query.state
      );
      next();
    },
    passport.authenticate('google', {
      failureRedirect: '/auth/google/failure',
    }),
    async (req, res) => {
      console.log(
        '[cb:post-auth] sid=',
        req.sessionID,
        'logined=',
        req.session.logined,
        'state=',
        req.query.state
      );

      if (!req.user) return res.redirect('/login');

      const state = req.query.state || '';
      const inviteState = state.startsWith('invite:');
      let invitePayload = null;

      if (inviteState) {
        const inviteToken = decodeURIComponent(state.slice('invite:'.length));
        invitePayload = await prisma.invite.findUnique({
          where: { token: inviteToken },
        });
        if (!invitePayload || invitePayload.invited) {
          clearInviteSession(req, res);
          return res.redirect('/login?error=invalid-invite');
        }
      }

      // ====== Googleカレンダー連携 ======
      if (state.startsWith('link:')) {
        const linkedEmail = decodeURIComponent(state.slice('link:'.length));
        if (state.startsWith('link:')) {
          req.session.passport = { user: linkedEmail };
        }

        console.log(
          '[link-flow] linkedEmail=',
          linkedEmail,
          'googleUser=',
          req.user.email
        );
        const regainUser = await prisma.user.findUnique({
          where: { email: linkedEmail },
        });
        if (regainUser) {
          req.session.logined = regainUser.email;
          req.session.username = regainUser.username;
          req.session.useremail = regainUser.email;
        }

        try {
          await prisma.user.update({
            where: { email: linkedEmail },
            data: {
              googleAccessToken: req.user.googleAccessToken,
              googleRefreshToken: req.user.googleRefreshToken,
            },
          });
        } catch (err) {
          console.error('Googleリンク更新失敗', err);
          return res.redirect('/auth/google/failure');
        }

        return res.redirect('/privatecalendar');
      }

      // ====== ふつうの Google ログイン ======
      req.session.logined = req.user.email;
      req.session.username = req.user.username;
      req.session.useremail = req.user.email;
      const storedInvite = await resolveInviteContext(req, res);
      const pendingInvite = invitePayload || storedInvite;
      if (pendingInvite) {
        const chatroomId = pendingInvite.chatroomId;
        const inviteToken = invitePayload?.token || pendingInvite.token;
        const email = req.session.logined;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          clearInviteSession(req, res);
          return res.redirect('/login?error=user-not-found');
        }
        const inviteRecord =
          invitePayload ||
          (await prisma.invite.findUnique({ where: { token: inviteToken } }));
        if (!inviteRecord || inviteRecord.invited) {
          clearInviteSession(req, res);
          return res.redirect('/login?error=invalid-invite');
        }
        try {
          await prisma.chatmember.create({
            data: { chatroomId, userId: user.id },
          });
        } catch (e) {
          if (e.code !== 'P2002') throw e;
        }
        await prisma.invite.update({
          where: { token: inviteToken },
          data: { invited: true },
        });
        clearInviteSession(req, res);
        return res.redirect(
          `/chatcalendar?roomId=${encodeURIComponent(chatroomId)}`
        );
      }
      res.redirect('/privatecalendar');
    }
  );

  app.post('/save-googlecalendar', logincheck, async (req, res) => {
    const email = req.session.logined;
    const user = await prisma.user.findUnique({ where: { email } });
    const { date, content, title, allday, startTime, endTime, notification } = req.body;
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    oAuth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
      return res.status(400).json({ success: false, message: 'Google連携が必要です' });
    }
    if (!allday && !startTime ) {
      return res.status(400).json({ success: false, message: '開始時間を指定してください' });
    }
    const start = allday ? { date } : { dateTime: `${date}T${startTime}:00`, timeZone: "Asia/Tokyo" };
    const end = allday ? { date } : { dateTime: `${date}T${endTime || startTime}:00`, timeZone: "Asia/Tokyo" };
    const minutes = Number.isFinite(Number(notification)) ? Number(notification) : null;
    const reminders = minutes === null
      ? { useDefault: true }
      : minutes === 0
        ? { useDefault: false, overrides: [] } // 0は通知なし
        : { useDefault: false, overrides: [{ method: "popup", minutes }] };
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: title || '(タイトルなし)',
          description: content || '（内容なし）',
          start: start,
          end: end,
          reminders,
        },
      });
      res.json({ success: true, link: response.data.htmlLink });
    } catch (error) {
      const errorCode = error?.response?.data?.error;
      if (errorCode === 'invalid_grant') {
        return res.status(401).json({
          success: false,
          message: 'Google連携が切れています。再連携してください。',
        });
      }
      console.error('Error creating event:', error?.message || errorCode);
      return res.status(500).json({
        success: false,
        message: 'Googleカレンダーへの登録に失敗しました',
      });
    }
  });

  app.get('/getgooglelist', logincheck, async (req, res) => {
    const email = req.session.logined;
    const user = await prisma.user.findUnique({ where: { email } });
    res.json({
      googleAccessToken: user.googleAccessToken,
      googleRefreshToken: user.googleRefreshToken,
    });
  });
}

module.exports = registerGoogleRoutes;
