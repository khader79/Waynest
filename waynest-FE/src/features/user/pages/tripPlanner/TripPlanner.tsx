import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ADMIN_ENDPOINTS, TRIP_PLANNER_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";
import type { CreateTripPlannerDto, TripPlanResponse } from "../../../../types/tripPlanner";
import "./TripPlanner.css";

interface City {
  id: string;
  name: string;
  stateName?: string;
}

interface Tag {
  id: string;
  name: string;
}

const TripPlanner = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTripPlannerDto>({
    cityId: "",
    days: 3,
    budget: 1000,
    persons: 2,
    interests: [],
  });
  const [cities, setCities] = useState<City[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCities();
    fetchTags();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.CITIES_LIST(1));
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load cities");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await get(ADMIN_ENDPOINTS.TAGS_LIST);
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load interests");
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, cityId: e.target.value });
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value) || 1;
    setFormData({ ...formData, days: Math.max(1, days) });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const budget = parseFloat(e.target.value) || 0;
    setFormData({ ...formData, budget: Math.max(0, budget) });
  };

  const handlePersonsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const persons = parseInt(e.target.value) || 1;
    setFormData({ ...formData, persons: Math.max(1, persons) });
  };

  const handleInterestChange = (tagName: string) => {
    const currentInterests = formData.interests || [];
    const newInterests = currentInterests.includes(tagName)
      ? currentInterests.filter((i) => i !== tagName)
      : [...currentInterests, tagName];
    setFormData({ ...formData, interests: newInterests });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.cityId) {
      toast.error("Please select a city");
      return;
    }

    if (formData.days < 1) {
      toast.error("Days must be at least 1");
      return;
    }

    if (formData.budget < 0) {
      toast.error("Budget must be positive");
      return;
    }

    if (formData.persons < 1) {
      toast.error("Number of persons must be at least 1");
      return;
    }

    try {
      setGenerating(true);
      const response = await postJson(
        TRIP_PLANNER_ENDPOINTS.GENERATE,
        formData
      ) as TripPlanResponse;
      setTripPlan(response);
      toast.success("Trip plan generated successfully!");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to generate trip plan"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="trip-planner-page">
      <h1 className="trip-planner-title">AI Trip Planner</h1>

      <div className="trip-planner-container">
        <div className="trip-planner-form-section">
          <form className="trip-planner-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="city">Select City</label>
              <select
                id="city"
                value={formData.cityId}
                onChange={handleCityChange}
                required
                disabled={generating || loading}
              >
                <option value="">Choose a city...</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} {city.stateName ? `(${city.stateName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="days">Number of Days</label>
              <input
                id="days"
                type="number"
                min="1"
                value={formData.days}
                onChange={handleDaysChange}
                required
                disabled={generating}
              />
            </div>

            <div className="input-group">
              <label htmlFor="budget">Total Budget (ILS)</label>
              <input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={handleBudgetChange}
                required
                disabled={generating}
              />
            </div>

            <div className="input-group">
              <label htmlFor="persons">Number of Persons</label>
              <input
                id="persons"
                type="number"
                min="1"
                value={formData.persons}
                onChange={handlePersonsChange}
                required
                disabled={generating}
              />
            </div>

            <div className="input-group">
              <label>Interests (Optional)</label>
              <div className="interests-checkboxes">
                {tags.map((tag) => (
                  <label key={tag.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.interests?.includes(tag.name) || false}
                      onChange={() => handleInterestChange(tag.name)}
                      disabled={generating}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="generate-button"
              disabled={generating || loading}
            >
              {generating ? "Generating..." : "Generate Trip Plan"}
            </button>
          </form>
        </div>

        <div className="trip-planner-results">
          {tripPlan ? (
            <div className="trip-plan-results">
              <div className="trip-summary-card">
                <h2>Trip Summary</h2>
                <div className="summary-info">
                  <div className="summary-item">
                    <span className="summary-label">Total Estimated Cost:</span>
                    <span className="summary-value">
                      {tripPlan.totalEstimatedCost.toFixed(2)} ILS
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Days:</span>
                    <span className="summary-value">{tripPlan.days.length}</span>
                  </div>
                </div>
                {tripPlan.tips && tripPlan.tips.length > 0 && (
                  <div className="tips-section">
                    <h3>Tips</h3>
                    <ul className="tips-list">
                      {tripPlan.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="trip-days">
                {tripPlan.days.map((day) => (
                  <div key={day.day} className="trip-day-card">
                    <h3 className="day-title">Day {day.day}</h3>
                    <div className="day-cost">
                      Total Day Cost: {day.totalDayCost.toFixed(2)} ILS
                    </div>

                    <div className="trip-slots">
                      {day.morning && (
                        <div className="trip-slot morning">
                          <div className="slot-header">
                            <span className="slot-time">Morning</span>
                            <span className="slot-duration">
                              {day.morning.duration}
                            </span>
                          </div>
                          <div className="slot-content">
                            <h4 className="slot-name">{day.morning.name}</h4>
                            {day.morning.type && (
                              <span className="slot-type">{day.morning.type}</span>
                            )}
                            <div className="slot-info">
                              <span className="slot-cost">
                                {day.morning.estimatedCost.toFixed(2)} ILS
                              </span>
                              {day.morning.openTime && day.morning.closeTime && (
                                <span className="slot-hours">
                                  {day.morning.openTime} - {day.morning.closeTime}
                                </span>
                              )}
                            </div>
                            {day.morning.placeId && (
                              <div className="slot-actions">
                                <button
                                  className="action-button wishlist-button"
                                  onClick={() => {
                                    toast.info("Add to wishlist feature coming soon");
                                  }}
                                >
                                  Add to Wishlist
                                </button>
                                <button
                                  className="action-button view-button"
                                  onClick={() => {
                                    toast.info("View place feature coming soon");
                                  }}
                                >
                                  View Place
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {day.afternoon && (
                        <div className="trip-slot afternoon">
                          <div className="slot-header">
                            <span className="slot-time">Afternoon</span>
                            <span className="slot-duration">
                              {day.afternoon.duration}
                            </span>
                          </div>
                          <div className="slot-content">
                            <h4 className="slot-name">{day.afternoon.name}</h4>
                            {day.afternoon.type && (
                              <span className="slot-type">{day.afternoon.type}</span>
                            )}
                            <div className="slot-info">
                              <span className="slot-cost">
                                {day.afternoon.estimatedCost.toFixed(2)} ILS
                              </span>
                              {day.afternoon.openTime && day.afternoon.closeTime && (
                                <span className="slot-hours">
                                  {day.afternoon.openTime} - {day.afternoon.closeTime}
                                </span>
                              )}
                            </div>
                            {day.afternoon.placeId && (
                              <div className="slot-actions">
                                <button
                                  className="action-button wishlist-button"
                                  onClick={() => {
                                    toast.info("Add to wishlist feature coming soon");
                                  }}
                                >
                                  Add to Wishlist
                                </button>
                                <button
                                  className="action-button view-button"
                                  onClick={() => {
                                    toast.info("View place feature coming soon");
                                  }}
                                >
                                  View Place
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {day.evening && (
                        <div className="trip-slot evening">
                          <div className="slot-header">
                            <span className="slot-time">Evening</span>
                            <span className="slot-duration">
                              {day.evening.duration}
                            </span>
                          </div>
                          <div className="slot-content">
                            <h4 className="slot-name">{day.evening.name}</h4>
                            {day.evening.type && (
                              <span className="slot-type">{day.evening.type}</span>
                            )}
                            <div className="slot-info">
                              <span className="slot-cost">
                                {day.evening.estimatedCost.toFixed(2)} ILS
                              </span>
                              {day.evening.openTime && day.evening.closeTime && (
                                <span className="slot-hours">
                                  {day.evening.openTime} - {day.evening.closeTime}
                                </span>
                              )}
                            </div>
                            {day.evening.placeId && (
                              <div className="slot-actions">
                                <button
                                  className="action-button wishlist-button"
                                  onClick={() => {
                                    toast.info("Add to wishlist feature coming soon");
                                  }}
                                >
                                  Add to Wishlist
                                </button>
                                <button
                                  className="action-button view-button"
                                  onClick={() => {
                                    toast.info("View place feature coming soon");
                                  }}
                                >
                                  View Place
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Fill out the form and generate your AI-powered trip plan!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
