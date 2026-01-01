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
const crypto = require('crypto');




const pug = require('pug');
const bcrypt = require("bcrypt")
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });
const { body, validationResult } = require('express-validator');
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
  secure: false,
  sameSite: 'lax'
  }

});
io.use((socket, next) => {
  sessionsocket(socket.request, {}, next);
});


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sessionsocket); 
app.use(passport.initialize());
app.use(passport.session());
const registerGoogleRoutes = require('./googleRoutes');
const registerAuthRoutes = require('./auth');
const registerInviteRoutes = require('./invite');
const registerChatRoutes = require('./chat');
const registerSocketHandlers = require('./socket');
const { sendVerificationEmail, sendInviteEmail } = require('./mail');
passport.serializeUser((user, done) => {
  console.log('serializeUser called with user:', user);
  if (!user) {
    console.error('serializeUser: user is undefined');
    return done(new Error('User object is null or undefined'), null);
  }
  if (!user.email) {
    console.error('serializeUser: user.email is missing', user);
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

app.use(express.static('public', { extensions: ['html'] }))
function logincheck(req, res, next) {
  if (req.session && req.session.logined) { // ← 安全にチェック
    next();
  } else {
    res.redirect('/login'); 
  }
}

async function loginchatcheck(req, res, next) {
  // roomIdはクエリ/ボディ/パラメータのどれかから取る
  const roomId =
    req.query.roomId ||
    req.body.chatroomId ||
    req.params.roomId;

  if (!roomId) return res.redirect('/privatecalendar');

  const email = req.session.logined;
  if (!email) return res.redirect('/login');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.redirect('/login');

  const member = await prisma.chatmember.findFirst({
    where: { chatroomId: roomId, userId: user.id },
  });
  if (!member) return res.redirect('/privatecalendar');

  req.chatroomId = roomId;
  next();
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


function normalizeDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) throw new Error('date形式が不正');
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rememberInviteSession(req, res, invite) {
  req.session.pendingInvite = {
    token: invite.token,
    chatroomId: invite.chatroomId,
    email: invite.email,
  };
}

function clearInviteSession(req, res) {
  delete req.session.pendingInvite;
}

async function resolveInviteContext(req, res) {
  if (req.session.pendingInvite) {
    return req.session.pendingInvite;
  }
  return null;
}

function getPendingInviteToken(req) {
  return req.session.pendingInvite?.token || null;
}

registerGoogleRoutes({
  app,
  passport,
  prisma,
  logincheck,
  resolveInviteContext,
  clearInviteSession,
  getPendingInviteToken,
});

registerAuthRoutes({
  app,
  prisma,
  bcrypt,
  body,
  validationResult,
  getRndStr,
  sendVerificationEmail,
  resolveInviteContext,
  clearInviteSession,
});

registerInviteRoutes({
  app,
  prisma,
  io,
  crypto,
  sendInviteEmail,
  rememberInviteSession,
  logincheck,
});

registerChatRoutes({
  app,
  prisma,
  io,
  upload,
  cloudinary,
  logincheck,
  loginchatcheck,
  normalizeDate,
});

registerSocketHandlers({
  io,
  prisma,
  normalizeDate,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
