import { useTranslation } from "react-i18next";
import "./About.css";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>{t("about.hero.title")}</h1>
        <p className="hero-subtitle">
          {t("about.hero.subtitle")}
        </p>
      </section>

      <section className="about-content">
        <div className="content-section">
          <h2>{t("about.mission.title")}</h2>
          <p>
            {t("about.mission.description")}
          </p>
        </div>

        <div className="content-section">
          <h2>{t("about.whatWeOffer.title")}</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>{t("about.whatWeOffer.discoverPlaces.title")}</h3>
              <p>
                {t("about.whatWeOffer.discoverPlaces.description")}
              </p>
            </div>
            <div className="feature-item">
              <h3>{t("about.whatWeOffer.expertReviews.title")}</h3>
              <p>
                {t("about.whatWeOffer.expertReviews.description")}
              </p>
            </div>
            <div className="feature-item">
              <h3>{t("about.whatWeOffer.planYourTrip.title")}</h3>
              <p>
                {t("about.whatWeOffer.planYourTrip.description")}
              </p>
            </div>
            <div className="feature-item">
              <h3>{t("about.whatWeOffer.communityDriven.title")}</h3>
              <p>
                {t("about.whatWeOffer.communityDriven.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h2>{t("about.whyChoose.title")}</h2>
          <ul className="benefits-list">
            <li>
              <strong>{t("about.whyChoose.comprehensiveDatabase")}</strong> {t("about.whyChoose.comprehensiveDatabaseDesc")}
            </li>
            <li>
              <strong>{t("about.whyChoose.realExperiences")}</strong> {t("about.whyChoose.realExperiencesDesc")}
            </li>
            <li>
              <strong>{t("about.whyChoose.easyPlanning")}</strong> {t("about.whyChoose.easyPlanningDesc")}
            </li>
            <li>
              <strong>{t("about.whyChoose.alwaysUpdated")}</strong> {t("about.whyChoose.alwaysUpdatedDesc")}
            </li>
          </ul>
        </div>

        <div className="content-section">
          <h2>{t("about.ourStory.title")}</h2>
          <p>
            {t("about.ourStory.paragraph1")}
          </p>
          <p>
            {t("about.ourStory.paragraph2")}
          </p>
        </div>

        <div className="content-section">
          <h2>{t("about.joinCommunity.title")}</h2>
          <p>
            {t("about.joinCommunity.description")}
          </p>
          <div className="cta-buttons">
            <a href="/register" className="btn-primary">
              {t("about.joinCommunity.getStarted")}
            </a>
            <a href="/plan" className="btn-secondary">
              {t("about.joinCommunity.exploreDestinations")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
