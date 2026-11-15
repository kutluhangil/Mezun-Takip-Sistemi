import nodemailer from 'nodemailer'
import type { Lang } from './survey-types'

export interface SendMailInput {
  to: string
  subject: string
  text: string
  html: string
}

export interface SendMailResult {
  delivered: boolean
  provider: 'resend' | 'smtp' | 'dev-log'
  error?: string
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const from = process.env.MAIL_FROM || 'FBÜ İlk ve Acil Yardım <noreply@localhost>'
  const resendKey = process.env.RESEND_API_KEY?.trim()

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        return { delivered: false, provider: 'resend', error: `Resend ${res.status}: ${body}` }
      }
      return { delivered: true, provider: 'resend' }
    } catch (err) {
      return { delivered: false, provider: 'resend', error: (err as Error).message }
    }
  }

  const smtpHost = process.env.SMTP_HOST?.trim()
  if (smtpHost) {
    try {
      const port = Number(process.env.SMTP_PORT || 587)
      const secure = process.env.SMTP_SECURE === 'true'
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
          : undefined,
      })
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      })
      return { delivered: true, provider: 'smtp' }
    } catch (err) {
      return { delivered: false, provider: 'smtp', error: (err as Error).message }
    }
  }

  console.info(`[mail:dev-log] To: ${input.to} | Subject: ${input.subject}\n${input.text}`)
  return { delivered: false, provider: 'dev-log' }
}

export async function sendOtpEmail(params: {
  to: string
  fullName: string
  code: string
  lang: Lang
}): Promise<SendMailResult> {
  const { to, fullName, code, lang } = params
  const isEn = lang === 'en'
  const subject = isEn
    ? `${code} — Your Fenerbahçe University Alumni Survey Verification Code`
    : `${code} — FBÜ İlk ve Acil Yardım Mezun Anketi Giriş Kodunuz`

  const text = isEn
    ? `Hello ${fullName},\n\nYour 6-digit verification code for the Fenerbahçe University First and Emergency Aid Alumni Survey is:\n\n${code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this code, you can ignore this message.`
    : `Merhaba ${fullName},\n\nFenerbahçe Üniversitesi İlk ve Acil Yardım Programı Mezun Takip Sistemi giriş kodunuz:\n\n${code}\n\nBu kod 10 dakika süreyle geçerlidir.\n\nBu işlemi siz başlatmadıysanız bu e-postayı dikkate almayınız.`

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f9f9f7;color:#141413;padding:32px 20px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e1e1df;border-radius:16px;padding:28px;">
      <p style="font-size:13px;color:#87867f;margin:0 0 8px;">Fenerbahçe Üniversitesi · İlk ve Acil Yardım</p>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:500;margin:0 0 16px;">${
        isEn ? 'Verification Code' : 'Doğrulama Kodunuz'
      }</h1>
      <p style="font-size:15px;line-height:1.6;color:#52514e;margin:0 0 20px;">${
        isEn ? `Hello ${escapeHtml(fullName)}, enter the code below to continue:` : `Merhaba ${escapeHtml(fullName)}, ankete geçmek için aşağıdaki 6 haneli kodu girin:`
      }</p>
      <div style="font-family:monospace;font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f1f0ec;border:1px solid #e1e1df;border-radius:12px;padding:16px;color:#b5573a;">
        ${code}
      </div>
      <p style="font-size:13px;color:#87867f;margin:20px 0 0;">${
        isEn ? 'Valid for 10 minutes.' : 'Kod 10 dakika boyunca geçerlidir.'
      }</p>
    </div>
  </div>`

  return sendMail({ to, subject, text, html })
}

export async function sendReminderEmail(params: {
  to: string
  fullName: string
  surveyUrl: string
  lang: Lang
}): Promise<SendMailResult> {
  const { to, fullName, surveyUrl, lang } = params
  const isEn = lang === 'en'
  const subject = isEn
    ? 'Reminder: FBÜ First and Emergency Aid Alumni Survey'
    : 'Hatırlatma: FBÜ İlk ve Acil Yardım Mezun Bilgi Anketi'

  const text = isEn
    ? `Hello ${fullName},\n\nWe kindly invite you to complete the Fenerbahçe University First and Emergency Aid Alumni Tracking Survey. Your feedback directly helps improve our programme.\n\nOpen survey: ${surveyUrl}`
    : `Merhaba ${fullName},\n\nFenerbahçe Üniversitesi İlk ve Acil Yardım Programı mezun takip anketine henüz yanıtınızı iletmediğinizi görüyoruz. Görüşleriniz programımızın gelişimi için çok değerlidir.\n\nAnkete git: ${surveyUrl}`

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f9f9f7;color:#141413;padding:32px 20px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e1e1df;border-radius:16px;padding:28px;">
      <p style="font-size:13px;color:#87867f;margin:0 0 8px;">Fenerbahçe Üniversitesi · İlk ve Acil Yardım</p>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:500;margin:0 0 14px;">${
        isEn ? 'Alumni Survey Invitation' : 'Mezun Anketi Hatırlatması'
      }</h1>
      <p style="font-size:15px;line-height:1.65;color:#52514e;margin:0 0 22px;">${
        isEn
          ? `Hello ${escapeHtml(fullName)}, we would appreciate a few minutes of your time to share your current career status and feedback on the programme.`
          : `Merhaba ${escapeHtml(fullName)}, güncel çalışma durumunuzu ve program hakkındaki görüşlerinizi paylaşmak için birkaç dakikanızı rica ederiz.`
      }</p>
      <a href="${escapeHtml(surveyUrl)}" style="display:inline-block;background:#141413;color:#f9f9f7;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px;">
        ${isEn ? 'Open Survey' : 'Ankete Başla'}
      </a>
    </div>
  </div>`

  return sendMail({ to, subject, text, html })
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
