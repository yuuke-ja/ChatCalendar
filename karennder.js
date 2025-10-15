function chatlist(){
    fetch('/api/enterchat')
        .then(res => res.json())
        .then(data => {
          const container = document.getElementById('chat-list');
          container.innerHTML = '';
          data.forEach(chat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = chat.chatid;
            btn.dataset.chatid = chat.id;
            btn.addEventListener('click',async()=>{
                try{
                    await fetch('/api/sessionchat',{
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatroomid: chat.id })
                    });
                    window.location.href = '/chatcalendar';
                }catch (err) {
                    console.error(err);
                    alert('チャットカレンダーへの移動に失敗しました');
                }
            });
            container.appendChild(btn);
            
        })
        })
}
document.addEventListener('DOMContentLoaded',chatlist);
const memos = {};
const date = new Date()
const thisYear = date.getFullYear()
const thisMonth = date.getMonth() + 1
const today = date.getDate()
const yotei = localStorage.getItem('dateStr');
let year=date.getFullYear()
let month=date.getMonth()+1
let windw=null;
let memodate=[]



const youbi=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const config={
    show:12,
}
fetch('/get-date')
.then(res=>res.json())
.then(data=>{
  memodate=data;
  showkarennder(year,month);
});

function showkarennder(year,month){
for(i=0; i<config.show;i++){
let karennderHTML=createkarennder(year,month)
const sec=document.createElement('section')
sec.innerHTML=karennderHTML
document.querySelector('#karennder').appendChild(sec)
month++
if(month>12){
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
    karennderHTML+='<td>'+youbi[i]+'</td>'
}
karennderHTML+='</tr>'
for(let w=0;w<6;w++){
    karennderHTML+='<tr>';  

for(let d=0;d<7;d++){
    if(w===0&&d<startday){
       let num=lastMonthendDaycount -startday+d+1;
       karennderHTML+='<td class="kako">'+num+'</td>'
    }else if(daycount>endday){
        let num=daycount-endday
        karennderHTML+='<td class="kako">'+num+'</td>'
        daycount++;
    }else {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(daycount).padStart(2, '0')}`;
    const havememo=memodate.includes(dateStr);
    const irotuke=havememo ? 'style="background-color:rgb(23, 242, 198);"' : '';
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
    document. querySelector('#karennder').innerHTML=''
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
    },10000)