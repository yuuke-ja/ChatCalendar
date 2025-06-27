'use strict';
const express = require('express');
const path = require('path');
const app = express();
const http =require("http");
const server =http.createServer(app);
const io =require("socket.io")(server);
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

const sessionsocket = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // localhostならfalse, HTTPS環境はtrue
    maxAge: 24 * 60 * 60 * 1000}
});
io.use((socket, next) => {
  sessionsocket(socket.request, {}, next);
});
app.use(sessionsocket); 

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
  if(req.session.chatplay){
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
    res.status(500).send('エラー')
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

    const result = await prisma.post.findFirst({
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

    const Post = await prisma.post.findFirst({
      where: {
        userId: user.id,
        createdAt: datestamp,
      },
    });
    
    if (Post) {
      await prisma.post.update({
        where: { id: Post.id },
        data: { content: memo },
      });
    } else {
      await prisma.post.create({
        data: {
          content: memo,
          userId: user.id,
          postedBy: username,
          createdAt: datestamp,
        },
      });
    }
    
    res.status(200).send('保存成功');
  } catch (error) {
    console.error('DBエラー:', error);
    res.status(500).send('保存失敗');
  }
});



//chatカレンダー
app.get('/newchat',logincheck,(req,res)=>{
  res.render('newchat')
});
app.post('/newchat',logincheck, async (req, res) => {
  const { chatid} = req.body;
  const username=req.session.logined
  const user =await prisma.user .findUnique({where:{username}})
  try {const chatroomdata=await prisma.chatroom.create({
    data: {
      chatid
    }
  });
  await prisma.chatmember.create({
    data:{
      chatroomId:chatroomdata.id,
      userId:user.id,
    }
  })
  res.redirect('/enterchat'); 

}catch(error){
  console.error('チャット作成エラー:', error);
  res.send('IDが既に存在しています')
}
});
app.get('/enterchat',logincheck,async(req,res)=>{
  const username=req.session.logined
  const user =await prisma.user .findUnique({where:{username}})
  const chatmembers  =await prisma.chatmember.findMany({
    where:{
      userId:user.id,
    },
    include: {chatroom: true}
  })
  const chatlist =chatmembers.map(cm=>({chatid:cm.chatroom.chatid,
    id: cm.chatroom.id

}))
  res.end(pug.renderFile('./views/enterchat.pug', { chatlist }));
})
app.get('/sessionchat',(req,res)=>{

  res.render('sessionchat');
});
app.post('/sessionchat',logincheck,async(req,res)=>{
try{
  const {chatroomid}=req.body;
  req.session.chatplay=chatroomid
  res.redirect('/chatcalendar')
}catch (error) {
  console.error(error);
  res.status(500).send('サーバーエラー');
}
})
app.get('/chatcalendar',loginchatcheck, async(req, res) => {
  const chatroomId=req.session.chatplay
  const username=req.session.logined
  const chatroom=await prisma.chatroom.findUnique({
    where:{id:chatroomId},
    
     
  })
  console.log("chatlogin セッション:", req.session.chatplay); 
  const chatroomname=chatroom.chatid
  res.render('chatcalendar',{chatroomId,username,chatroomname});//描画、渡す。
});

app.get('/userinvite',async (req, res) => {
  try{
    const username = req.session.logined;
    const user = await prisma.user.findUnique({where: {username}});
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
  const invite = req.query.invite === 'true';
  const notinvite = req.query.invite === 'false';
  res.render('userinvite', { invite, notinvite, friendlist})
}catch(error){
  console.error('DBエラー:', error)
}
});
//ユーザを招待
app.post('/userinvite',async (req,res)=>{
  const chatroomid=req.session.chatplay
  const chatrooms=await prisma.chatroom.findUnique({where:{id:chatroomid}})
  const {username}=req.body;
  console.log('フレンドで追加',req.body)
  const user=await prisma.user.findUnique({where:{username}})
  try{
    await prisma.chatmember.create({
      data:{
        chatroomId:chatrooms.id,
        userId:user.id,
      }
    })
    res.redirect('/userinvite?invite=true')
    
  }catch (error) {
    console.error('DBエラー:', error);
    res.redirect('/userinvite?invite=false')
  }
});

io.on('connection', async(socket) => {
  console.log('新しいSocket接続:', socket.id);
  const session = socket.request.session;
  
  const username=session.logined
  if (!session || !session.logined) {
    console.log('セッションなし、またはログインしていません');
    return;
  }

  console.log('セッションあり、ログインユーザー:', session.logined);
  console.log('ユーザー接続');
  socket.on('joinRoom', (chatroomid) => {
    console.log(`Socket ${socket.id} joined room ${chatroomid}`);
    socket.join(chatroomid);
    socket.emit('room-joined');
  });
  socket.on('get-chat-date',async(data) => {
    const chatroomid=data.chatroomid
    console.log('get-chat-date 受信 chatroomid:', chatroomid); 
    console.log('typeof chatroomid:', typeof chatroomid); // 👈 これを追加
    const chatrooms = await prisma.chatroom.findUnique({ where: { id: chatroomid } });
    try {
      
      if (!chatrooms) return;

      const chatss = await prisma.chatmessage.findMany({
        where: {
          NOT: { content: "" },
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
  const user = await prisma.user.findUnique({where: {username}});
  if(user){
    socket.join(user.id)
    console.log(`user.id: ${user.id}`)
  }
  
  
  
  console.log('ユーザー接続2');

  socket.on('savechat',async(data) => {
    const chatroomid=session.chatplay
    const { date, chat } = data;
    console.log('date:',date)
    console.log('chat:',chat)
    const chatrooms =await prisma.chatroom.findUnique({where:{id:chatroomid}});
    const username=session.logined
    const user = await prisma.user.findUnique({where: {username}});
    try {
   
      const datestamp = new Date(normalizeDate(date) + 'T00:00:00.000Z');
      if (isNaN(datestamp)) {
        res.status(400).send('無効な日付です');
        return;
      }

    const saved=await prisma.chatmessage.create({
      data: {
        content: chat,
       
        date: datestamp,
        postedBy: username,
        chatroom: {
          connect: {id:chatrooms.id,}
          }
      },
      
    });
    io.to(chatroomid).emit('newchat', {
      chat:saved,
      user:user,
      date:date
    });
    console.log(`保存しました`);
  } catch (error) {
    console.error('DBエラー:', error);
    socket.emit('送信失敗');
  }
  });


  


  socket.on('friend',async(data)=>{
    const username=session.logined
    const user = await prisma.user.findUnique({where: {username}});
    console.log('フレンド',data)
    const friend= await prisma.user.findUnique({where: {username:data.friendlist}});
    console.log('friend:', JSON.stringify(friend, null, 2));

    try{
      await prisma.friend.create({
        data:{
          user1Id:user.id,
          user2Id:friend.id
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
    const chatroomid=req.session.chatplay
    const chatrooms =await prisma.chatroom.findUnique({where:{id:chatroomid}})
    if (isNaN(start) || isNaN(end)) {
      socket.emit('エラー');
      return;
    }
    const result =await prisma.chatmessage.findMany({
      where:{
        date:{
          gte: start,
          lt: end,
        },
        chatroom: {
          is:{
            id: chatrooms.id
          }
        }
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
app.get('/home',logincheck,async(req,res)=>{
  try{
    const username = req.session.logined;
    const user = await prisma.user.findUnique({where: {username}});
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

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

 