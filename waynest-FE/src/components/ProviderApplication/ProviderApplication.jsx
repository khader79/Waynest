import React from "react";
import "./provider-application.css";

export default function ProviderApplication() {
  return (
    <main className="provider-app" dir="rtl">
      <header className="provider-hero">
        <div className="hero-content">
          <h1 className="hero-title">تقديم طلب بروفايدِر</h1>
          <p className="hero-sub">
            انضم إلى شبكة Waynest وابدأ بعرض خدماتك بثقة واحترافية.
          </p>
          <div className="hero-cta">
            <button className="btn primary">ابدأ الآن</button>
            <button className="btn ghost">لمحة عن المتطلبات</button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden />
      </header>

      <section className="provider-shell">
        <aside className="provider-sidebar" aria-hidden>
          <div className="steps">
            <div className="step active">1. المعلومات الأساسية</div>
            <div className="step">2. تفاصيل العرض</div>
            <div className="step">3. المستندات</div>
            <div className="step">4. معاينة &amp; إرسال</div>
          </div>
        </aside>

        <form
          className="provider-form"
          aria-label="نموذج تقديم طلب البروفايدِر">
          <section className="card form-card">
            <div className="form-grid">
              <label>
                <span className="label">اسم العمل / الشخص</span>
                <input name="name" placeholder="مثلاً: مطبخ السلطان" />
              </label>

              <label>
                <span className="label">فئة الخدمة</span>
                <select name="category">
                  <option>مطاعم</option>
                  <option>خدمات منزلية</option>
                  <option>ترفيه</option>
                  <option>تعليم</option>
                </select>
              </label>

              <label>
                <span className="label">الهاتف</span>
                <input name="phone" placeholder="مثلاً: +963 9xx xxx xxx" />
              </label>

              <label>
                <span className="label">البريد الإلكتروني</span>
                <input
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                />
              </label>

              <label className="full-width">
                <span className="label">موقع الخدمة / المدينة</span>
                <input name="location" placeholder="المدينة أو العنوان" />
              </label>

              <label className="full-width">
                <span className="label">نبذة عن الخدمة</span>
                <textarea
                  name="description"
                  rows="5"
                  placeholder="اختر كلمات توضح تميز خدمتك"></textarea>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn ghost">
                حفظ كمسودة
              </button>
              <button type="submit" className="btn primary">
                متابعة
              </button>
            </div>
          </section>

          <section className="card upload-card">
            <h3>مستندات وملفات</h3>
            <p className="muted">جواز سفر / رخصة / صور سابقة (اختياري)</p>
            <div className="uploader">
              <input type="file" id="files" multiple />
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}
