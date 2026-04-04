import { useTranslation } from "react-i18next";
import "@/pages/provider/provider-business.css";

/**
 * @param {{ blocks: { place: { name?: string }, reviews: unknown[] }[], emptyLabel?: string }} props
 */
const ProviderReviewList = ({ blocks, emptyLabel }) => {
  const { t } = useTranslation();

  if (!blocks?.length) {
    return (
      <div className="provider-profile-empty" role="status">
        <p className="provider-profile-empty__text">
          {emptyLabel ??
            t("provider.business.noReviews", { defaultValue: "No reviews yet." })}
        </p>
      </div>
    );
  }

  return (
    <div className="provider-review-list-root">
      {blocks.map(({ place, reviews }) => {
        const placeName = place?.name ?? "Place";
        const list = Array.isArray(reviews) ? reviews : [];

        return (
          <section
            key={place?.id ?? placeName}
            className="provider-review-block"
          >
            <h3 className="provider-review-block__place">{placeName}</h3>
            {list.length === 0 ? (
              <p className="provider-review-item">
                {t("provider.business.noReviewsForPlace", {
                  defaultValue: "No reviews for this place.",
                })}
              </p>
            ) : (
              list.map((rev, idx) => {
                const r = rev && typeof rev === "object" ? rev : {};
                const rating = r.rating ?? r.score;
                const text = r.comment ?? r.body ?? r.text ?? "";
                const id = r.id ?? `rev-${idx}`;
                return (
                  <div key={id} className="provider-review-item">
                    {rating != null ? (
                      <span className="provider-review-item__rating">
                        {String(rating)}
                        {t("provider.business.ratingSuffix", {
                          defaultValue: "/5",
                        })}
                      </span>
                    ) : null}
                    <span>{String(text)}</span>
                  </div>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ProviderReviewList;
