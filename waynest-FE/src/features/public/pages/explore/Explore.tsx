import { useState } from "react";
import "./Explore.css";

const categories = [
  "All",
  "Restaurant",
  "Café",
  "Attraction",
  "Museum",
  "Park",
  "Historical",
];

const Explore = () => {
  const [active, setActive] = useState("All");

  return (
    <div className="explore-page">
      <div className="hero-section">
        <h1>Explore Places</h1>
        <p>Discover amazing destinations around the world</p>
        <div className="search-box">
          <input type="text" placeholder="Search places..." />
        </div>
      </div>

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={active === cat ? "active" : ""}
            onClick={() => setActive(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid"></div>
    </div>
  );
};

export default Explore;
