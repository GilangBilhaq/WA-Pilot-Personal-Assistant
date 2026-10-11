import { Hono } from 'hono'
import { Redis } from '@upstash/redis/cloudflare'
import { Client } from '@upstash/qstash'

type Bindings = {
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
  QSTASH_URL: string
  QSTASH_TOKEN: string
  FONNTE_TOKEN: string
  MY_PHONE_NUMBER: string // Nomor HP pemilik bot (misal: "628123456789")
  WORKER_URL: string // URL worker ini (misal: "https://wa-bot.user.workers.dev")
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const env = c.env
  const redis = Redis.fromEnv(env)
  
  const status = await redis.get('bot_status') || 'OFF'
  const text = await redis.get('auto_reply_text') || 'Maaf, saat ini saya sedang tidak dapat membalas pesan. Saya akan membalasnya nanti.'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Bot Dashboard</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .btn { padding: 10px 20px; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; }
        .btn-on { background: #28a745; }
        .btn-off { background: #dc3545; }
        textarea { width: 100%; height: 100px; margin-bottom: 10px; padding: 8px; }
      </style>
    </head>
    <body>
      <h1>WhatsApp Bot Control</h1>
      
      <div class="card">
        <h3>Status Bot: <strong>${status}</strong></h3>
        <form method="POST" action="/update-status">
          <button type="submit" name="status" value="ON" class="btn btn-on">Nyalakan (ON)</button>
          <button type="submit" name="status" value="OFF" class="btn btn-off">Matikan (OFF)</button>
        </form>
      </div>

      <div class="card">
        <h3>Pesan Auto-Reply</h3>
        <form method="POST" action="/update-text">
          <textarea name="text">${text}</textarea>
          <button type="submit" class="btn" style="background: #007bff;">Simpan Teks Baru</button>
        </form>
      </div>
    </body>
    </html>
  `
  return c.html(html)
})

app.post('/update-status', async (c) => {
  const env = c.env
  const redis = Redis.fromEnv(env)
  const body = await c.req.parseBody()
  
  if (body.status === 'ON' || body.status === 'OFF') {
    await redis.set('bot_status', body.status)
  }
  return c.redirect('/')
})

app.post('/update-text', async (c) => {
  const env = c.env
  const redis = Redis.fromEnv(env)
  const body = await c.req.parseBody()
  
  if (body.text && typeof body.text === 'string') {
    await redis.set('auto_reply_text', body.text.trim())
  }
  return c.redirect('/')
})


app.post('/webhook/fonnte', async (c) => {
  const env = c.env
  const redis = Redis.fromEnv(env)
  
  // Ambil payload dari Fonnte (bisa berupa JSON atau form-data)
  let body: any = {}
  try {
    body = await c.req.json()
  } catch (e) {
    const formData = await c.req.formData().catch(() => null)
    if (formData) {
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
    }
  }

  if (!body || !body.sender) {
    return c.text('OK')
  }
  
  console.log("INCOMING_WEBHOOK_PAYLOAD:", JSON.stringify(body))

  const sender = body.sender
  const message = (body.message || body.text || '').trim()
  
  // --- 3.3 Smart Filtering - Abaikan Grup ---
  const isGroup = sender.includes('@g.us') || sender.includes('-')
  if (isGroup) {
    return c.text('Ignored Group Message')
  }

  // Fonnte webhook untuk pesan keluar (outgoing/dari kita sendiri)
  // biasanya memiliki `is_me` bernilai true, atau sender kita hardcode.
  const isFromMe = sender === env.MY_PHONE_NUMBER || body.is_me === true || body.is_me === "true"

  if (isFromMe) {
    // --- 3.1 Bot Activation Controls ---
    if (message.toLowerCase() === '/bot on') {
      await redis.set('bot_status', 'ON')
      await sendFonnteMessage(env.FONNTE_TOKEN, sender, 'Bot diaktifkan. Auto-reply menyala.')
      return c.text('Bot ON')
    }
    if (message.toLowerCase() === '/bot off') {
      await redis.set('bot_status', 'OFF')
      await sendFonnteMessage(env.FONNTE_TOKEN, sender, 'Bot dinonaktifkan. Auto-reply mati.')
      return c.text('Bot OFF')
    }

    // --- 3.2 Dynamic Text Management ---
    if (message.toLowerCase().startsWith('/ubah_teks ')) {
      const newText = message.substring(11).trim()
      await redis.set('auto_reply_text', newText)
      await sendFonnteMessage(env.FONNTE_TOKEN, sender, `Teks balasan berhasil diubah menjadi:\n\n"${newText}"`)
      return c.text('Text updated')
    }

    // --- 3.4 Manual Interception ---
    // Fonnte: Jika kita membalas target secara manual, webhook mungkin ter-trigger 
    // dengan is_me=true, dan target ada di variabel `target` atau `receiver` (atau `sender` jika fonnte menukar posisinya).
    // Asumsi Fonnte: webhook pesan keluar memiliki `target` atau `sender` sbg nomor tujuan.
    const targetToIntercept = body.target || body.receiver || sender
    await redis.del(`pending:${targetToIntercept}`)
    
    return c.text('Intercepted: Pending task cleared')
  }

  // --- Mulai proses pesan masuk dari orang lain ---

  // Cek status bot
  const botStatus = await redis.get('bot_status')
  if (botStatus !== 'ON') {
    return c.text('Bot is OFF')
  }

  // --- 3.5 Anti-Spam (Cooldown) ---
  const isCooldown = await redis.get(`cooldown:${sender}`)
  if (isCooldown) {
    return c.text('User in cooldown')
  }

  // --- 3.4 & 3.5 Queueing Phase & Debouncing ---
  // Set penanda di Redis dengan TTL 120 detik (cukup melampaui delay 60 detik)
  await redis.set(`pending:${sender}`, 'true', { ex: 120 })

  // Daftarkan task ke QStash untuk dieksekusi 60 detik kemudian
  try {
    const qstash = new Client({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL })
    await qstash.publishJSON({
      url: `${env.WORKER_URL}/webhook/execute-reply`,
      body: { target: sender },
      delay: 60, // Delay 60 detik
    })
  } catch (e: any) {
    console.error('QStash Error:', e?.message || e)
    // Hapus pending jika queueing gagal agar tidak stuck
    await redis.del(`pending:${sender}`)
    return c.text(`QStash Error: ${e?.message || 'Unknown error'}. Cek QSTASH_TOKEN di wrangler.jsonc`, 500)
  }

  return c.text('Queued for auto-reply')
})

// --- 5. Execution Phase (Dipanggil oleh QStash setelah 60 detik) ---
app.post('/webhook/execute-reply', async (c) => {
  const env = c.env
  const redis = Redis.fromEnv(env)
  
  const body = await c.req.json().catch(() => null)
  if (!body || !body.target) return c.text('Bad Request', 400)
  
  const target = body.target

  // Cek apakah target masih di-pending (berarti belum dibalas manual)
  const isPending = await redis.get(`pending:${target}`)
  if (!isPending) {
    return c.text('Task was intercepted or already processed')
  }

  // Cek status bot lagi (siapa tahu dimatikan user saat delay 60 detik berlangsung)
  const botStatus = await redis.get('bot_status')
  if (botStatus !== 'ON') {
    return c.text('Bot turned OFF during delay')
  }

  // Ambil teks balasan custom
  const replyText = await redis.get<string>('auto_reply_text') || 'Maaf, saat ini saya sedang tidak dapat membalas pesan. Saya akan membalasnya nanti.'

  // Kirim balasan via Fonnte API
  const success = await sendFonnteMessage(env.FONNTE_TOKEN, target, replyText)

  if (success) {
    // Hapus pending
    await redis.del(`pending:${target}`)
    // Set cooldown selama 2 jam (7200 detik) agar nomor ini tidak dispam
    await redis.set(`cooldown:${target}`, 'true', { ex: 7200 })
    return c.text('Auto-reply sent')
  }

  return c.text('Failed to send Fonnte message', 500)
})

// Helper function untuk memanggil Fonnte API
async function sendFonnteMessage(token: string, target: string, message: string): Promise<boolean> {
  try {
    const formData = new FormData()
    formData.append('target', target)
    formData.append('message', message)

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    })

    const result = await response.json() as any
    return result.status === true
  } catch (e) {
    console.error('Fonnte API Error:', e)
    return false
  }
}

export default app
