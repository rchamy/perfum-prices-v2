import nodemailer from 'nodemailer'
import TelegramBot from 'node-telegram-bot-api'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const bot = process.env.TELEGRAM_BOT_TOKEN
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  : null

// --- Price alert for users ---

export async function sendPriceAlert(opts: {
  email: string | null
  telegram_chat_id: string | null
  channel: 'email' | 'telegram' | 'both'
  productName: string
  storeName: string
  oldPrice: number
  newPrice: number
  productUrl: string
}) {
  const { channel, email, telegram_chat_id, productName, storeName, oldPrice, newPrice, productUrl } = opts
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100)
  const priceFormatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(newPrice)

  if ((channel === 'email' || channel === 'both') && email) {
    await transporter.sendMail({
      from: `"Perfum Prices" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `💸 Alerta de precio: ${productName} bajó ${discount}%`,
      html: `
        <h2>${productName}</h2>
        <p>El precio en <strong>${storeName}</strong> bajó de <s>$${oldPrice.toLocaleString('es-CL')}</s> a <strong>${priceFormatted}</strong> (${discount}% de descuento).</p>
        <a href="${productUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Ver oferta</a>
        <p style="margin-top:16px;font-size:12px;color:#6b7280;">Perfum Prices — Chile</p>
      `,
    })
  }

  if ((channel === 'telegram' || channel === 'both') && telegram_chat_id && bot) {
    await bot.sendMessage(
      telegram_chat_id,
      `💸 *${escapeMarkdown(productName)}* bajó ${discount}%\n\n` +
      `Tienda: ${escapeMarkdown(storeName)}\n` +
      `Precio: *${priceFormatted}*\n\n` +
      `[Ver oferta](${productUrl})`,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: false },
    )
  }
}

// --- Scraper failure alert for admin ---

export async function sendScraperAlert(opts: {
  storeName: string
  errorMessage: string
  adminPanelUrl: string
}) {
  const { storeName, errorMessage, adminPanelUrl } = opts
  const adminEmail = process.env.ADMIN_EMAIL
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID

  if (adminEmail) {
    await transporter.sendMail({
      from: `"Perfum Prices" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `⚠️ Scraper fallido — ${storeName}`,
      html: `
        <h2>⚠️ Error en scraper: ${storeName}</h2>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p><strong>Hora:</strong> ${new Date().toLocaleString('es-CL')}</p>
        <a href="${adminPanelUrl}" style="background:#dc2626;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Ver en panel Admin</a>
      `,
    })
  }

  if (adminChatId && bot) {
    await bot.sendMessage(
      adminChatId,
      `⚠️ *Scraper fallido*: ${escapeMarkdown(storeName)}\n\nError: ${escapeMarkdown(errorMessage)}\n\n[Ver en panel](${adminPanelUrl})`,
      { parse_mode: 'MarkdownV2' },
    )
  }
}

// Start Telegram bot listener for /start <token> (user linking)
export function startTelegramBot(onToken: (chatId: string, token: string) => Promise<void>) {
  if (!bot) return
  bot.startPolling()
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = String(msg.chat.id)
    const token = match?.[1]?.trim()
    if (!token) return
    try {
      await onToken(chatId, token)
      await bot!.sendMessage(chatId, '✅ Tu cuenta de Telegram ha sido vinculada correctamente.')
    } catch {
      await bot!.sendMessage(chatId, '❌ Token inválido o expirado. Genera uno nuevo desde la app.')
    }
  })
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}
