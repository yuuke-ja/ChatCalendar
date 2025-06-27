
const memos = {};
const date = new Date()
const thisYear = date.getFullYear()
const thisMonth = date.getMonth() + 1
const today = date.getDate()
const yotei = localStorage.getItem('dateStr');
const chatroomid=window.chatroomId
let year=date.getFullYear()
let month=date.getMonth()+1

let memodate=[]
let socket=io();

socket.on('room-joined', () => {
    console.log('room-joined 受信！');

    socket.emit('get-chat-date', {
      chatroomid: chatroomid
    });
    
    console.log('get-chat-date送信:', chatroomid)
});

socket.on('connect', () => {
    console.log('Socket接続完了:', socket.id);
    console.log('chatroomId:', window.chatroomId);
    if (!window.chatroomId) {
      console.error('chatroomIdが未定義emit中止');
    } else {
      console.log('joinRoom emit 実行');
      socket.emit('joinRoom', chatroomid);
    }
});

socket.on('chat-dates-response',(datas)=>{
    memodate=datas.dates;
    console.log('帰ってきた:');
    showkarennder(year, month);
});

const youbi=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const config={show:12,};

function showkarennder(year,month){
    for(i=0; i<config.show;i++){
        let karennderHTML=createkarennder(year,month)
        const sec=document.createElement('section')
        sec.innerHTML=karennderHTML
        document.querySelector('#chatcalendar').appendChild(sec)
        month++
        if(month>12) {
            year++
            month=1
        }
    }
}

function createkarennder(year,month){
  let daycount=1
 


    const date = new Date()
const thisYear = date.getFullYear()
const thisMonth = date.getMonth() + 1
const today = date.getDate()

const startdate=new Date (year,month-1,1)
const enddate=new Date(year,month,0)
const startday=startdate.getDay()//最初の曜日
const endday=enddate.getDate()//最後の日

const lastMonthEndDate=new Date(year,month-1,0)
const lastMonthendDaycount=lastMonthEndDate.getDate()

let karennderHTML=''

karennderHTML+='<h1>'+year+'/'+month+'</h1>'
karennderHTML+='<table>'
karennderHTML+='<tr>'
for(let i=0; i<youbi.length ; i++){
    karennderHTML+=`<td>${youbi[i]}</td>`;
}
karennderHTML+='</tr>'
for(let w=0;w<6;w++){
    karennderHTML+='<tr>';  

for(let d=0;d<7;d++){
    if(w===0&&d<startday){
       let num=lastMonthendDaycount -startday+d+1;
       karennderHTML+=`<td class="kako">${num}</td>`
    }else if(daycount>endday){
        let num=daycount-endday
        karennderHTML+=`<td class="kako">${num}</td>`
        daycount++;
    }else {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(daycount).padStart(2, '0')}`;
    // console.log('memodate:', memodate);
    const havememo=memodate.includes(dateStr);
    const irotuke=havememo ? ' class="irotuke"' : '';
    if( year==thisYear&&month==thisMonth&&daycount==today){
       
        karennderHTML+=`<td data-date="${dateStr}"${irotuke}><span class="today">${daycount}</span></td>`
        
    }else{
        karennderHTML += `<td data-date="${dateStr}"${irotuke}><span>${daycount}</span></td>`;
    }
    daycount++;
}

}
karennderHTML+='</tr>'



}
karennderHTML+='</table>'
return karennderHTML
}
function movekarennder(e){
    document. querySelector('#chatcalendar').innerHTML=''
    if (e.target.id==='prev'){
        month--
        if(month<1){
            year--
            month=12
        }
    }
    else if(e.target.id==='next'){
        month++
        if(month>12){
            year++
            month=1
        }
    }
showkarennder(year,month)
}

document.querySelector('#prev').addEventListener('click',movekarennder)
document.querySelector('#next').addEventListener('click',movekarennder)
 


document.addEventListener('click', function (e) {
  if (e.target.closest('td') && e.target.closest('td').dataset.date) {
    const td = e.target.closest('td');
    const dateStr = td.dataset.date;
    openModal(dateStr);
 
  }
});


    setInterval(function(){
        const now = new Date()
        const currentDate = now.getDate()
    if(currentDate !==today){
        location.reload()
    }
    },10000);
    
      window.closeModal = function () {
        document.getElementById("chatmodal").style.display = "none";
        chatcalendar.classList.remove('small-chatcalendar');
        document.getElementById('chatcalendar').classList.add('restore')
        chatcalendar.classList.remove('restore');
       
      };
    //表示
    
      
    
      window.openModal = async function(dateStr) {
        document.getElementById('chatmodal').style.display = 'block';
        document.getElementById('chatcalendar').classList.add('small-chatcalendar')
        const chatHistoryDiv = document.getElementById('chatwrite');
        chatHistoryDiv.innerHTML = '';
       
        const response = await fetch(`/getchat?date=${dateStr}`);
        const {chat,user} = await response.json();
        

        let htmlContent = '';
        let userclass='';
        if (chat && Array.isArray(chat) && chat.length > 0) {
          chat.forEach(chatwrite => {
            if(chatwrite.postedBy===myusername){
               userclass="myuser";
            }else{
               userclass="othersuser";
            }
            htmlContent += `
            <div class="${userclass}">
              <p class="date">${new Date(chatwrite.createdAt).toLocaleString()}</p>
              <p class="user">${chatwrite.postedBy}</p>
              <p class="content">${chatwrite.content}</p>
              </div>
              
            `;
          });
        } else {
          htmlContent = '<p>この日のチャットはありません。</p>';
        }

        chatHistoryDiv.innerHTML = htmlContent;
        requestAnimationFrame(() => {
          chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
            });
        document.getElementById('modal-date').innerText = dateStr;
      };

      document.getElementById("save").addEventListener("click", async () => {
        console.log('送信ボタンがクリックされました！');
        const chatsave = document.getElementById('chat').value;
        const dateStr = document.getElementById('modal-date').innerText;

        socket.emit('savechat',{
          date:dateStr,
          chat:chatsave
        });
          alert('送信しました');
          await window.openModal(dateStr);
          document.getElementById('chat').value = '';
          const td=document.querySelector(`td[data-date="${dateStr}"]`);
      });
      socket.on('newchat', (data) => {
      const dateStr = document.getElementById('modal-date').innerText;
      const chat = data.chat;
      const user = data.user;
      const chatdate =data.date;
      if (!memodate.includes(chatdate)) {
        memodate.push(chatdate);//すでにあるか判定して配列に追加
      }
    
      // カレンダーの該当セルを直接クラス付与して色付け
      const td = document.querySelector(`td[data-date="${chatdate}"]`);
      if (td) {
        td.classList.add('irotuke');
      }
      console.log('modal-date:', `"${dateStr}"`);
      console.log('data.date:', `"${chatdate}"`);
      // 現在表示中の日付と一致するか確認
      if (chatdate === dateStr) {
        
        const chatHistoryDiv = document.getElementById('chatwrite');
        const div = document.createElement('div');
        if(chat.postedBy===myusername){
        console.log(`${myusername}`)
        userclass="myuser";
        }else{
        userclass="othersuser";
        }
        
        div.innerHTML = `
          <div class="${userclass}">
            <p>${new Date(chat.createdAt).toLocaleString()}</p>
            <p class="user">${chat.postedBy}</p>
            <p class="content">${chat.content}</p>
          `;

        chatHistoryDiv.appendChild(div);
        //chatHistoryDiv.appendChild(document.createElement('br'));

        // 一番下までスクロール
        requestAnimationFrame(() => {
            chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
          });
        }
      });
    

      //showkarennder(year, month);

      
