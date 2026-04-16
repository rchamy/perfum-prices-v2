import 'dotenv/config'
import express from 'express'
import { startScheduler } from './scheduler'
import { startTelegramBot } from './services/notification'
import { testSelectors } from './connectors/scraper'
import { supabase } from './db/supabase'

const port = Number(process.env.WORKER_PORT ?? 3001)
const app = express()
app.use(express.json())

// Internal endpoint: test scrape (called by API)
app.post('/internal/test-scrape', async (req, res) => {
  const { url, selectors } = req.body
  if (!url || !selectors) return res.status(400).json({ error: 'url and selectors are required' })

  try {
    const results = await testSelectors(url, selectors)
    res.json({ data: results })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/ping', (_req, res) => res.json({ status: 'ok' }))

app.listen(port, () => console.log(`Worker internal API on port ${port}`))

// Start Telegram bot for account linking
startTelegramBot(async (chatId, token) => {
  const { error } = await supabase
    .from('users')
    .update({ telegram_chat_id: chatId, telegram_link_token: null })
    .eq('telegram_link_token', token)

  if (error) throw new Error('Invalid token')
})

// Start the scheduler
startScheduler().catch(console.error)
