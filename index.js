'use strict';
const express = require('express');
const path = require('path')
const multer = require('multer')
const cloudinary = require('cloudinary').v2;
const app = express();
const http =require("http");
const server =http.createServer(app);
const io =require("socket.io")(server);
const session = require('express-session');



const pug = require('pug');
const bcrypt = require("bcrypt")
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });
const { body, validationResult } = require('express-validator');
const nodemailer = require("nodemailer");
const passport =require('passport');
//const YahooStrategy = require('passport-yahoo-oauth2').Strategy;
require('dotenv').config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
  fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
  cb(null, true);
  } else {
  cb(new Error('Unsupported file format'), false);
  }
  }
  });
    
const isProduction = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
const sessionsocket = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    secure: isProduction,  // localhostならfalse, HTTPS環境はtrue
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000}
});
io.use((socket, next) => {
  sessionsocket(socket.request, {}, next);
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sessionsocket); 
app.use(passport.initialize());
app.use(passport.session());
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
passport.serializeUser((user, done) => {
  console.log('serializeUser called with user:', user);
  if (!user) {
    console.error('serializeUser: user is undefined');
    return done(new Error('User object is null or undefined'), null);
  }
  if (!user.email) {
    console.error('serializeUser: user.email is missing', user);
    // ここで無理に進めず、エラーにするか
    return done(new Error('User email is missing'), null);
  }

  done(null, user.email);
});
passport.deserializeUser(async (email, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    done(null, user);
  } catch (err) {
    done(err,null);
  }
});
passport.use('google', new GoogleStrategy({
    
    clientID:    process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback",
    passReqToCallback   : true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try{
      console.log('Google profile:', profile);
      console.log('Google profile.id:', profile.id);
      console.log('Google profile.email:', profile.email);
      let googleuser=await prisma.user.findUnique({
        where:{googleid:profile.id}
      })
      if(googleuser){
        return done(null,googleuser)
      }else{
        const emailuser=await prisma.user.findUnique({
          where:{email:profile.email}
        })
        if(emailuser){
            const updateuser=await prisma.user.update({
              where:{email:profile.email},
              data:{googleid:profile.id}
            })
            return done(null,updateuser)
        }else{
          const newuser=await prisma.user.create({
            data:{
              username:profile.displayName || profile.email,
              email:profile.email,
              password:'',
              code:"some-value", 
              timerimit:new Date(),
              googleid:profile.id,
              isVerified:true
            }
          })
          return done(null,newuser)
        }
      }
    }catch(error){
      return done(error,null);
    }
  }
));
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));
app.get('/auth/google/success',async(req,res)=>{
  if(!req.user){
    res.redirect('/login')
  }
  req.session.logined=req.user.email
  req.session.username=req.user.username
  req.session.useremail=req.user.email
  res.redirect('/privatecalendar')
})
app.get('/auth/google/failure',(req,res)=>{
  res.send('失敗しました')
})
//passport.use('yahoo', new YahooStrategy({
 // consumerKey:process.env.YAHOO_CONSUMER_KEY,
 // consumerSecret:process.env.YAHOO_CONSUMER_SECRET,
 // callbackURL: "http://localhost:8000/auth/yahoo/callback"
//},
//async function(token, tokenSecret, profile, done) {
 // try{
   // let yahoouser=await prisma.user.findUnique({
    //  where:{yahooid:profile.id}
   // })
   // if(yahoouser){
    //  return done(null,yahoouser)
    //}else{
     // const emailuser=await prisma.user.findUnique({
    //    where:{email:profile.email}
     // })
    //  if(emailuser){
      //  const updateuser=await prisma.user.update({
      //    where:{email:profile.email},
       //   data:{yahooid:profile.id}
     //   })
       // return done(null,updateuser)
     // }else{
       // const newuser= await prisma.user.create({
      //    data:{
        //    username:profile.displayName || profile.email,
          //  email:profile.email,
            //password:'',
           // code:"some-value", 
       //     timerimit:new Date(),
         //   yahooid:profile.id,
         //   isVerified:true

        //  }
     //   })
     //   return done(null,newuser)
     // }
   // }
 // }catch(error){
   // return done(error,null);
 // }
//}
//));
//app.get('/auth/yahoo',
 // passport.authenticate('yahoo', { scope:
   //   [ 'email', 'profile' ] }
//));
//app.get( '/auth/yahoo/callback',
 // passport.authenticate( 'yahoo', {
  //    successRedirect: '/auth/yahoo/success',
   //   failureRedirect: '/auth/yahoo/failure'
//}));
//app.get('/auth/yahoo/success',async(req,res)=>{
  //if(!req.user){
  //  res.redirect('/login')
 // }

  //req.session.logined=req.user.email
  //req.session.username=req.user.username
 // res.redirect('/home')
//})
//app.get('/auth/yahoo/failure',(req,res)=>{
 // res.send('失敗しました')
//})
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user:process.env.GMAIL_USER,
    pass:process.env.GMAIL_PASS,
  },
});
function getRndStr(){
  var str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&=~/*-+";
  var len = 6;
  var code = "";
  for(var i=0; i<len; i++){
    code += str.charAt(Math.floor(Math.random() * str.length));
  }
  return code;
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.urlencoded({ extended: true }));  //formのpostを受け取るためのもの



app.use(express.static(path.join(__dirname))); // 静的ファイル

app.use(express.static('public'))
function logincheck(req, res, next) {
  if (req.session && req.session.logined) { // ← 安全にチェック
    next();
  } else {
    res.redirect('/login'); 
  }
}

function loginchatcheck(req, res, next) {
  if (req.session && req.session.chatplay) { // ← 安全にチェック
    next();
  } else {
    res.redirect('/logout');
  }
}
function verifiedcheck(req,res,next){
  if(!req.session.userId){
    res.redirect('/newuser')
  }
  if(req.session.isverified){
    res.redirect('/login')
  }
  next();
}

// 0をつける
function normalizeDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) throw new Error('date形式が不正');
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}
app.get('/',(req,res)=>{
  res.redirect('/login');
})
app.get('/newuser',(req,res)=>{
  res.render('newuser')
});
// 新規ユーザー登録のエンドポイント
app.post(
  
  '/newuser',
  [
    body('email')
      .isEmail()
      .withMessage('Email must be valid'),

    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must be between 4 and 20 characters')
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
        where: { email }
      });
      if (existing) {
        const now = new Date();
        const expireTime = new Date(existing.timerimit);
        console.log('既存ユーザー発見:', existing.email, '期限:', expireTime, '現在:', now);
        if (!existing.isVerified && expireTime < now) {
          console.log('認証未済で期限切れ→削除して再登録');
          // 認証されてない＆期限切れ → 上書きOK
          await prisma.user.delete({where:{email}})
        } else if(existing.isVerified){
          console.log('認証済みのメールアドレス');
          return res.status(409).send('このメールアドレスはすでに使われている');
        }
        else {
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
            isVerified: false
          }
        });
      }
    
        
        try {
          
          const info = await transporter.sendMail({
            from: process.env.GMAIL_USER, // sender address
            to: email, 
            subject: "認証メール", // Subject line
            text: `${username}さん,コードは${code}です。`, // plain text body
            html: `<p>${username}さん、認証コードは <b>${code}</b> です。</p>`
          });
      
          console.log("Message sent: %s", info.messageId);
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        } catch (err) {
          console.error("Error while sending mail", err);
        }
        req.session.userId=email
        req.session.isverified=false;


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
app.get('/verify',(req, res)=>{
  res.render('verify');
})
app.post('/verify',async (req,res)=>{
  try{
    const email=req.session.userId
    const user=await prisma.user.findUnique({where:{email}})
    const {code}=req.body
    const now=new Date()
    const expireTime=new Date(user.timerimit);
    if(user.code===code && now<=expireTime){
      console.log(`正しい？コード${user.code}`)
      console.log(`正しい？送信コード${code}`)
      await prisma.user.update({
        where:{email},
        data: { isVerified: true },
      })
      res.redirect('/login');
    }else if(
      now>expireTime
    ){
      res.status(400).send('認証コードの有効期限が切れています');
    }else{
      res.status(400).send('認証コードが違います');
      console.log(`コード${user.code}`)
      console.log(`送信コード${code}`)
    }
  }catch (err) {
    console.error('認証処理中にエラー:', err);
    res.status(500).send('サーバーエラー');
  }
} )
app.get('/login', (req, res) => {
  res.render('login');
});

app.post("/login",async (req,res)=>{
  try{
    console.log(req.body);
  const {email,password}=req.body;
  
  const user= await prisma.user.findUnique({where: {email}});
  
  if(!user){
    res.status(400).send('ユーザ名が存在しません');
    return
  }
  const match=await bcrypt.compare(password,user.password)
  if(!match){
    res.status(400).send('パスワードが間違っています')
    return;
  }
  if(!user.isVerified){
    res.status(400).send('まだ認証ができていません。')
    return;
  }
  req.session.useremail = user.email
  req.session.logined=user.email
  req.session.username=user.username
  res.redirect('/privatecalendar')
}catch (error) {
    console.error(error);
    res.status(500).send('サーバーエラー');
  }
})

//プライベートカレンダー
app.get('/carender',logincheck, (req, res) => {
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
            content: { not: "" },
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


app.get('/logout', (req, res) => {
  req.session.destroy(()=>{
    res.redirect('/login')
  })
});

app.use(express.json());






app.get('/api/enterchat', logincheck, async (req, res) => {
  const email = req.session.logined;
  const user = await prisma.user.findUnique({ where: { email } });
  const chatmembers = await prisma.chatmember.findMany({
    where: { userId: user.id },
    include: { chatroom: true }
  });

  const chatlist = chatmembers.map(cm => ({
    chatid: cm.chatroom.chatid,
    id: cm.chatroom.id
  }));

  res.json(chatlist); // ← pugではなくJSONで返す
});

app.post('/api/sessionchat',logincheck,async(req,res)=>{
try{
  const {chatroomid}=req.body;
  req.session.chatplay=chatroomid
  res.json({ success: true, chatroomid });
}catch (error) {
  console.error(error);
  res.status(500).send('サーバーエラー');
}
})

app.post('/api/deletecount', loginchatcheck, async (req,res) =>{
  try{
    const email = req.session.useremail;
    const user=await prisma.user.findUnique({where:{email}})
    const{chatroomId,date}=req.body
    const start = new Date(date+"T00:00:00.000Z");
    const end = new Date(date+"T23:59:59.999Z")
    await prisma.countbatch.deleteMany({
      where:{
        userId:user.id,
        chatroomId,
        date:{
          gte:start,
          lt:end
        },
      }
    })


    res.json({ success: true });
  } catch (err) {
    console.error("deletecount エラー:", err);
    res.status(500).json({ error: "サーバーエラー" });
  }
})
app.post('/api/mycountbatch',logincheck, loginchatcheck, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.session.useremail } });
  const { chatroomId } =  req.body
  const counts = await prisma.countbatch.findMany({
    where: { userId: user.id, chatroomId },
  });
  const result = {};
  counts.forEach(c => {
    const dateStr = c.date.toISOString().slice(0,10);
    result[dateStr] = c.count;
  });
  res.json(result);
  console.log(`通知内容${result}`)
});


app.post('/api/mycountbatch/all',logincheck,  async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.session.useremail } });
  const counts = await prisma.countbatch.findMany({
    where: { userId: user.id },
  });
  const result = {};
  counts.forEach(c => {
    const dateStr = c.date.toISOString().slice(0,10);
    if (!result[c.chatroomId]) {
      result[c.chatroomId] = {};
      }
    result[c.chatroomId][dateStr] = c.count;
  });
  res.json(result);
  console.log(`通知内容${result}`)
});



app.get('/api/chatcalendar-info', logincheck,loginchatcheck, async (req, res) => {
  const chatroomId = req.session.chatplay;
  console.log(`あいデー${chatroomId}`)
  const username = req.session.username;
  const useremail = req.session.useremail;
  const chatroom = await prisma.chatroom.findUnique({ where: { id: chatroomId } });
  if (!chatroom) {
    return res.status(404).json({ error: 'チャットルームが見つかりません' });
  }
  const chatss = await prisma.chatmessage.findMany({
    where: {
      chatroomId: chatroomId, // ← ここを chatroomId にする
      OR: [
        { content: { not: "" } },
        {
          AND: [
            { imageUrl: { not: null } },
            { imageUrl: { not: "" } }
          ]
        }
      ]
    },
    select: { date: true }
  });
  

  const dates = chatss.map(post => {
  const da = new Date(post.date);
  return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
  });

  const members=await prisma.chatmember.findMany({
    where: {
      chatroomId: chatroomId
    },
    include:{
      user:{
        select:{username:true,email:true}
      }
    }
  })
  res.json({
    chatroomId,
    authority: chatroom.authority,
    username,
    useremail,
    chatroomname: chatroom.chatid,
    memodate: [...new Set(dates)],
    participants: members.map(m => ({
      name: m.user.username,
      email: m.user.email,
      role: m.role
    }))
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



app.get('/userinvite',async (req, res) => {
  try{
    const email = req.session.logined;
    const user = await prisma.user.findUnique({where: {email}});
    const user1=await prisma.friend.findMany({
      where:{
        user1Id:user.id
      },
      include:{user2:true}
    })
    const user2=await prisma.friend.findMany({
      where:{
        user2Id:user.id
      },
      include:{user1:true}
    })
    const friendlist1=user1.map(f=>({username:f.user2.username,email:f.user2.email}))
    const friendlist2=user2.map(f=>({username:f.user1.username,email:f.user1.email}))
    const friendlist=[...friendlist1,...friendlist2]
  const invite = req.query.invite === 'true';
  const notinvite = req.query.invite === 'false';
  const reason = req.query.reason || null;

  res.render('userinvite', { invite, notinvite,reason, friendlist})
}catch(error){
  console.error('DBエラー:', error)
}
});

function socketlogincheck(socket, next) {
  if (!socket.request.session || !socket.request.session.logined) {
    next(new Error('ログインしてください')); // res.redirectの代わり
  } else {
    next();
  }
}
io.use(socketlogincheck);

io.on('connection', async(socket) => {
  console.log('新しいSocket接続:', socket.id);
  const session = socket.request.session;
  
  const email=session.logined
  if (!session || !session.logined) {
    console.log('セッションなし、またはログインしていません');
    return;
  }
  

  console.log('セッションあり、ログインユーザー:', session.logined);
  console.log('ユーザー接続');
  socket.on('joinRoom', (chatroomid) => {
    console.log(`Socket ${socket.id} joined room ${chatroomid}`);
    if (socket.deleteRoom){
      socket.leave(socket.deleteRoom)
    }
    socket.deleteRoom=chatroomid
    socket.join(chatroomid);
    socket.emit('room-joined');
  });
  socket.on('get-chat-date',async(data) => {
    const chatroomid=data.chatroomid
    console.log('get-chat-date 受信 chatroomid:', chatroomid); 
    console.log('typeof chatroomid:', typeof chatroomid); 
    const chatrooms = await prisma.chatroom.findUnique({ where: { id: chatroomid } });
    try {
      
      if (!chatrooms) return;

      const chatss = await prisma.chatmessage.findMany({
        where: {
          OR: [
            { content: { not: "" } },
            {
              AND: [
                { imageUrl: { not: null } },
                { imageUrl: { not: "" } }
              ]
            }
          ],
          
          chatroom: { is: { id: chatroomid } }
        },
        select: { date: true }
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
  const user = await prisma.user.findUnique({where: {email}});
  if(user){
    socket.join(user.id)
    console.log(`user.id: ${user.id}`)
  }
  
  
  
  console.log('ユーザー接続2');
  socket.on("savereaction",async({messageId,emoji,roomId,email})=>{
    try{
      const user = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
      console.log(`ユーザ${user}`)
      console.log(`ユーザ${user.username}`)
      const check = await prisma.reaction.findUnique({
        where: {
          userId_messageId_emoji: { 
            userId: user.id, 
            messageId, 
            emoji 
          }
        }
      });
      if (!check){
        const saved=await prisma.reaction.create({
        data:{
          messageId:messageId,
          userId:user.id,
          emoji:emoji
        }
      
      })
      io.to(roomId).emit("newreaction", {
        type:"true",
        reaction:{
          ...saved,
          user: { id: user.id, username: user.username, email: user.email }
        } ,
        chatroomId: roomId,
      });
      console.log(`チャットID${roomId}`)
      }else{
        const deleted=await prisma.reaction.delete({
        where:{
          userId_messageId_emoji: {
            messageId:messageId,
            userId:user.id,
            emoji:emoji
          }
        }
      })
      io.to(roomId).emit("newreaction", {
        type:"false",
        reaction: deleted,
        user: { id: user.id, username: user.username, email: user.email },
        chatroomId: roomId,
      });
      }
      console.log(`ユーザ${user.username}`)
    }catch (e){
      console.log('リアクションエラー',e)

    }
  })

  socket.on("savechat", async ({ roomId, date, chat, imageUrl,important }) => {
    try {
      const user = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
      if (!user) return;
  
      const datestamp = new Date(normalizeDate(date) + 'T00:00:00.000Z');
      if (isNaN(datestamp)) {
        socket.emit('送信失敗', '無効な日付です');
        return;
      }
      console.log(`ユーザ情報${user}`)
  
      const saved = await prisma.chatmessage.create({
        data: {
          imageUrl,
          content: chat,
          email: user.email,
          date: datestamp,
          chatroomId: roomId ,
          userId:user.id,
          important
        },
        include: {
          user: { select: { username: true, email: true } }, // ← これを追加！
        },
      });
      console.log("保存されたchatmessage:", saved);
      io.to(roomId).emit("newchat", {
        chat: saved,
        date,
        chatroomId: roomId,
      });
      console.log(`チャットID${roomId}`)
      //通知
      const otherMembers = await prisma.chatmember.findMany({
        where: {
          chatroomId: roomId,
          NOT: { userId: user.id }
        },
        select: { userId: true }
      });
  
  
      // 並列 upsert → 成功したらそのユーザーroomへ通知
      await Promise.all(otherMembers.map(async (m) => {
        try {
          const upserted = await prisma.countbatch.upsert({
            where: {
              userId_chatroomId_date: {
                userId: m.userId,
                chatroomId: roomId,
                date: datestamp
              }
            },
            update: { count: { increment: 1 }, chatmessageId: { push: saved.id } },
            create: {
              userId: m.userId,
              chatroomId: roomId,
              date: datestamp,
              count: 1,
              chatmessageId: [saved.id]
            }
          });
          io.to(m.userId).emit('countbatchupdate', {
            chatroomId: roomId,
            date,         
            count: upserted.count  
          });
          console.log("通知送信:", m.userId, upserted.count,date)
        } catch (e) {
          console.error(`countbatch upsert failed for user ${m.userId}:`, e);
        }
      }));
  
      console.log("保存しました:", saved.id);
    } catch (error) {
      console.error("DBエラー:", error);
      socket.emit("送信失敗");
    }
  });
  socket.on("delete-message", async ({ messageId, roomId }) => {
    const message = await prisma.chatmessage.findUnique({
      where: { id: messageId },
      select: { date: true, chatroomId: true }
    });
    if (!message) return;

    await prisma.reaction.deleteMany({
      where: { messageId }
    });
    await prisma.chatmessage.update({
      where: { id: messageId },
      data: { deleted: true, important: false, content: "", imageUrl: null }
    });
    io.to(roomId).emit("message-deleted", { messageId });

    const affected = await prisma.countbatch.findMany({
      where: {
        chatroomId: roomId,
        date: message.date,
        chatmessageId: { has: messageId }
      }
    });

    await Promise.all(
      affected.map(async (batch) => {
        const newList = batch.chatmessageId.filter((id) => id !== messageId);
        const newCount = Math.max(0, batch.count - 1);

        await prisma.countbatch.update({
          where: { id: batch.id },
          data: {
            chatmessageId: newList,
            count: newCount
          }
        });

        const dateIso = message.date.toISOString().split("T")[0];
        io.to(batch.userId).emit("countbatchupdate", {
          chatroomId: roomId,
          date: dateIso,
          count: newCount
        });
      })
    );

    const remaining = await prisma.chatmessage.count({
      where: {
        chatroomId: roomId,
        date: message.date,
        deleted: false,
        OR: [
          { content: { not: "" } },
          { imageUrl: { not: null } }
        ]
      }
    });

    if (remaining === 0) {
      const clearedDate = message.date.toISOString().split("T")[0];
      io.to(roomId).emit("chat-date-cleared", {
        chatroomId: roomId,
        date: clearedDate,
      });
    }
  });

  app.post('/newchat',logincheck, async (req, res) => {
    console.log("aaaaaaaaaaaaaaaaaa")
    const { chatid} = req.body;
    const email=req.session.logined
    const user =await prisma.user .findUnique({where:{email}})
    try {const chatroomdata=await prisma.chatroom.create({
      data: {
        chatid
      }
    });
    await prisma.chatmember.create({
      data:{
        chatroomId:chatroomdata.id,
        userId:user.id,
        role:"leader"
      }
    })
    io.to(user.id).emit('newchatlist',{
      chatid:chatroomdata.chatid,
      id:chatroomdata.id
    })
    console.log(`ユーザイアでー${user.id}`)
    console.log("ddddddddddddddddd")
  
  
  }catch(error){
    console.error('チャット作成エラー:', error);
    res.send('IDが既に存在しています')
  }
  });

  socket.on("chenge-authority", async ({ chatroomId,val }) => {
    try {
      const myuser = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
      const myuserMember = await prisma.chatmember.findFirst({
        where: { chatroomId, userId: myuser.id }
      });
      if (!myuserMember || myuserMember.role !== "leader") {
        socket.emit("error-message", { message: "権限がありません" });
        return;
      }
      await prisma.chatroom.update({
        where: { id: chatroomId },
        data: { authority: val }  // val は true/false
      });
      io.to(chatroomId).emit("authority-changed", { chatroomId, val });
    } catch (e) {
      console.error("make-subleader error:", e);
    }
  });

  socket.on("make-subleader", async ({ chatroomId, userEmail }) => {
    try {
      const user=await prisma.user.findUnique({where:{email:userEmail}})
      const member=await prisma.chatmember.findUnique({
        where:{chatroomId_userId:{chatroomId,userId:user.id}},
        select:{role:true}
      })
      const newrole =member.role==="member" ? "subleader":"member";
      await prisma.chatmember.update({
        where: { chatroomId_userId: { chatroomId, userId:user.id} },
        data: { role: newrole }
      });

      const participants = await prisma.chatmember.findMany({
        where: { chatroomId },
        include: { user: { select: { username: true, email: true } } }
      });

      io.to(chatroomId).emit("newrole", {
        userEmail,newrole
      });

    } catch (e) {
      console.error("make-subleader error:", e);
    }
  });

  socket.on("change-leader",async({ chatroomId, userEmail })=>{
    try{
      const myuser = await prisma.user.findFirst({ where: { email: socket.request.session.useremail } });
      const isuser=await prisma.user.findUnique({ where: { email: userEmail } });
      if (!myuser)return
      const myuserMember = await prisma.chatmember.findFirst({
        where: { chatroomId, userId: myuser.id }
      });
      if (!myuserMember || myuserMember.role !== "leader") {
        socket.emit("error-message", { message: "権限がありません" });
        return;
      }
      if (!isuser) {
        socket.emit("error-message", { message: "対象ユーザーが存在しません" });
        return;
      }

      await prisma.chatmember.update({
        where: { chatroomId_userId: { chatroomId, userId:isuser.id} },
        data: { role: "leader" }
      });
      await prisma.chatmember.update({
        where: { chatroomId_userId: { chatroomId, userId:myuser.id} },
        data: { role: "member" }
      });
      io.to(chatroomId).emit("newrole", {
        userEmail,newrole:"leader"
      });
      io.to(chatroomId).emit("newrole", {
        userEmail:myuser.email,newrole:"member"
      });
    } catch (e) {
      console.error("change-leader error:", e);

    }
  });

  socket.on("delete-member", async ({ chatroomId, userEmail }) => {
    try {
      const issuerEmail = socket.request.session?.logined;
      const issuer = await prisma.user.findUnique({ where: { email: issuerEmail } });
      if (!issuer) return;

      const issuerMember = await prisma.chatmember.findFirst({
        where: { chatroomId, userId: issuer.id }
      });
      if (!issuerMember || issuerMember.role !== "leader") {
        socket.emit("error-message", { message: "権限がありません" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) return;
      await prisma.chatmember.delete({
        where: { chatroomId_userId: { chatroomId, userId: user.id } }
      });
      io.to(chatroomId).emit("member-removed", { chatroomId, userEmail });
      io.to(user.id).emit("kicked", { chatroomId });

      console.log(`removed ${userEmail} from ${chatroomId}`);
    } catch (e) {
      console.error("remove-member error:", e);
      socket.emit("error-message", { message: "サーバーエラー" });
    }
  });

  socket.on("delete-myuser", async ({ chatroomId, userEmail }) => {
    try {
      const currentEmail = socket.request.session?.logined;
      if (!currentEmail || currentEmail !== userEmail) {
        socket.emit("error-message", { message: "権限がありません" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { email: currentEmail } });
      if (!user) return;
      await prisma.chatmember.delete({
        where: { chatroomId_userId: { chatroomId, userId: user.id } }
      });
      io.to(chatroomId).emit("member-removed", { chatroomId, userEmail });
      io.to(user.id).emit("kicked", { chatroomId });
      console.log(`User ${currentEmail} left room ${chatroomId}`);
    } catch (e) {
      console.error("delete-myuser error:", e);
      socket.emit("error-message", { message: "サーバーエラー" });
    }
  });



  socket.on("update-username", async (usernameData) => {
    const email = socket.request.session.useremail;
    const user = await prisma.user.findUnique({ where: { email } });
    // 文字列かオブジェクトかを判定する
    const username =
      typeof usernameData === "string"
        ? usernameData
        : usernameData.username;

    console.log("名前変更:", username);

    const updateuser = await prisma.user.update({
      where: { id: user.id },
      data: { username: username }, 
    });
    socket.request.session.username = updateuser.username;
    socket.request.session.save();
    io.to(user.id).emit("reflection-username", updateuser.username);
  });


  //ユーザを招待
app.post('/userinvite',logincheck,loginchatcheck,async (req,res)=>{
  const chatroomid=req.session.chatplay
  const chatrooms=await prisma.chatroom.findUnique({where:{id:chatroomid}})
  const {email}=req.body;
  console.log('フレンドで追加',req.body)
  const user=await prisma.user.findUnique({where:{email}})
  if (!user){
    return res.redirect('/userinvite?invite=false&reason=notfound'); 
  }
  const membercheck=await prisma.chatmember.findFirst({
    where:{
      chatroomId:chatrooms.id,
      userId:user.id,
    }
  });
  if (membercheck){
    return res.redirect('/userinvite?invite=false&reason=already');
  }
  try{
    await prisma.chatmember.create({
      data:{
        chatroomId:chatrooms.id,
        userId:user.id,
      }
    })
    const members=await prisma.chatmember.findMany({
      where: {
        chatroomId: chatrooms.id
      },
      include:{
        user:{
          select:{username:true,email:true}
        }
      }
    })
    const participants= members.map(m => ({
      name: m.user.username,
      email: m.user.email,
      role:m.role

    }))
    io.to(chatrooms.id).emit('participants', { participants });
    io.to(user.id).emit('invitelist',{
      chatid:chatrooms.chatid,
      id:chatrooms.id
    })
    res.redirect('/userinvite?invite=true')
    
  }catch (error) {
    console.error('DBエラー:', error);
    res.redirect('/userinvite?invite=false&reason=error')

  }
});
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
          content: "",
        },
      });
    }

    // 既存のメモを全部削除してから新しいメモを追加
    await prisma.memo.deleteMany({
      where: { postId: post.id },
    });

    let savedMemoCount = 0;

    if (Array.isArray(memoList)) {
      const nonEmptyMemos = memoList.filter(text => text.trim() !== "");
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

    // 非空メモがある場合のみ newmemo を送る
    if (savedMemoCount > 0) {
      io.to(user.id).emit('newmemo', datestamp.toISOString().split('T')[0]);
    } else {
      // もしその日のメモが全削除なら、逆に「削除通知」を送ってUI更新する
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
  const { date, memoList } = req.body; // ← memoList は配列
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
          content: "",
        },
      });
    }


    let savedMemoCount = 0;

    if (Array.isArray(memoList)) {
      const nonEmptyMemos = memoList.filter(text => text.trim() !== "");
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

    // 非空メモがある場合のみ newmemo を送る
    if (savedMemoCount > 0) {
      io.to(user.id).emit('newmemo', datestamp.toISOString().split('T')[0]);
    } else {
      // もしその日のメモが全削除なら、逆に「削除通知」を送ってUI更新する
      io.to(user.id).emit('deletememo', datestamp.toISOString().split('T')[0]);
    }

    res.status(200).send('保存成功');
  } catch (error) {
    console.error('DBエラー:', error);
    res.status(500).send('保存失敗');
  }
});
  

  


  socket.on('friend',async(data)=>{
    const email=session.logined
    const user = await prisma.user.findUnique({where: {email}});
    console.log('フレンド',data)
    const friend= await prisma.user.findUnique({where: {email:data.friendlist}});
    console.log('friend:', JSON.stringify(friend, null, 2));
    let user1Id=user.id
    let user2Id=friend.id
    if (user1Id>user2Id){
      [user1Id,user2Id]=[user2Id,user1Id];
    }
    try{
      await prisma.friend.create({
        data:{
          user1Id,
          user2Id
        }
        
      })
      io.to(friend.id).emit('newfriend',{
        friendId:user.id,
        friendname:user.username
      })
      io.to(user.id).emit('newfriend',{
        friendId:friend.id,
        friendname:friend.username
      })
    }catch(error){
      console.error('friendエラー:',error);
      socket.emit('追加失敗')
    }

  })
  

})
app.get('/getchat', logincheck, loginchatcheck, async (req, res) => {
  try {
    if (!req.query.date) {
      res.status(400).send('dateパラメータが必要です');
      return;
    }

    const normalizedDate = normalizeDate(req.query.date);
    const start = new Date(normalizedDate + 'T00:00:00.000Z');
    const end = new Date(normalizedDate + 'T23:59:59.999Z');

    const email = req.session.logined;
    const user = await prisma.user.findUnique({ where: { email } });

    const chatroomid = req.session.chatplay;
    const chatroom = await prisma.chatroom.findUnique({ where: { id: chatroomid } });

    if (!chatroom) {
      return res.status(404).send('チャットルームが見つかりません');
    }
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
      user, // ログイン中のユーザー情報
    });
    
  } catch (error) {
    console.error('データ取り出し失敗', error);
    res.status(500).send('失敗');
  }
});

app.get('/home',logincheck,async(req,res)=>{
  try{
    const email = req.session.logined;
    const user = await prisma.user.findUnique({where: {email}});
    const user1=await prisma.friend.findMany({
      where:{
        user1Id:user.id
      },
      include:{user2:true}
    })
    const user2=await prisma.friend.findMany({
      where:{
        user2Id:user.id
      },
      include:{user1:true}
    })
    const friendlist1=user1.map(f=>f.user2.username)
    const friendlist2=user2.map(f=>f.user1.username)
    const friendlist=[...friendlist1,...friendlist2]
    
    res.render('home',{friendlist})
    
    
  }catch(error){
    onsole.error('getfriendエラー:', error);
    res.status(500).send('フレンド取得失敗');
  }
})
app.get('/api/friends',logincheck, async (req, res) => {
  const email = req.session.logined;
  const user = await prisma.user.findUnique({ where: { email } });
  
  const user1 = await prisma.friend.findMany({
    where: { user1Id: user.id },
    include: { user2: true }
  });

  const user2 = await prisma.friend.findMany({
    where: { user2Id: user.id },
    include: { user1: true }
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
})

// チャットカレンダー
const chatPath = '/app/frontend/chatcalendar/dist';

app.get('/chatcalendar' ,logincheck,(req,res)=>{
  res.sendFile(path.join(chatPath, 'index.html'));
})
app.use('/chatcalendar', express.static(chatPath));
app.get('/chatcalendar/*', logincheck, (req, res) => {
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


const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
