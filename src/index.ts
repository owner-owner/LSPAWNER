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
  if (err.message.includes('abnormally large') || err.message.includes('Chunk size') || err.message.includes('Read error')) {
    console.log('[Spawner-Bot] 🛡️ تم التقاط وتجاهل خطأ حزمة عابر لتفادي الخروج.');
  } else {
    console.error('[UncaughtException]', err);
  }
});

// 2. إعدادات البوت
const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atqwerty',
  version: '1.20.4',
};

const RECONNECT_DELAY_MS = 5000;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnerInterval: ReturnType<typeof setInterval> | null = null;
let antiAfkInterval: ReturnType<typeof setInterval> | null = null;

// تتبع حالة القوائم (0 = القائمة الأولى Chest عادي، 1 = القائمة الثانية Double Chest)
let currentWindowStep = 0;

function scheduleReconnect(reason: string) {
  console.log(`[Spawner-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ بسبب: ${reason}`);
  if (reconnectTimeout) return;
  if (spawnerInterval) clearInterval(spawnerInterval);
  if (antiAfkInterval) clearInterval(antiAfkInterval);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  console.log('[Spawner-Bot] ⏳ جاري بدء الاتصال بالسيرفر zero7even.net...');
  currentWindowStep = 0;

  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: true,
    checkTimeoutInterval: 60 * 1000
  });

  bot.on('login', () => {
    console.log('[Spawner-Bot] ✅ تم الاتصال بالهوست وقبول الحساب!');
  });

  // دالة البحث والتفاعل مع السبونر (Right Click)
  async function interactWithSpawner() {
    const spawnerBlock = bot.findBlock({
      matching: (block) => block.name.includes('spawner'),
      maxDistance: 5
    });

    if (spawnerBlock) {
      try {
        console.log('[Spawner-Bot] 🎯 العثور على السبونر! جاري الضغط كليك يمين...');
        currentWindowStep = 0; // إعادة الترتيب للبداية عند فتح السبونر
        await bot.activateBlock(spawnerBlock);
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ أثناء الضغط على السبونر:', err);
      }
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر في نطاق 5 بلوكات!');
    }
  }

  // التعامل مع فتح القوائم والتنقل فيها
  bot.on('windowOpen', (window) => {
    setTimeout(async () => {
      try {
        if (currentWindowStep === 0) {
          console.log('[Spawner-Bot] 🔘 الواجهة الأولى (Chest): الضغط على الخانة 11');
          await bot.clickWindow(11, 0, 0);
          currentWindowStep = 1; // الانتقال للخطوة التالية للواجهة القادمة
        } else if (currentWindowStep === 1) {
          console.log('[Spawner-Bot] 🔘 الواجهة الثانية (Double Chest): الضغط على الخانة 52');
          await bot.clickWindow(52, 0, 0);
          currentWindowStep = 0; // إعادة ضبط الخطوات بعد الانتهاء
        }
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ في الضغط داخل الواجهة:', err);
      }
    }, 1200);
  });

  // 🔑 إدارة الدخول والتسجيل التلقائي
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    const lowerText = text.toLowerCase();

    if (lowerText.includes('/register') || lowerText.includes('register')) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر التسجيل /register...');
      bot.chat('/register AZERTY65 AZERTY65');
    } else if (lowerText.includes('/login') || lowerText.includes('login') || lowerText.includes('تسجيل الدخول')) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر تسجيل الدخول /login...');
      bot.chat('/login AZERTY65');
    }
  });

  // 🌐 بدء التفاعل مع السبونر فور رسبونة البوت
  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت ريسبون (Spawn) وظهر داخل العالم!');

    if (spawnerInterval) clearInterval(spawnerInterval);
    if (antiAfkInterval) clearInterval(antiAfkInterval);

    // 1. حركة قفز خفيفة كل 30 ثانية لتفادي طرد الـ AFK
    antiAfkInterval = setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    // 2. البحث عن السبونر والضغط عليه بعد 5 ثوانٍ من الدخول
    setTimeout(() => {
      bot.setControlState('sneak', true);
      interactWithSpawner();

      // تكرار العملية تلقائياً كل 5 دقائق
      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 300000);

    }, 5000);
  });

  bot.on('kicked', (reason) => {
    let readableReason = reason;
    try {
      readableReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    } catch (e) {}
    scheduleReconnect(`Kicked: ${readableReason}`);
  });

  bot.on('end', (reason) => scheduleReconnect(`Disconnected: ${reason}`));

  bot.on('error', (err) => {
    console.log('[Spawner-Bot] ⚠️ تنبيه خطأ:', err.message);
    if (!err.message.includes('abnormally large') && !err.message.includes('Chunk size')) {
      scheduleReconnect(`Error: ${err.message}`);
    }
  });
}

startBot();
  
