'use strict';
const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const pug = require('pug');
const bcrypt = require("bcrypt")
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });
require('dotenv').config()



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.urlencoded({ extended: true }));  //formのpostを受け取るためのもの
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname))); // 静的ファイル

app.use(express.static('public'))
function logincheck(req,res,next){
  if(req.session.logined){
    next()
  }else{
    res.redirect('/login'); 
  }
}
function loginchatcheck(req,res,next){
  if(req.session.chatlogin){
    next()
  }else{
    res.redirect('/enterchat')
  }
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
app.post('/newuser', async (req, res) => {
  const { username, password } = req.body;
  const hashpassword =await bcrypt.hash(password,10)
  try {await prisma.user.create({
    data: {
      username,
      password:hashpassword
    }
  });
  res.redirect('/login'); 

}catch(error){
  res.send('ユーザ名がすでに存在しています。')
}
});
app.get('/login', (req, res) => {
  res.render('login');
});

app.post("/login",async (req,res)=>{
  try{
    console.log(req.body);
  const {username,password}=req.body;
  
  const user = await prisma.user.findUnique({where: {username}});
  
  if(!user){
    res.status(400).send('ユーザ名が存在しません');
    return
  }
  const match=await bcrypt.compare(password,user.password)
  if(!match){
    res.status(400).send('パスワードが間違っています')
    return;
  }
  req.session.logined=user.username
  res.redirect('/home')
}catch (error) {
    console.error(error);
    res.status(500).send('サーバーエラー');
  }
})
//プライベートカレンダー
app.get('/carender',logincheck, (req, res) => {
  res.render('karennder');
});
app.get('/get-date',async (req,res)=>{
  const username=req.session.logined
  const user =await prisma.user .findUnique({where:{username}})
  try{

    const posts =await prisma.post.findMany({
      where: {
        NOT:{
          content: ""
        },
        userId:user.id,
      },
      select: {
       createdAt: true
      }
    })
    const dates =posts.map(post=>{
      const da =new Date(post.createdAt);
      return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
  })
  res.json(dates)

  }catch(error){
    console.error(error);
    res.status(500).send(エラー)
  }

})

app.get('/get-memo', async (req, res) => {
  try {
    if (!req.query.date) {
      res.status(400).send('dateパラメータが必要です');
      return;
    }
    const normalizedDate = normalizeDate(req.query.date);
    const start = new Date(normalizedDate + 'T00:00:00.000Z');
    const end = new Date(normalizedDate + 'T23:59:59.999Z');
    const username=req.session.logined
    const user =await prisma.user .findUnique({where:{username}})//prisma user　usernameの情報
    if (isNaN(start) || isNaN(end)) {
      res.status(400).send('無効な日付です');
      return;
    }

    const result = await prisma.Post.findFirst({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
        userId:user.id,
      },
    });

    if (result) {
      res.json({ memo: result.content });
    } else {
      res.json({ memo: '' });
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

app.post('/save-memo', async (req, res) => {
  const username=req.session.logined
  const { date, memo } = req.body;
  const user =await prisma.user .findUnique({where:{username}})
  try {
   
    const datestamp = new Date(normalizeDate(date) + 'T00:00:00.000Z');
    if (isNaN(datestamp)) {
      res.status(400).send('無効な日付です');
      return;
    }
    console.log(`受信した日付: ${date}, メモ: ${memo}`);

    await prisma.Post.upsert({
      where: { createdAt: datestamp },
      update: { content: memo },
      create: {
        content: memo,
        userId:user.id,
        postedBy: username,
        createdAt: datestamp,
      },
    });
    res.status(200).send('保存成功');
  } catch (error) {
    console.error('DBエラー:', error);
    res.status(500).send('保存失敗');
  }
});
//home
app.get('/home', logincheck,(req, res) => {
  res.render('home');
});
//chatカレンダー
app.get('/newchat',(req,res)=>{
  res.render('newchat')
});
app.post('/newchat',logincheck, async (req, res) => {
  const { chatid, password } = req.body;
  const hashpassword =await bcrypt.hash(password,10)
  try {await prisma.chatroom.create({
    data: {
      chatid,
      password:hashpassword
    }
  });
  res.redirect('/enterchat'); 

}catch(error){
  res.send('IDが既に存在しています')
}
});
app.get('/enterchat',(req,res)=>{
  res.render('enterchat');
})
app.post("/enterchat",logincheck,async (req,res)=>{
  try{
    const {chatid,password}=req.body;
  
  const room = await prisma.chatroom.findUnique({where: {chatid}});
  
  if(!room){
    res.status(400).send('ルームが存在しません');
    return
  }
  const match=await bcrypt.compare(password,room.password)
  if(!match){
    res.status(400).send('パスワードが間違っています')
    return;
  }
  req.session.chatlogin=chatid

  res.redirect('/chatcalendar');
}catch (error) {
    console.error(error);
    res.status(500).send('サーバーエラー');
  }
})
app.get('/chatcalendar',loginchatcheck, (req, res) => {
  console.log("chatlogin セッション:", req.session.chatlogin); 
  res.render('chatcalendar');
});
app.post('/savechat', async (req, res) => {
  const chatid=req.session.chatlogin
  const { date, chat } = req.body;
  const chats =await prisma.chatroom.findUnique({where:{chatid}})
  const username=req.session.logined
  try {
   
    const datestamp = new Date(normalizeDate(date) + 'T00:00:00.000Z');
    if (isNaN(datestamp)) {
      res.status(400).send('無効な日付です');
      return;
    }
    
    
    await prisma.chatmessage.create({
      data: {
        content: chat,
        chatId:chats.id,
        date: datestamp,
        postedBy: username,
      },
    });res.status(200).send('送信成功');
  } catch (error) {
    console.error('DBエラー:', error);
    res.status(500).send('送信失敗');
  }
});
app.get('/getchat', async (req, res) => {
  try {
    if (!req.query.date) {
      res.status(400).send('dateパラメータが必要です');
      return;
    }
    const normalizedDate = normalizeDate(req.query.date);
    const start = new Date(normalizedDate + 'T00:00:00.000Z');
    const end = new Date(normalizedDate + 'T23:59:59.999Z');
    const username = req.session.logined;
    const user = await prisma.user.findUnique({where: {username}});
    const chatid=req.session.chatlogin
    const chats =await prisma.chatroom.findUnique({where:{chatid}})
    if (isNaN(start) || isNaN(end)) {
      res.status(400).send('無効な日付です');
      return;
    }
    const result =await prisma.chatmessage.findMany({
      where:{
        date:{
          gte: start,
          lt: end,
        },
        chatId:chats.id,
      }
    });
    res.json({chat:result,
              user:user,
    });
    
  } catch (error) {
    console.error('データ取り出し失敗', error);
    res.status(500).send('失敗');
  }
});
app.get('/get-chat-date',async (req,res)=>{
  const chatid=req.session.chatlogin
  const chats =await prisma.chatroom.findUnique({where:{chatid}})
    try{
      const chatss=await prisma.Chatmessage.findMany({
        where: {
          NOT:{
            content: ""
          },
          chatId:chats.id,
        },
        select: {
        date: true
        }
      })
      const dates =chatss.map(post=>{
        const da =new Date(post.date);
        return `${da.getFullYear()}-${String(da.getMonth() + 1).padStart(2, '0')}-${String(da.getDate()).padStart(2, '0')}`;
    })
    res.json(dates)

  }catch(error){
    console.error(error);
    res.status(500).send(エラー)
  }

})
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});