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
let slot52Interval: ReturnType<typeof setInterval> | null = null;

let currentWindowStep = 0;

function scheduleReconnect(reason: string) {
  console.log(`[Spawner-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ بسبب: ${reason}`);
  if (reconnectTimeout) return;
  if (spawnerInterval) clearInterval(spawnerInterval);
  if (antiAfkInterval) clearInterval(antiAfkInterval);
  if (slot52Interval) clearInterval(slot52Interval);

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

  // دالة الضغط على الخانة 52
  async function clickSlot52() {
    try {
      console.log('[Spawner-Bot] 🔘 الضغط الدوري على الخانة 52...');
      await bot.clickWindow(52, 0, 0);
    } catch (err) {
      try {
        await bot.simpleClick.left(52);
      } catch (retryErr) {
        console.log('[Spawner-Bot] ⚠️ فشل الضغط على الخانة 52.');
      }
    }
  }

  // دالة البحث والتفاعل المباشر مع السبونر (Right Click)
  async function interactWithSpawner() {
    const spawnerBlock = bot.findBlock({
      matching: (block) => block.name.includes('spawner'),
      maxDistance: 4
    });

    if (spawnerBlock) {
      try {
        console.log('[Spawner-Bot] 🎯 العثور على السبونر! جاري النظر والضغط كليك يمين...');
        currentWindowStep = 0;
        if (slot52Interval) clearInterval(slot52Interval);

        // 1. النظر نحو السبونر أولاً لضمان القبول من السيرفر
        await bot.lookAt(spawnerBlock.position.offset(0.5, 0.5, 0.5));
        
        // 2. الضغط كليك يمين
        await bot.activateBlock(spawnerBlock);
        console.log('[Spawner-Bot] ✅ تم إرسال أمر الضغط على السبونر بنجاح!');
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ أثناء الضغط على السبونر:', err);
      }
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر قادم في نطاق 4 بلوكات!');
    }
  }

  // التعامل مع فتح القوائم
  bot.on('windowOpen', async (window) => {
    console.log(`[Spawner-Bot] 📂 تم فتح واجهة بنجاح (حجمها: ${window.slots.length} خانة)!`);

    setTimeout(async () => {
      if (currentWindowStep === 0) {
        // الواجهة الأولى: ضغط الخانة 11
        console.log('[Spawner-Bot] 🔘 الواجهة الأولى: الضغط على الخانة 11...');
        try {
          await bot.clickWindow(11, 0, 0);
        } catch (e) {
          await bot.simpleClick.left(11);
        }
        currentWindowStep = 1;
      } else if (currentWindowStep === 1) {
        // الواجهة الثانية: ضغط الخانة 52 وتكرارها كل 15 ثانية
        console.log('[Spawner-Bot] 🔘 الواجهة الثانية: بدء تكرار الضغط على الخانة 52 كل 15 ثانية...');
        await clickSlot52();

        if (slot52Interval) clearInterval(slot52Interval);
        slot52Interval = setInterval(() => {
          clickSlot52();
        }, 15000);
      }
    }, 1200);
  });

  bot.on('windowClose', () => {
    console.log('[Spawner-Bot] 🔒 تم إغلاق القائمة.');
    if (slot52Interval) {
      clearInterval(slot52Interval);
      slot52Interval = null;
    }
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

  // 🌐 بدء التفاعل فور رسبونة البوت
  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت ريسبون (Spawn) وظهر داخل العالم!');

    if (spawnerInterval) clearInterval(spawnerInterval);
    if (antiAfkInterval) clearInterval(antiAfkInterval);
    if (slot52Interval) clearInterval(slot52Interval);

    // قفز خفيف كل 30 ثانية لتفادي الـ AFK
    antiAfkInterval = setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    // محاولة التفاعل الأولى بعد 4 ثوانٍ من الدخول
    setTimeout(() => {
      bot.setControlState('sneak', true);
      interactWithSpawner();

      // تكرار محاولة فتح السبونر كل 3 دقائق
      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 180000);

    }, 4000);
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
