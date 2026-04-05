# Waynest

## كيفية تشغيل البرنامج

هذا المشروع يتكون من جزئين:
- **Backend**: NestJS (في مجلد `waynest-be`)
- **Frontend**: React + Vite (في مجلد `waynest-FE`)

### المتطلبات الأساسية
- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn
- PostgreSQL (قاعدة البيانات)

### خطوات التشغيل

#### 1. إعداد قاعدة البيانات PostgreSQL
- تأكد من تثبيت PostgreSQL على جهازك
- أنشئ قاعدة بيانات جديدة باسم `waynest_db` (أو أي اسم تفضله)

#### 2. إعداد Backend

```bash
# الانتقال إلى مجلد Backend
cd waynest-be

# تثبيت المكتبات المطلوبة
npm install

# إنشاء ملف .env وإضافة المتغيرات التالية:
# PORT=3001
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_NAME=waynest_db
# JWT_SECRET=your_jwt_secret_key_here

# تشغيل Backend في وضع التطوير
npm run start:dev
```

الـ Backend سيعمل على: `http://localhost:3001` (أو القيمة في `PORT`)

#### 3. إعداد Frontend

افتح نافذة Terminal جديدة:

```bash
# الانتقال إلى مجلد Frontend
cd waynest-FE

# تثبيت المكتبات المطلوبة
npm install

# تشغيل Frontend
npm run dev
```

الـ Frontend سيعمل على: `http://localhost:5173`

### ملاحظات مهمة
- تأكد من تشغيل Backend قبل Frontend
- تأكد من أن قاعدة البيانات PostgreSQL تعمل
- قم بتعديل قيم المتغيرات في ملف `.env` حسب إعداداتك
- في الواجهة (`waynest-FE/.env`): استخدم `VITE_API_BASE_URL` أو `VITE_API_URL` ليشير إلى عنوان الـ API (الافتراضي في الكود: `http://localhost:3001`)
- **المشروع يستخدم `synchronize: true`** - لا حاجة لـ migrations، الجداول تُنشأ تلقائياً

### حل مشاكل شائعة

#### خطأ: "password authentication failed for user postgres"
هذا يعني أن كلمة المرور في ملف `.env` غير صحيحة. الحل:
1. افتح ملف `waynest-be/.env`
2. حدّث `DB_PASSWORD` بكلمة المرور الصحيحة لـ PostgreSQL
3. إذا نسيت كلمة المرور، يمكنك إعادة تعيينها من pgAdmin أو من سطر الأوامر

#### خطأ: "database does not exist"
1. افتح pgAdmin أو استخدم psql
2. أنشئ قاعدة بيانات جديدة: `CREATE DATABASE waynest;`
3. تأكد من أن `DB_NAME` في ملف `.env` يطابق اسم قاعدة البيانات

### أوامر مفيدة

**Backend:**
- `npm run start:dev` - تشغيل في وضع التطوير (مع إعادة التشغيل التلقائي)
- `npm run start` - تشغيل عادي
- `npm run build` - بناء المشروع للإنتاج

**Frontend:**
- `npm run dev` - تشغيل في وضع التطوير
- `npm run build` - بناء المشروع للإنتاج
- `npm run preview` - معاينة النسخة المبنية