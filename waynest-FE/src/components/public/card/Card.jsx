import { FaStar, FaMapMarkerAlt } from "react-icons/fa"; // تأكد من تثبيت react-icons
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
  return (
    <div className="place-card">
      <div className="card-image-wrapper">
        <img src={imageUrl} alt={name} className="card-image" />
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
          <button className="view-details-btn">View Details</button>
          <div className="price-icon">$</div>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
