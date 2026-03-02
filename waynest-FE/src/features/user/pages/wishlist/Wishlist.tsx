import "./Wishlist.css";

const Wishlist = () => {
  return (
    <section className="wishlist">
      <h1 className="wishlist-title">Your Wishlist</h1>
      <div className="wishlist-cards">
        <div className="wishlist-card">
          <div>
            <div className="wishlist-destination">Santorini</div>
            <div className="wishlist-note">Island escape</div>
          </div>
          <button className="wishlist-remove" type="button">
            Remove
          </button>
        </div>
        <div className="wishlist-card">
          <div>
            <div className="wishlist-destination">New York</div>
            <div className="wishlist-note">City break</div>
          </div>
          <button className="wishlist-remove" type="button">
            Remove
          </button>
        </div>
        <div className="wishlist-card">
          <div>
            <div className="wishlist-destination">Cape Town</div>
            <div className="wishlist-note">Adventure trip</div>
          </div>
          <button className="wishlist-remove" type="button">
            Remove
          </button>
        </div>
      </div>
    </section>
  );
};

export default Wishlist;
