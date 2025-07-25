"use client";
import React from "react";
import "./Home.css";
import Link from "next/link";

const HomePage = () => {
  return (
    <div className="homeContainer">
      <section className="hero">
        <h1>ابدأ رحلتك بسهولة وراحة مع واي نست</h1>
        <p>خطط سفرك، احجز، واستمتع بكل التفاصيل في مكان واحد.</p>
        <Link href="/trips">
          <button className="heroBtn">استعرض الرحلات</button>
        </Link>
      </section>

      <section className="features">
        <div className="feature">
          <h3>حجوزات سهلة</h3>
          <p>احجز رحلتك والفندق بكل سلاسة خلال ثوانٍ.</p>
        </div>
        <div className="feature">
          <h3>دليل سياحي ذكي</h3>
          <p>نرشح لك الأماكن والمطاعم الأنسب حسب ميزانيتك ووقتك.</p>
        </div>
        <div className="feature">
          <h3>دعم محلي</h3>
          <p>خدمات شاملة داخل فلسطين: سكن طلاب، نقل داخلي، سياحة.</p>
        </div>
      </section>

      <section className="cta">
        <h2>جاهز لتبدأ؟</h2>
        <Link href="/register">
          <button className="ctaBtn">أنشئ حسابك الآن</button>
        </Link>
      </section>
    </div>
  );
};

export default HomePage;
