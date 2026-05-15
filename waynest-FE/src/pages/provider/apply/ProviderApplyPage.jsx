import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Steps,
  Spin,
  Checkbox,
  Upload,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ROUTES } from "@/api/routes";
import { postFormData } from "@/api/request";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyProviderApplication,
  submitProviderApplication,
} from "@/api/providerApplications";
import { fetchAllCountries, fetchCitiesByCountry } from "@/api/catalog";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./ProviderApplyPage.css";

const STEP0_FIELDS = [
  "displayName",
  "description",
  "categories",
  "country",
  "city",
  "taxNumber",
  "registrationNumber",
];
const STEP1_FIELDS = [
  "phone",
  "secondaryPhone",
  "website",
  "logoUrl",
  "coverPhotoUrl",
];
const STEP2_FIELDS = ["termsAccepted"];

const APPLY_HIGHLIGHTS = [
  {
    titleKey: "provider.apply.highlights.businessBasics.title",
    textKey: "provider.apply.highlights.businessBasics.text",
  },
  {
    titleKey: "provider.apply.highlights.deviceImages.title",
    textKey: "provider.apply.highlights.deviceImages.text",
  },
  {
    titleKey: "provider.apply.highlights.ownerFirst.title",
    textKey: "provider.apply.highlights.ownerFirst.text",
  },
];

const ProviderApplyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [form] = Form.useForm();

  const canApply = true; // Temporary allow for UI testing

  // States
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false); // Changed to false by default
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pendingApplication, setPendingApplication] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [formData, setFormData] = useState({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const selectedCountry = useMemo(
    () => countries.find((country) => (country.id === selectedCountryId || country.name === selectedCountryId)) ?? null,
    [countries, selectedCountryId],
  );

  const selectedCity = useMemo(
    () => cities.find((city) => (city.id === formData.city || city.name === formData.city)) ?? null,
    [cities, formData.city],
  );

  const extractItems = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    if (payload?.items && Array.isArray(payload.items)) return payload.items;
    return [];
  }, []);

  // Fetch countries on mount
  useEffect(() => {
    if (countries.length > 0) return;

    const loadCountries = async () => {
      setCountriesLoading(true);
      setCountriesError(null);
      try {
        const response = await fetchAllCountries();
        const items = extractItems(response);
        if (items.length > 0) {
          setCountries(items);
        }
      } catch (error) {
        console.error("Countries load error:", error);
        setCountriesError(
          t("provider.apply.countriesLoadError", {
            defaultValue: "Failed to load countries. Please refresh the page.",
          }),
        );
      } finally {
        setCountriesLoading(false);
      }
    };

    loadCountries();
  }, [t, countries.length, extractItems]);

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
        const items = extractItems(response);
        setCities(items);
      } catch (error) {
        console.error("Cities load error:", error);
        setCitiesError(
          t("provider.apply.citiesLoadError", {
            defaultValue: "Failed to load cities. Please refresh the page.",
          }),
        );
      } finally {
        setCitiesLoading(false);
      }
    };

    loadCities();
  }, [selectedCountryId, t]);

  // Check for pending applications
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!canApply) {
      setChecking(false);
      return;
    }

    let active = true;
    const checkApplication = async () => {
      try {
        const row = await fetchMyProviderApplication();
        if (!active) return;

        // Disabled auto-redirect to pending screen to prevent disappearing form
        /*
        if (row?.status === "PENDING") {
          setPendingApplication(row);
          return;
        }
        */
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
  }, [authLoading, canApply, navigate, t]);

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

  const uploadProviderImage = useCallback(async (file) => {
    const formDataPayload = new FormData();
    formDataPayload.append("file", file);
    const response = await postFormData(ROUTES.upload.image, formDataPayload);
    return response?.url || response?.path || "";
  }, []);

  const handleLogoUpload = useCallback(
    async (file) => {
      setLogoUploading(true);
      try {
        const url = await uploadProviderImage(file);
        if (!url) {
          throw new Error("Upload failed");
        }
        form.setFieldsValue({ logoUrl: url });
        setFormData((current) => ({ ...current, logoUrl: url }));
        toast.success(
          t("provider.apply.logoUploaded", {
            defaultValue: "Logo uploaded successfully",
          }),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            t("provider.apply.logoUploadError", {
              defaultValue: "Logo upload failed",
            }),
          ),
        );
      } finally {
        setLogoUploading(false);
      }
      return false;
    },
    [form, t, uploadProviderImage],
  );

  const handleCoverUpload = useCallback(
    async (file) => {
      setCoverUploading(true);
      try {
        const url = await uploadProviderImage(file);
        if (!url) {
          throw new Error("Upload failed");
        }
        form.setFieldsValue({ coverPhotoUrl: url });
        setFormData((current) => ({ ...current, coverPhotoUrl: url }));
        toast.success(
          t("provider.apply.coverUploaded", {
            defaultValue: "Cover image uploaded successfully",
          }),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            t("provider.apply.coverUploadError", {
              defaultValue: "Cover image upload failed",
            }),
          ),
        );
      } finally {
        setCoverUploading(false);
      }
      return false;
    },
    [form, t, uploadProviderImage],
  );

  const clearLogoImage = useCallback(() => {
    form.setFieldsValue({ logoUrl: undefined });
    setFormData((current) => ({ ...current, logoUrl: undefined }));
  }, [form]);

  const clearCoverImage = useCallback(() => {
    form.setFieldsValue({ coverPhotoUrl: undefined });
    setFormData((current) => ({ ...current, coverPhotoUrl: undefined }));
  }, [form]);

  const goNext = async () => {
    const fields = step === 0 ? STEP0_FIELDS : step === 1 ? STEP1_FIELDS : [];

    try {
      if (logoUploading || coverUploading) {
        toast.info(
          t("provider.apply.uploadInProgress", {
            defaultValue: "Please wait for the image upload to finish.",
          }),
        );
        return;
      }
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
      if (logoUploading || coverUploading) {
        toast.info(
          t("provider.apply.uploadInProgress", {
            defaultValue: "Please wait for the image upload to finish.",
          }),
        );
        return;
      }
      if (!canApply) {
        toast.error(
          t("provider.apply.accessBody", {
            defaultValue:
              "Please switch to a traveler account to submit a provider application.",
          }),
        );
        return;
      }
      await form.validateFields(STEP2_FIELDS);

      const values = form.getFieldsValue(true);
      const payload = {
        displayName: values.displayName?.trim(),
        city: selectedCity?.name?.trim(),
        phone: values.phone?.trim(),
        secondaryPhone: values.secondaryPhone?.trim() || undefined,
        website: values.website?.trim() || undefined,
        description: values.description?.trim() || undefined,
        taxNumber: values.taxNumber?.trim() || undefined,
        registrationNumber: values.registrationNumber?.trim() || undefined,
        categories: Array.isArray(values.categories)
          ? values.categories.map((item) => String(item).trim()).filter(Boolean)
          : undefined,
        logoUrl: values.logoUrl?.trim() || undefined,
        coverPhotoUrl: values.coverPhotoUrl?.trim() || undefined,
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

  if (checking && !pendingApplication) {
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

  // Render main content regardless of role for debugging
  const showContent = true;

  if (!isAuthenticated && !checking) {
    return <div className="provider-apply-access">Please Login</div>;
  }

  // Disabled redirect to success/pending screen while debugging empty form
  const isPending = false;

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
      <div className="provider-apply-container">
        <header className="provider-apply-header-v2">
          <div className="header-v2-content">
            <span className="header-v2-eyebrow">{t("provider.apply.accessLabel", { defaultValue: "Provider Program" })}</span>
            <h1 className="header-v2-title">
              {t("provider.apply.title", { defaultValue: "Become a Waynest Provider" })}
            </h1>
            <p className="header-v2-subtitle">
              {t("provider.apply.subtitle", {
                defaultValue: "Join our network of elite travel providers and reach thousands of travelers worldwide.",
              })}
            </p>
          </div>
        </header>

        <section className="sidebar-info-card">
          <div className="highlights-v2">
            {APPLY_HIGHLIGHTS.map((item) => (
              <div key={item.titleKey} className="highlight-v2-item">
                <div className="highlight-v2-icon"><CheckCircleOutlined /></div>
                <div className="highlight-v2-content">
                  <h4>{t(item.titleKey)}</h4>
                  <p>{t(item.textKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <main className="provider-apply-content">
          <div className="apply-main-card">
            <Steps
              current={step}
              size="default"
              className="apply-steps-v2"
              items={[
                { title: t("provider.apply.steps.business", { defaultValue: "Business Details" }) },
                { title: t("provider.apply.steps.contact", { defaultValue: "Contact Info" }) },
                { title: t("provider.apply.steps.review", { defaultValue: "Final Review" }) },
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
                    <div className="step-content">
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
                        name="categories"
                        label={t("provider.apply.categories", {
                          defaultValue: "Categories",
                        })}
                        extra={t("provider.apply.categoriesHint", {
                          defaultValue:
                            "Add a few short labels that describe your business.",
                        })}>
                        <Select
                          mode="tags"
                          placeholder={t(
                            "provider.apply.categoriesPlaceholder",
                            {
                              defaultValue: "e.g. luxury, family, tours",
                            },
                          )}
                          size="large"
                          className="apply-select"
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
                                  value={city.id}>
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

                      <Form.Item
                        name="taxNumber"
                        label={t("provider.apply.taxNumber", {
                          defaultValue: "Tax Number (Optional)",
                        })}>
                        <Input
                          placeholder={t(
                            "provider.apply.taxNumberPlaceholder",
                            {
                              defaultValue: "Tax / VAT number",
                            },
                          )}
                          size="large"
                          className="apply-input"
                        />
                      </Form.Item>

                      <Form.Item
                        name="registrationNumber"
                        label={t("provider.apply.registrationNumber", {
                          defaultValue: "Registration Number (Optional)",
                        })}>
                        <Input
                          placeholder={t(
                            "provider.apply.registrationNumberPlaceholder",
                            {
                              defaultValue: "Business registration number",
                            },
                          )}
                          size="large"
                          className="apply-input"
                        />
                      </Form.Item>
                    </div>
                  )}

                  {/* STEP 1: Contact Details */}
                  {step === 1 && (
                    <div className="step-content">
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
                            pattern: /^[\d\s\-+()]{7,}$/,
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
                        name="secondaryPhone"
                        label={t("provider.apply.secondaryPhone", {
                          defaultValue: "Secondary Phone (Optional)",
                        })}
                        rules={[
                          {
                            pattern: /^[\d\s\-+()]{5,}$/,
                            message: t("validation.phoneInvalid", {
                              defaultValue: "Please enter a valid phone number",
                            }),
                          },
                        ]}>
                        <Input
                          placeholder={t(
                            "provider.apply.secondaryPhonePlaceholder",
                            {
                              defaultValue: "+1 (555) 987-6543",
                            },
                          )}
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
                              /^(https?:\/\/)?([\da-z.-]+)\.([ a-z.]{2,6})(\/[\w .-]*)*\/?$/,
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

                      <Form.Item name="logoUrl" hidden>
                        <Input />
                      </Form.Item>

                      <div className="provider-apply-upload-field">
                        <div className="provider-apply-upload-field__header">
                          <span className="provider-apply-upload-field__label">
                            {t("provider.apply.logoUrl", {
                              defaultValue: "Logo image (Optional)",
                            })}
                          </span>
                          <span className="provider-apply-upload-field__hint">
                            {t("provider.apply.uploadHint", {
                              defaultValue: "PNG, JPG, WEBP up to 5 MB",
                            })}
                          </span>
                        </div>
                        <Upload
                          accept="image/*"
                          beforeUpload={handleLogoUpload}
                          showUploadList={false}>
                          <Button
                            icon={<UploadOutlined />}
                            size="large"
                            className="provider-apply-upload-button"
                            loading={logoUploading}>
                            {t("provider.apply.uploadFromDevice", {
                              defaultValue: "Upload from device",
                            })}
                          </Button>
                        </Upload>
                        {formData.logoUrl ? (
                          <div className="provider-apply-upload-preview logo">
                            <img
                              src={resolveMediaUrl(formData.logoUrl)}
                              alt={t("provider.apply.logoPreviewAlt", {
                                defaultValue: "Uploaded logo preview",
                              })}
                            />
                            <div className="provider-apply-upload-preview__body">
                              <p className="provider-apply-upload-preview__title">
                                {t("provider.apply.logoUploaded", {
                                  defaultValue: "Logo uploaded",
                                })}
                              </p>
                              <p className="provider-apply-upload-preview__text">
                                {formData.logoUrl}
                              </p>
                              <Button
                                type="link"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={clearLogoImage}
                                className="provider-apply-upload-remove">
                                {t("common.remove", { defaultValue: "Remove" })}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="provider-apply-upload-placeholder">
                            {t("provider.apply.logoPlaceholder", {
                              defaultValue: "Choose a logo from your device.",
                            })}
                          </div>
                        )}
                      </div>

                      <Form.Item name="coverPhotoUrl" hidden>
                        <Input />
                      </Form.Item>

                      <div className="provider-apply-upload-field">
                        <div className="provider-apply-upload-field__header">
                          <span className="provider-apply-upload-field__label">
                            {t("provider.apply.coverPhotoUrl", {
                              defaultValue: "Cover photo (Optional)",
                            })}
                          </span>
                          <span className="provider-apply-upload-field__hint">
                            {t("provider.apply.uploadHint", {
                              defaultValue: "PNG, JPG, WEBP up to 5 MB",
                            })}
                          </span>
                        </div>
                        <Upload
                          accept="image/*"
                          beforeUpload={handleCoverUpload}
                          showUploadList={false}>
                          <Button
                            icon={<UploadOutlined />}
                            size="large"
                            className="provider-apply-upload-button"
                            loading={coverUploading}>
                            {t("provider.apply.uploadFromDevice", {
                              defaultValue: "Upload from device",
                            })}
                          </Button>
                        </Upload>
                        {formData.coverPhotoUrl ? (
                          <div className="provider-apply-upload-preview cover">
                            <img
                              src={resolveMediaUrl(formData.coverPhotoUrl)}
                              alt={t("provider.apply.coverPreviewAlt", {
                                defaultValue: "Uploaded cover preview",
                              })}
                            />
                            <div className="provider-apply-upload-preview__body">
                              <p className="provider-apply-upload-preview__title">
                                {t("provider.apply.coverUploaded", {
                                  defaultValue: "Cover uploaded",
                                })}
                              </p>
                              <p className="provider-apply-upload-preview__text">
                                {formData.coverPhotoUrl}
                              </p>
                              <Button
                                type="link"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={clearCoverImage}
                                className="provider-apply-upload-remove">
                                {t("common.remove", { defaultValue: "Remove" })}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="provider-apply-upload-placeholder cover">
                            {t("provider.apply.coverPlaceholder", {
                              defaultValue:
                                "Choose a cover image from your device.",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Review & Submit */}
                  {step === 2 && (
                    <div className="step-content">
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

                        <div className="review-item full-width">
                          <span className="review-label">
                            {t("provider.apply.categories", {
                              defaultValue: "Categories",
                            })}
                          </span>
                          <span className="review-value description">
                            {Array.isArray(formData.categories) &&
                            formData.categories.length > 0
                              ? formData.categories.join(", ")
                              : "—"}
                          </span>
                        </div>

                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.apply.country", {
                              defaultValue: "Country",
                            })}
                          </span>
                          <span className="review-value">
                            {selectedCountry?.name || "—"}
                          </span>
                        </div>

                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.apply.city", {
                              defaultValue: "City",
                            })}
                          </span>
                          <span className="review-value">
                            {selectedCity?.name || "—"}
                          </span>
                        </div>

                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.apply.taxNumber", {
                              defaultValue: "Tax Number",
                            })}
                          </span>
                          <span className="review-value">
                            {formData.taxNumber || "—"}
                          </span>
                        </div>

                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.apply.registrationNumber", {
                              defaultValue: "Registration Number",
                            })}
                          </span>
                          <span className="review-value">
                            {formData.registrationNumber || "—"}
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

                        <div className="review-item">
                          <span className="review-label">
                            {t("provider.apply.secondaryPhone", {
                              defaultValue: "Secondary Phone",
                            })}
                          </span>
                          <span className="review-value">
                            {formData.secondaryPhone || "—"}
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

                        {formData.logoUrl && (
                          <div className="review-item full-width">
                            <span className="review-label">
                              {t("provider.apply.logoUrl", {
                                defaultValue: "Logo image",
                              })}
                            </span>
                            <span className="review-value description">
                              {formData.logoUrl}
                            </span>
                          </div>
                        )}

                        {formData.coverPhotoUrl && (
                          <div className="review-item full-width">
                            <span className="review-label">
                              {t("provider.apply.coverPhotoUrl", {
                                defaultValue: "Cover photo",
                              })}
                            </span>
                            <span className="review-value description">
                              {formData.coverPhotoUrl}
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
                        disabled={logoUploading || coverUploading}
                        className="action-button next-button">
                        {t("provider.apply.next", { defaultValue: "Next" })}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        onClick={onFinish}
                        loading={loading || logoUploading || coverUploading}
                        disabled={logoUploading || coverUploading}
                        className="action-button submit-button">
                        {loading || logoUploading || coverUploading ? (
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProviderApplyPage;
