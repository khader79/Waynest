import "./Bookings.css";

const Bookings = () => {
  return (
    <section className="bookings">
      <h1 className="bookings-title">Your Bookings</h1>
      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Paris</td>
              <td>Apr 12, 2026</td>
              <td>Confirmed</td>
            </tr>
            <tr>
              <td>Tokyo</td>
              <td>Jun 03, 2026</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>Rome</td>
              <td>Aug 18, 2026</td>
              <td>Completed</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Bookings;
