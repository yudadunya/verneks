// api/lib/email.js
// Email service menggunakan Nodemailer + Gmail
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
})

// Send reminder email kalau user tidak chat 2 hari
export async function sendChatReminderEmail(userEmail, userName) {
  if (!userEmail) return { error: 'Email not found' }

  const firstName = userName?.split(' ')[0] || 'Teman'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; line-height: 1.6; color: #333; }
        .message { background-color: #f9f9f9; border-left: 4px solid #25D366; padding: 15px; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-button { background-color: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 Halo, ${firstName}!</h1>
        </div>
        <div class="content">
          <p>Aku perhatiin kalau kita sudah 2 hari tidak ngobrol.</p>
          
          <div class="message">
            <p><strong>Momentum itu penting, ${firstName}.</strong></p>
            <p>Kesuksesan karier dibangun dari konsistensi kecil setiap hari. Jangan biarkan ritmemu hilang — satu percakapan hari ini bisa mengubah arah perjalananmu.</p>
          </div>

          <p>Target kariermu masih di depan. Aku di sini siap membantu kamu melangkah lebih dekat.</p>

          <div class="cta">
            <a href="https://verneks.my.id/chat" class="cta-button">💬 Tanya Diah Anna Sekarang</a>
          </div>

          <p style="color: #666; font-size: 14px;">Atau buka Verneks dan mulai ngobrol dengan Diah Anna kapan saja.</p>
        </div>
        <div class="footer">
          <p>Email ini dikirim dari Diah Anna, AI Career Mentor Verneks</p>
          <p>© 2024 Verneks. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: `"Diah Anna - Verneks" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `${firstName}, mari kita lanjutkan perjalanan karier kamu 🚀`,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('[sendChatReminderEmail]', error)
    return { error: error.message }
  }
}

// Send weekly review email
export async function sendWeeklyReviewEmail(userEmail, userName, reviewText) {
  if (!userEmail || !reviewText) return { error: 'Email or review text missing' }

  const firstName = userName?.split(' ')[0] || 'Teman'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5, #06B6D4); color: #fff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 20px; line-height: 1.7; color: #333; }
        .review-section { background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.05)); border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .review-section h3 { margin: 0 0 12px 0; color: #4F46E5; font-size: 16px; }
        .review-text { color: #333; font-size: 15px; line-height: 1.8; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-button { background-color: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Weekly Review Minggu Ini</h1>
          <p>Catatan personal dari Diah Anna untuk ${firstName}</p>
        </div>
        <div class="content">
          <p>Halo ${firstName},</p>
          
          <p>Minggu ini sudah berjalan dengan langkah-langkah penting menuju target kariermu. Berikut adalah refleksi mingguan dari aku:</p>

          <div class="review-section">
            <h3>💬 Catatan Diah Anna</h3>
            <div class="review-text">${reviewText.replace(/\n/g, '<br>')}</div>
          </div>

          <p>Terus pertahankan momentum ini, ${firstName}. Setiap langkah kecil hari ini adalah bagian dari kesuksesan besar di masa depan.</p>

          <div class="cta">
            <a href="https://verneks.my.id/dashboard" class="cta-button">📊 Lihat Dashboard Lengkap</a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">Buka Verneks untuk melihat progress detail, milestones yang sudah dicapai, dan roadmap selengkapnya.</p>
        </div>
        <div class="footer">
          <p>Email ini adalah review mingguan personal dari Diah Anna, AI Career Mentor Verneks</p>
          <p>© 2024 Verneks. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: `"Diah Anna - Verneks" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `📝 Weekly Review: Refleksi Minggu Ini dari Diah Anna`,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('[sendWeeklyReviewEmail]', error)
    return { error: error.message }
  }
}
