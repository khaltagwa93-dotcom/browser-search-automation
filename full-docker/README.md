# نظام أتمتة البحث الكامل (Playwright + Docker)

نسخة **كاملة** تستخدم متصفح Chromium حقيقي.
تدعم الآن: **Google · Bing · DuckDuckGo · Amazon · YouTube**
+ **إشعارات المتصفح** عند ظهور نتائج جديدة.

---

## طريقة التشغيل (بسيطة جداً)

### الطريقة 1: Docker (موصى بها)

1. تأكد أن Docker Desktop مثبت عندك (من الموقع الرسمي).
2. افتح Terminal أو PowerShell.
3. انسخ والصق الأوامر التالية واحدة تلو الأخرى:

```bash
git clone https://github.com/khaltagwa93-dotcom/browser-search-automation.git
cd browser-search-automation/full-docker
docker compose up --build
```

4. انتظر حتى ترى رسالة مثل `Uvicorn running on http://0.0.0.0:8000`
5. افتح المتصفح على: **http://localhost:8000**

### الطريقة 2: بدون Docker (Python)

```bash
git clone https://github.com/khaltagwa93-dotcom/browser-search-automation.git
cd browser-search-automation/full-docker
pip install -r requirements.txt
playwright install chromium
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

ثم افتح: **http://localhost:8000**

---

## المميزات الجديدة

- بحث حقيقي على **Amazon** و **YouTube** بالإضافة للمحركات العادية
- **إشعارات المتصفح** عندما تظهر نتائج جديدة (فعّل المربع في الواجهة)
- سجل دائم للبحوث السابقة
- واجهة عربية متجاوبة مع الجوال

---

## ملاحظات مهمة

- أول تشغيل بـ Docker يأخذ وقتاً (تحميل صورة Playwright).
- على Windows استخدم Docker Desktop.
- إذا ظهر خطأ في المنفذ 8000، غيّر في `docker-compose.yml` إلى `"8001:8000"` ثم افتح `http://localhost:8001`.
