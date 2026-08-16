import mineflayer from 'mineflayer';
import express from 'express';

// 1. إعداد سيرفر Express لإبقاء Render شغالاً
const PORT = parseInt(process.env.PORT || '10000', 10);
const app = express();
app.get('/', (_req, res) => res.status(200).send('Spawner Bot Active'));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

// منع انهيار العملية عند حدوث أخطاء قراءة الحزم
process.on('uncaughtException', (err: Error) => {
  if (
    err.message.includes('abnormally large') ||
    err.message.includes('Chunk size') ||
    err.message.includes('Read error')
  ) {
    console.log('[Spawner-Bot] 🛡️ تم التقاط وتجاهل خطأ حزمة عابر لتفادي الخروج.');
  } else {
    console.error('[UncaughtException]', err);
  }
});

// 2. إعدادات البوت
const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp',
  version: '1.20.4',
};

const RECONNECT_DELAY_MS = 5000;

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(reason: string) {
  console.log(`[Spawner-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ بسبب: ${reason}`);

  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  console.log('[Spawner-Bot] ⏳ جاري بدء الاتصال بالسيرفر zero7even.net...');

  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: true,
    checkTimeoutInterval: 60 * 1000
  });

  bot.on('login', () => {
    console.log('[Spawner-Bot] ✅ تم الاتصال بالهوست وقبول الحساب!');
  });

  // 🔑 إدارة الدخول والتسجيل التلقائي الذكي
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('/register') ||
      lowerText.includes('register')
    ) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر التسجيل /register...');
      bot.chat('/register AZERTY65 AZERTY65');
    } else if (
      lowerText.includes('/login') ||
      lowerText.includes('login') ||
      lowerText.includes('تسجيل الدخول')
    ) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر تسجيل الدخول /login...');
      bot.chat('/login AZERTY65');
    }
  });

  // 🌐 الانتقال إلى سيرفر smp فور رسبونة البوت داخل اللوبي
  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت ريسبون (Spawn) وظهر داخل العالم!');

    setTimeout(() => {
      console.log('[Spawner-Bot] 🌐 إرسال أمر /server smp للتحويل إلى السيرفر...');
      bot.chat('/server smp');
    }, 2500);
  });

  bot.on('kicked', (reason) => {
    let readableReason = reason;

    try {
      readableReason =
        typeof reason === 'object'
          ? JSON.stringify(reason)
          : reason;
    } catch (e) {}

    scheduleReconnect(`Kicked: ${readableReason}`);
  });

  bot.on('end', (reason) => {
    scheduleReconnect(`Disconnected: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log('[Spawner-Bot] ⚠️ تنبيه خطأ:', err.message);

    if (
      !err.message.includes('abnormally large') &&
      !err.message.includes('Chunk size')
    ) {
      scheduleReconnect(`Error: ${err.message}`);
    }
  });
}

startBot();
