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
let dropperInterval: ReturnType<typeof setInterval> | null = null;

function scheduleReconnect(reason: string) {
  console.log(`[Spawner-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ بسبب: ${reason}`);
  if (reconnectTimeout) return;
  if (spawnerInterval) clearInterval(spawnerInterval);
  if (antiAfkInterval) clearInterval(antiAfkInterval);
  if (dropperInterval) clearInterval(dropperInterval);

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

  // دالة البحث والضغط على أيتم الـ Dropper
  async function clickDropperItem(window: any) {
    const dropperItem = window.slots.find((item: any) => {
      if (!item) return false;
      const nameMatch = item.name && item.name.includes('dropper');
      const customName = item.customName || item.displayName || '';
      const textMatch = customName.toLowerCase().includes('drop');
      return nameMatch || textMatch;
    });

    if (dropperItem) {
      try {
        console.log(`[Spawner-Bot] 🔘 الضغط الدوري على ايتم الـ Dropper (الخانة ${dropperItem.slot})...`);
        await bot.clickWindow(dropperItem.slot, 0, 0);
      } catch (err) {
        console.log('[Spawner-Bot] ⚠️ فشل الضغط على ايتم الـ Dropper.');
      }
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على ايتم Dropper في الواجهة!');
    }
  }

  // دالة البحث والتفاعل المباشر مع السبونر (Right Click)
  async function interactWithSpawner() {
    const spawnerBlock = bot.findBlock({
      matching: (block) => block.name.includes('spawner'),
      maxDistance: 5
    });

    if (spawnerBlock) {
      try {
        console.log('[Spawner-Bot] 🎯 العثور على السبونر! جاري التثبيت والضغط كليك يمين...');
        if (dropperInterval) clearInterval(dropperInterval);

        // إلغاء التخفي والحركة تماماً قبل التفاعل
        bot.setControlState('sneak', false);
        bot.clearControlStates();

        // النظر المباشر نحو السبونر والانتظار نصف ثانية لتقبل السيرفر الحركة
        await bot.lookAt(spawnerBlock.position.offset(0.5, 0.5, 0.5));
        await new Promise((resolve) => setTimeout(resolve, 500));

        await bot.activateBlock(spawnerBlock);
        console.log('[Spawner-Bot] ✅ تم إرسال أمر الضغط على السبونر بنجاح!');
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ أثناء الضغط على السبونر:', err);
      }
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر في نطاق 5 بلوكات!');
    }
  }

  // التعامل مع فتح القوائم والبحث عن الأيتم الذكي
  bot.on('windowOpen', async (window) => {
    console.log(`[Spawner-Bot] 📂 تم فتح واجهة جديدة ثابتة (حجمها: ${window.slots.length} خانة)...`);

    setTimeout(async () => {
      // 1. البحث عن ايتم الـ Chest (Spawner Storage)
      const storageItem = window.slots.find((item: any) => {
        if (!item) return false;
        const nameMatch = item.name && item.name.includes('chest');
        const customName = item.customName || item.displayName || '';
        const textMatch = customName.toLowerCase().includes('storage');
        return nameMatch || textMatch;
      });

      // 2. البحث عن ايتم الـ Dropper (Drop All Items)
      const dropperItem = window.slots.find((item: any) => {
        if (!item) return false;
        const nameMatch = item.name && item.name.includes('dropper');
        const customName = item.customName || item.displayName || '';
        const textMatch = customName.toLowerCase().includes('drop');
        return nameMatch || textMatch;
      });

      if (storageItem) {
        console.log(`[Spawner-Bot] 📦 تم إيجاد ايتم Spawner Storage (Chest) في الخانة ${storageItem.slot}! جاري الضغط...`);
        try {
          await bot.clickWindow(storageItem.slot, 0, 0);
        } catch (e) {
          console.log('[Spawner-Bot] ❌ خطأ أثناء الضغط على Chest:', e);
        }
      } else if (dropperItem) {
        console.log(`[Spawner-Bot] 💧 تم إيجاد ايتم Drop All Items (Dropper) في الخانة ${dropperItem.slot}!`);
        await clickDropperItem(window);

        if (dropperInterval) clearInterval(dropperInterval);
        dropperInterval = setInterval(() => {
          clickDropperItem(window);
        }, 15000);
      } else {
        console.log('[Spawner-Bot] ⚠️ لم يتم التعرف على الأيتم المطلوبة داخل الواجهة!');
      }
    }, 1200);
  });

  bot.on('windowClose', () => {
    console.log('[Spawner-Bot] 🔒 تم إغلاق القائمة.');
    if (dropperInterval) {
      clearInterval(dropperInterval);
      dropperInterval = null;
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

  // 🌐 بدء التفاعل بعد 10 ثوانٍ من رسبونة البوت
  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت ريسبون (Spawn) وظهر داخل العالم!');

    if (spawnerInterval) clearInterval(spawnerInterval);
    if (antiAfkInterval) clearInterval(antiAfkInterval);
    if (dropperInterval) clearInterval(dropperInterval);

    antiAfkInterval = setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    console.log('[Spawner-Bot] ⏳ الانتظار 10 ثوانٍ قبل التفاعل مع السبونر...');
    setTimeout(() => {
      interactWithSpawner();

      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 180000);

    }, 10000);
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
