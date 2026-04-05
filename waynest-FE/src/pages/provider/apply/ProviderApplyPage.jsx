import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Steps,
  Spin,
  Empty,
  Space,
  Tooltip,
  message,
  Checkbox,
} from "antd";
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  fetchMyProviderApplication,
  submitProviderApplication,
} from "@/api/providerApplications";
import { fetchAllCountries, fetchCitiesByCountry } from "@/api/catalog";
import { getApiErrorMessage } from "@/utils/errors";
import "../../providerPanel.css";
import "./ProviderApplyPage.css";

const STEP0_FIELDS = ["displayName", "description", "country", "city"];
const STEP1_FIELDS = ["providerType", "phone", "website"];
const STEP2_FIELDS = ["termsAccepted"];

const PROVIDER_TYPES = [
  { value: "HOTEL", label: "provider.profile.providerTypes.HOTEL" },
  {
    value: "RESTAURANT",
    label: "provider.profile.providerTypes.RESTAURANT",
  },
  {
    value: "TOUR_PROVIDER",
    label: "provider.profile.providerTypes.TOUR_PROVIDER",
  },
  {
    value: "EVENT_ORGANIZER",
    label: "provider.profile.providerTypes.EVENT_ORGANIZER",
  },
  {
    value: "ACTIVITY_PROVIDER",
    label: "provider.profile.providerTypes.ACTIVITY_PROVIDER",
  },
];

const ProviderApplyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // States
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [formData, setFormData] = useState({});

  const extractItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  };

  // Fetch countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      setCountriesLoading(true);
      setCountriesError(null);
      try {
        const response = await fetchAllCountries();
        setCountries(extractItems(response));
      } catch (error) {
        setCountriesError(
          t("provider.apply.countriesLoadError", {
            defaultValue: "Failed to load countries. Please refresh the page.",
          }),
        );
        console.error("Error loading countries:", error);
      } finally {
        setCountriesLoading(false);
      }
    };

    loadCountries();
  }, [t]);

  useEffect(() => {
    const loadCities = async () => {
      if (!selectedCountryId) {
        setCities([]);
        return;
      }

      setCitiesLoading(true);
      setCitiesError(null);
      try {
        const response = await fetchCitiesByCountry(selectedCountryId);
        setCities(extractItems(response));
      } catch (error) {
        setCitiesError(
          t("provider.apply.citiesLoadError", {
            defaultValue: "Failed to load cities. Please refresh the page.",
          }),
        );
        console.error("Error loading cities:", error);
      } finally {
        setCitiesLoading(false);
      }
    };

    loadCities();
  }, [selectedCountryId, t]);

  // Check for pending applications
  useEffect(() => {
    let active = true;
    const checkApplication = async () => {
      try {
        const row = await fetchMyProviderApplication();
        if (!active) return;

        if (row?.status === "PENDING") {
          toast.info(
            t("provider.apply.pendingInfo", {
              defaultValue: "Your application is pending review.",
            }),
          );
          navigate("/", { replace: true });
          return;
        }
      } catch {
        // No application yet - allow user to apply
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    checkApplication();
    return () => {
      active = false;
    };
  }, [navigate, t]);

  // Track form changes
  const handleFormChange = useCallback(() => {
    const values = form.getFieldsValue(true);
    setFormData(values);
  }, [form]);

  const handleCountryChange = useCallback(
    (countryId) => {
      setSelectedCountryId(countryId || null);
      setCities([]);
      setCitiesError(null);
      form.setFieldsValue({ city: undefined });
    },
    [form],
  );

  const goNext = async () => {
    const fields = step === 0 ? STEP0_FIELDS : step === 1 ? STEP1_FIELDS : [];

    try {
      await form.validateFields(fields);
      setStep((s) => Math.min(s + 1, 2));
    } catch {
      // Validation errors shown by Ant Design
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onFinish = async () => {
    try {
      await form.validateFields(STEP2_FIELDS);

      const values = form.getFieldsValue(true);
      const payload = {
        displayName: values.displayName?.trim(),
        city: values.city?.trim(),
        providerType: values.providerType,
        phone: values.phone?.trim(),
        website: values.website?.trim() || undefined,
        description: values.description?.trim() || undefined,
      };

      setLoading(true);
      await submitProviderApplication(payload);
      setSubmitted(true);

      toast.success(
        t("provider.apply.submitSuccess", {
          defaultValue: "Application submitted successfully!",
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("provider.apply.submitError", {
            defaultValue: "Could not submit application.",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="provider-apply-loader">
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          size="large"
        />
        <p className="loader-text">
          {t("common.loading", { defaultValue: "Loading..." })}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="provider-apply-success-wrapper">
        <div className="provider-apply-success-container">
          <div className="success-icon-wrapper">
            <CheckCircleOutlined className="success-icon" />
          </div>

          <h1 className="success-title">
            {t("provider.apply.successTitle", {
              defaultValue: "Application Submitted Successfully!",
            })}
          </h1>

          <p className="success-description">
            {t("provider.apply.successBody", {
              defaultValue:
                "Thank you for your application. Our team will review your details and get back to you soon.",
            })}
          </p>

          <div className="success-timeline">
            <div className="timeline-item">
              <div className="timeline-number">1</div>
              <div className="timeline-text">
                {t("provider.apply.timeline.received", {
                  defaultValue: "Application Received",
                })}
              </div>
            </div>
            <div className="timeline-dot" />
            <div className="timeline-item">
              <div className="timeline-number">2</div>
              <div className="timeline-text">
                {t("provider.apply.timeline.review", {
                  defaultValue: "Under Review",
                })}
              </div>
            </div>
            <div className="timeline-dot" />
            <div className="timeline-item">
              <div className="timeline-number">3</div>
              <div className="timeline-text">
                {t("provider.apply.timeline.approved", {
                  defaultValue: "Approval & Activation",
                })}
              </div>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            onClick={() => navigate("/", { replace: true })}
            className="success-button">
            {t("provider.apply.goHome", { defaultValue: "Back to Home" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="provider-apply-page">
      <div className="provider-apply-header">
        <div className="header-content">
          <h1 className="header-title">
            {t("provider.apply.title", { defaultValue: "Become a Provider" })}
          </h1>
          <p className="header-subtitle">
            {t("provider.apply.subtitle", {
              defaultValue:
                "Submit your business details. After admin approval you will get access to business tools.",
            })}
          </p>
        </div>
      </div>

      <div className="provider-apply-container">
        <div className="apply-card-wrapper">
          <Card className="provider-apply-card">
            <Steps
              current={step}
              className="apply-steps"
              items={[
                {
                  title: t("provider.apply.steps.business", {
                    defaultValue: "Business Info",
                  }),
                  status: step > 0 ? "finish" : undefined,
                },
                {
                  title: t("provider.apply.steps.contact", {
                    defaultValue: "Contact Details",
                  }),
                  status: step > 1 ? "finish" : undefined,
                },
                {
                  title: t("provider.apply.steps.review", {
                    defaultValue: "Review & Submit",
                  }),
                },
              ]}
            />

            <div className="apply-form-wrapper">
              <Form
                form={form}
                layout="vertical"
                preserve
                onValuesChange={handleFormChange}
                autoComplete="off">
                {/* STEP 0: Business Info */}
                {step === 0 && (
                  <div className="step-content fade-in">
                    <div className="step-header">
                      <h2 className="step-title">
                        {t("provider.apply.stepBusinessTitle", {
                          defaultValue: "Tell us about your business",
                        })}
                      </h2>
                      <p className="step-description">
                        {t("provider.apply.businessDescription", {
                          defaultValue:
                            "Provide basic information about your business",
                        })}
                      </p>
                    </div>

                    <Form.Item
                      name="displayName"
                      label={t("provider.profile.fields.displayName", {
                        defaultValue: "Business Name",
                      })}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "provider.profile.validation.displayName",
                            {
                              defaultValue: "Please enter your business name",
                            },
                          ),
                        },
                        {
                          min: 3,
                          message: t("validation.minLength3", {
                            defaultValue:
                              "Business name must be at least 3 characters",
                          }),
                        },
                        {
                          max: 150,
                          message: t("validation.maxLength150", {
                            defaultValue:
                              "Business name must not exceed 150 characters",
                          }),
                        },
                      ]}>
                      <Input
                        placeholder={t(
                          "provider.apply.businessNamePlaceholder",
                          {
                            defaultValue: "e.g., Luxury Hotels Group",
                          },
                        )}
                        size="large"
                        className="apply-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label={t("provider.apply.description", {
                        defaultValue: "Business Description",
                      })}
                      rules={[
                        {
                          max: 500,
                          message: t("validation.maxLength500", {
                            defaultValue:
                              "Description must not exceed 500 characters",
                          }),
                        },
                      ]}>
                      <Input.TextArea
                        rows={4}
                        placeholder={t(
                          "provider.apply.descriptionPlaceholder",
                          {
                            defaultValue:
                              "Tell us about your business, services, and what makes you special...",
                          },
                        )}
                        className="apply-textarea"
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>

                    <Form.Item
                      name="country"
                      label={t("provider.apply.country", {
                        defaultValue: "Country",
                      })}
                      rules={[
                        {
                          required: true,
                          message: t("provider.apply.countryRequired", {
                            defaultValue: "Please select your country",
                          }),
                        },
                      ]}>
                      <Select
                        placeholder={t("provider.apply.countryPlaceholder", {
                          defaultValue: "Select your country...",
                        })}
                        loading={countriesLoading}
                        size="large"
                        disabled={countriesLoading}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children ?? "")
                            .toString()
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        onChange={handleCountryChange}
                        className="apply-select">
                        {Array.isArray(countries) && countries.length > 0
                          ? countries.map((country) => (
                              <Select.Option
                                key={country.id || country.name}
                                value={country.id}>
                                {country.name}
                              </Select.Option>
                            ))
                          : null}
                      </Select>
                    </Form.Item>

                    {countriesError && (
                      <div className="error-alert">
                        <InfoCircleOutlined /> {countriesError}
                      </div>
                    )}

                    <Form.Item
                      name="city"
                      label={t("provider.apply.city", {
                        defaultValue: "City / Location",
                      })}
                      rules={[
                        {
                          required: true,
                          message: t("provider.apply.cityRequired", {
                            defaultValue: "Please select your city",
                          }),
                        },
                      ]}>
                      <Select
                        placeholder={t("provider.apply.cityPlaceholder", {
                          defaultValue: selectedCountryId
                            ? "Select your city..."
                            : "Select a country first...",
                        })}
                        loading={citiesLoading}
                        size="large"
                        disabled={citiesLoading || !selectedCountryId}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children ?? "")
                            .toString()
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        className="apply-select">
                        {Array.isArray(cities) && cities.length > 0
                          ? cities.map((city) => (
                              <Select.Option
                                key={city.id || city.name}
                                value={city.name}>
                                {city.name} ({city.country?.name || "N/A"})
                              </Select.Option>
                            ))
                          : null}
                      </Select>
                    </Form.Item>

                    {citiesError && (
                      <div className="error-alert">
                        <InfoCircleOutlined /> {citiesError}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 1: Contact Details */}
                {step === 1 && (
                  <div className="step-content fade-in">
                    <div className="step-header">
                      <h2 className="step-title">
                        {t("provider.apply.stepContactTitle", {
                          defaultValue: "Contact & Service Details",
                        })}
                      </h2>
                      <p className="step-description">
                        {t("provider.apply.contactDescription", {
                          defaultValue:
                            "Provide your contact information and service type",
                        })}
                      </p>
                    </div>

                    <Form.Item
                      name="providerType"
                      label={t("provider.profile.fields.providerType", {
                        defaultValue: "Service Type",
                      })}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "provider.profile.validation.providerType",
                            {
                              defaultValue: "Please select a service type",
                            },
                          ),
                        },
                      ]}>
                      <Select
                        placeholder={t("provider.apply.typePlaceholder", {
                          defaultValue: "Select your service type...",
                        })}
                        size="large"
                        className="apply-select">
                        {PROVIDER_TYPES.map((type) => (
                          <Select.Option key={type.value} value={type.value}>
                            {t(type.label, { defaultValue: type.value })}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="phone"
                      label={t("provider.profile.fields.phone", {
                        defaultValue: "Primary Phone",
                      })}
                      rules={[
                        {
                          required: true,
                          message: t("provider.profile.validation.phone", {
                            defaultValue: "Please enter your phone number",
                          }),
                        },
                        {
                          pattern: /^[\d\s\-\+\(\)]{7,}$/,
                          message: t("validation.phoneInvalid", {
                            defaultValue: "Please enter a valid phone number",
                          }),
                        },
                      ]}>
                      <Input
                        placeholder={t("provider.apply.phonePlaceholder", {
                          defaultValue: "+1 (555) 123-4567",
                        })}
                        size="large"
                        className="apply-input"
                        type="tel"
                      />
                    </Form.Item>

                    <Form.Item
                      name="website"
                      label={t("provider.profile.fields.website", {
                        defaultValue: "Website (Optional)",
                      })}
                      rules={[
                        {
                          pattern:
                            /^(https?:\/\/)?([\da-z\.\-]+)\.([a-z\.]{2,6})([\/\w \.\-]*)*\/?$/,
                          message: t("validation.urlInvalid", {
                            defaultValue: "Please enter a valid website URL",
                          }),
                        },
                      ]}>
                      <Input
                        placeholder={t("provider.apply.websitePlaceholder", {
                          defaultValue: "https://example.com",
                        })}
                        size="large"
                        className="apply-input"
                        prefix="🌐"
                      />
                    </Form.Item>
                  </div>
                )}

                {/* STEP 2: Review & Submit */}
                {step === 2 && (
                  <div className="step-content fade-in">
                    <div className="step-header">
                      <h2 className="step-title">
                        {t("provider.apply.stepReviewTitle", {
                          defaultValue: "Review Your Information",
                        })}
                      </h2>
                      <p className="step-description">
                        {t("provider.apply.reviewDescription", {
                          defaultValue:
                            "Please verify all details are correct before submitting",
                        })}
                      </p>
                    </div>

                    <div className="review-section">
                      <div className="review-item">
                        <span className="review-label">
                          {t("provider.profile.fields.displayName", {
                            defaultValue: "Business Name",
                          })}
                        </span>
                        <span className="review-value">
                          {formData.displayName || "—"}
                        </span>
                      </div>

                      <div className="review-item">
                        <span className="review-label">
                          {t("provider.apply.city", {
                            defaultValue: "City",
                          })}
                        </span>
                        <span className="review-value">
                          {formData.city || "—"}
                        </span>
                      </div>

                      <div className="review-item">
                        <span className="review-label">
                          {t("provider.profile.fields.providerType", {
                            defaultValue: "Service Type",
                          })}
                        </span>
                        <span className="review-value">
                          {formData.providerType
                            ? t(
                                `provider.profile.providerTypes.${formData.providerType}`,
                                { defaultValue: formData.providerType },
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="review-item">
                        <span className="review-label">
                          {t("provider.profile.fields.phone", {
                            defaultValue: "Phone",
                          })}
                        </span>
                        <span className="review-value">
                          {formData.phone || "—"}
                        </span>
                      </div>

                      {formData.website && (
                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.profile.fields.website", {
                              defaultValue: "Website",
                            })}
                          </span>
                          <span className="review-value">
                            <a
                              href={formData.website}
                              target="_blank"
                              rel="noopener noreferrer">
                              {formData.website}
                            </a>
                          </span>
                        </div>
                      )}

                      {formData.description && (
                        <div className="review-item full-width">
                          <span className="review-label">
                            {t("provider.apply.description", {
                              defaultValue: "Description",
                            })}
                          </span>
                          <span className="review-value description">
                            {formData.description}
                          </span>
                        </div>
                      )}
                    </div>

                    <Form.Item
                      name="termsAccepted"
                      valuePropName="checked"
                      rules={[
                        {
                          required: true,
                          message: t("provider.apply.termsRequired", {
                            defaultValue:
                              "Please accept the terms and conditions",
                          }),
                        },
                      ]}>
                      <Checkbox className="terms-checkbox">
                        {t("provider.apply.termsText", {
                          defaultValue:
                            "I confirm that all the information provided is accurate and I agree to the terms of service",
                        })}
                      </Checkbox>
                    </Form.Item>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="form-actions">
                  {step > 0 && (
                    <Button
                      size="large"
                      onClick={goBack}
                      className="action-button back-button">
                      {t("provider.apply.back", { defaultValue: "Back" })}
                    </Button>
                  )}

                  {step < 2 ? (
                    <Button
                      type="primary"
                      size="large"
                      onClick={goNext}
                      className="action-button next-button">
                      {t("provider.apply.next", { defaultValue: "Next" })}
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      onClick={onFinish}
                      loading={loading}
                      className="action-button submit-button">
                      {loading ? (
                        <>
                          <LoadingOutlined /> Submitting...
                        </>
                      ) : (
                        t("provider.apply.submit", {
                          defaultValue: "Submit Application",
                        })
                      )}
                    </Button>
                  )}
                </div>
              </Form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderApplyPage;
