import { useTranslation } from "react-i18next";
import "@/pages/provider/provider-business.css";

/**
 * @param {{ blocks: { place: { name?: string }, reviews: unknown[] }[], emptyLabel?: string }} props
 */
const ProviderReviewList = ({ blocks, emptyLabel }) => {
  const { t } = useTranslation();

  const withReviews = (Array.isArray(blocks) ? blocks : [])
    .map((block) => {
      const list = Array.isArray(block?.reviews) ? block.reviews : [];
      return { place: block?.place, reviews: list };
    })
    .filter((b) => b.reviews.length > 0);

  if (withReviews.length === 0) {
    return (
      <div className="provider-profile-empty" role="status">
        <p className="provider-profile-empty__text">
          {emptyLabel ??
            t("provider.business.noReviews", { defaultValue: "No guest reviews yet." })}
        </p>
      </div>
    );
  }

  return (
    <div className="provider-review-list-root">
      {withReviews.map(({ place, reviews }) => {
        const placeName = place?.name ?? "Place";
        const list = reviews;

        return (
          <section
            key={place?.id ?? placeName}
            className="provider-review-block"
          >
            {withReviews.length > 1 ? (
              <h3 className="provider-review-block__place">{placeName}</h3>
            ) : null}
            {list.map((rev, idx) => {
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
            })}
          </section>
        );
      })}
    </div>
  );
};

export default ProviderReviewList;
