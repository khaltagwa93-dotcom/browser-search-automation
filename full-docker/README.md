# نظام أتمتة البحث الكامل (Playwright + Docker)

نسخة **كاملة** تستخدم متصفح Chromium حقيقي عبر Playwright.
تعمل محلياً بدون أي قيود زمنية أو حظر IPs مثل Vercel.

## المتطلبات
- Docker + Docker Compose
- (أو Python 3.10+ محلياً)

## التشغيل بـ Docker (الأسهل)

```bash
cd full-docker
docker compose up --build
```

ثم افتح في المتصفح:
**http://localhost:8000**

## التشغيل بدون Docker

```bash
pip install -r requirements.txt
playwright install chromium
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## المميزات
- بحث حقيقي على Google / Bing / DuckDuckGo
- واجهة عربية كاملة + متجاوبة مع الجوال
- حفظ السجل في `data/history.json`
- تصدير النتائج
- لا يحتاج أي مفتاح API

## ملاحظات
- أول تشغيل قد يأخذ وقتاً لتحميل صورة Playwright.
- على Linux قد تحتاج `--no-sandbox` (موجود بالفعل).
- للتشغيل على سيرفر VPS: افتح المنفذ 8000 أو ضع Nginx أمامه.

## الفرق عن نسخة Vercel
|                | Vercel (خفيفة)     | هذه النسخة (كاملة)      |
|----------------|--------------------|-------------------------|
| المحرك         | Instant Answer     | Playwright حقيقي        |
| Google/Bing    | محدود              | كامل                    |
| الوقت          | 10 ثوانٍ           | بدون حد                 |
| الحظر          | يحدث أحياناً       | نادر                    |
