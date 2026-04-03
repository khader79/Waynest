import { Link } from "react-router-dom";
import "@/pages/provider/provider-business.css";

const placeHref = (place) => {
  const key = place?.slug || place?.id;
  return key ? `/places/${encodeURIComponent(key)}` : "#";
};

/**
 * @param {{ place: { id?: string, name?: string, slug?: string | null, city?: { name?: string } | null } }} props
 */
const ProviderServiceCard = ({ place }) => {
  const name = place?.name ?? "Place";
  const city = place?.city?.name;

  return (
    <Link className="provider-service-card" to={placeHref(place)}>
      <h3 className="provider-service-card__name">{name}</h3>
      {city ? <p className="provider-service-card__meta">{city}</p> : null}
    </Link>
  );
};

export default ProviderServiceCard;
