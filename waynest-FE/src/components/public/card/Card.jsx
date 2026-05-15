import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaStar, FaMapMarkerAlt } from "react-icons/fa";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
import "./Card.css";

const PlaceCard = ({
  imageUrl,
  name,
  category,
  rating,
  reviewsCount,
  location,
  description,
}) => {
  const { t } = useTranslation();
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const resolvedImageUrl = getResolvedPlaceImageUrl(imageUrl);
  const showImage =
    Boolean(resolvedImageUrl) && failedImageUrl !== resolvedImageUrl;

  return (
    <div className="place-card">
      <div className="card-image-wrapper">
        {showImage ? (
          <img
            src={resolvedImageUrl}
            alt={name}
            className="card-image"
            onError={() => setFailedImageUrl(resolvedImageUrl)}
          />
        ) : (
          <div className="card-image card-image-fallback" aria-label={name}>
            {name}
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-name">{name}</h3>
          <span className="card-category">{category}</span>
        </div>

        <div className="card-rating">
          <FaStar className="star-icon" />
          <span className="rating-value">{rating.toFixed(1)}</span>
          <span className="reviews-count">({reviewsCount})</span>
        </div>

        <div className="card-location">
          <FaMapMarkerAlt className="location-icon" />
          <span>{location}</span>
        </div>

        <p className="card-description">{description}</p>

        <div className="card-footer">
          <button className="view-details-btn">{t("common.viewDetails")}</button>
          <div className="price-icon">$</div>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
