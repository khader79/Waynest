import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTwitter, FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { toast } from "react-toastify";
import { submitContactForm } from "@/api/contact";
import "./Contact.css";

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await submitContactForm(formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error(
        t("contact.errors.sendFailed", {
          defaultValue: "Failed to send message. Please try again later.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <h1>{t("contact.hero.title")}</h1>
        <p className="hero-subtitle">{t("contact.hero.subtitle")}</p>
      </section>

      <div className="contact-content">
        <div className="contact-info">
          <div className="info-section">
            <h2>{t("contact.contactInformation.title")}</h2>
            <div className="info-item">
              <h3>{t("contact.contactInformation.email")}</h3>
              <p>{t("contact.contactInformation.emailValue")}</p>
            </div>
            <div className="info-item">
              <h3>{t("contact.contactInformation.responseTime")}</h3>
              <p>{t("contact.contactInformation.responseTimeValue")}</p>
            </div>
            <div className="info-item">
              <h3>{t("contact.contactInformation.officeHours")}</h3>
              <p>{t("contact.contactInformation.officeHoursValue")}</p>
            </div>
          </div>

          <div className="info-section">
            <h2>{t("contact.followUs.title")}</h2>
            <div className="social-links">
              <a href="#" className="social-link">
                <FaTwitter className="social-icon" />
                <span>{t("contact.followUs.twitter")}</span>
              </a>
              <a href="#" className="social-link">
                <FaFacebook className="social-icon" />
                <span>{t("contact.followUs.facebook")}</span>
              </a>
              <a href="#" className="social-link">
                <FaInstagram className="social-icon" />
                <span>{t("contact.followUs.instagram")}</span>
              </a>
              <a href="#" className="social-link">
                <FaLinkedin className="social-icon" />
                <span>{t("contact.followUs.linkedin")}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="contact-form-container">
          <h2>{t("contact.form.title")}</h2>
          {submitted ? (
            <div className="success-message">
              <h3>{t("contact.success.title")}</h3>
              <p>{t("contact.success.message")}</p>
              <button
                className="btn-secondary"
                onClick={() => setSubmitted(false)}>
                {t("contact.success.sendAnother")}
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">
                  {t("contact.form.name")} {t("contact.form.required")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t("contact.form.namePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  {t("contact.form.email")} {t("contact.form.required")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={t("contact.form.emailPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">
                  {t("contact.form.subject")} {t("contact.form.required")}
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required>
                  <option value="">
                    {t("contact.form.subjectPlaceholder")}
                  </option>
                  <option value="general">
                    {t("contact.form.subjectOptions.general")}
                  </option>
                  <option value="support">
                    {t("contact.form.subjectOptions.support")}
                  </option>
                  <option value="feedback">
                    {t("contact.form.subjectOptions.feedback")}
                  </option>
                  <option value="partnership">
                    {t("contact.form.subjectOptions.partnership")}
                  </option>
                  <option value="other">
                    {t("contact.form.subjectOptions.other")}
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">
                  {t("contact.form.message")} {t("contact.form.required")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder={t("contact.form.messagePlaceholder")}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? t("contact.form.sending")
                  : t("contact.form.sendButton")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
