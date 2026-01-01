'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendVerificationEmail({ email, username, code }) {
  const info = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'ChatCalendarご本人確認コード認証メール',
    text: `${username}さん,コードは${code}です。`,
    html: `
      <div>
        <p>${username}さん、認証コードは <b>${code}</b> です。</p>
        <p>このコードは 10 分間 有効です。時間内に入力を完了してください。</p>
        <p>心当たりがない場合は、このメールを破棄してください。</p>
      </div>`,
  });

  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  return info;
}

async function sendInviteEmail({ email, myUsername, chatroomName, tokenurl }) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'ChatCalendar招待メール',
    text: '招待メール',
    html: `
      <div>
        <p>${myUsername}さんがあなたを${chatroomName}に招待しました。</p>
        <p><a href="${tokenurl}">クリック</a>こちらをクリックして参加してください。</p>
        <p>心当たりがない場合はリンクをクリックせず、このメールを破棄してください。</p>
      </div>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendInviteEmail,
};
