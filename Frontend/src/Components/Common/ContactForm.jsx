import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Calendar, Check, CheckCircle2, Copy, Layers } from "lucide-react";
import {
  hasErrors,
  LIMITS,
  getWordCount,
  normalizeEmailInput,
  sanitizeFormPayload,
  validateCompany,
  validateContactField,
  validateContactForm,
  validateEmail,
  validateMessage,
  validateName,
} from "../../utils/formValidation";
import "./ContactForm.css";
import { buildApiUrl, jsonApiHeaders } from "../../config/api";
import HoneypotField, { getHoneypotValue } from "./HoneypotField";

const CONTACT_API = buildApiUrl("Contact");
const DEMO_API = buildApiUrl("Demo");

export const PIRNAV_PRODUCTS = [
  {
    id: "peoplehrsync",
    shortName: "PeopleHRSync",
    title: "PeopleHRSync — Modern HRMS SaaS",
    category: "Modern HRMS SaaS",
    deployedUrl: "https://peoplehrsync.com/",
    badge: "Live SaaS",
  },
  {
    id: "pulseleef",
    shortName: "PulseLeef",
    title: "PulseLeef — Healthcare & Clinical Suite",
    category: "Healthcare & Medical",
    deployedUrl: "https://pulseleef.com/",
    badge: "Healthcare",
  },
  {
    id: "pupil-scholar",
    shortName: "Pupil Scholar",
    title: "Pupil Scholar — Education & Campus ERP",
    category: "Education & Campus ERP",
    deployedUrl: "https://pupilscholar.com/",
    badge: "Campus ERP",
  },
  {
    id: "kini-edx",
    shortName: "KINI",
    title: "Kini — KiniEdx Learning Platform",
    category: "EdTech & Skills",
    deployedUrl: "https://kiniedx.com/",
    badge: "Learning",
  },
  {
    id: "curecode-bug-tracker",
    shortName: "CureCode",
    title: "CureCode — Agile Bug Tracker & QA Suite",
    category: "Developer Tools",
    deployedUrl: "https://curecode.site/",
    badge: "QA Suite",
  },
  {
    id: "avsr-food-court",
    shortName: "AVSR Food Court",
    title: "AVSR Food Court — Restaurant Table Billing & POS",
    category: "Hospitality & Dining",
    deployedUrl: "http://65.0.8.48:3000/",
    badge: "Food Court POS",
  },
];

const defaultContactValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const defaultDemoValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  preferredDemoDate: "",
  message: "",
  consentAccepted: false,
};

const resolveProduct = (value = "") => {
  if (!value) return PIRNAV_PRODUCTS[0];
  const lower = String(value).trim().toLowerCase();
  return (
    PIRNAV_PRODUCTS.find(
      (p) =>
        p.id === lower ||
        p.shortName.toLowerCase() === lower ||
        p.title.toLowerCase() === lower ||
        lower.includes(p.id) ||
        lower.includes(p.shortName.toLowerCase()) ||
        p.title.toLowerCase().includes(lower)
    ) || PIRNAV_PRODUCTS[0]
  );
};

const validatePhone = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return "Phone number is required";
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(trimmed)) {
    return "Enter a valid phone number (7–20 digits)";
  }
  return "";
};

const validateDemoField = (name, value, isRequired = true) => {
  switch (name) {
    case "name":
      return validateName(value);
    case "email":
      return validateEmail(value);
    case "phone":
      return validatePhone(value);
    case "company": {
      const trimmed = String(value || "").trim();
      if (isRequired && !trimmed) return "Company or institution name is required";
      if (trimmed.length < 2) return "Company name must be at least 2 characters";
      return validateCompany(trimmed);
    }
    case "message":
      return validateMessage(value);
    case "consentAccepted":
      return value ? "" : "Please accept the privacy consent to request a demo";
    default:
      return "";
  }
};

const validateFullDemoForm = (values) => ({
  name: validateDemoField("name", values.name),
  email: validateDemoField("email", values.email),
  phone: validateDemoField("phone", values.phone),
  company: validateDemoField("company", values.company),
  message: validateDemoField("message", values.message),
  consentAccepted: validateDemoField("consentAccepted", values.consentAccepted),
});

const sanitizeContactInput = (name, value) => {
  const withoutLeadingSpace = value.replace(/^\s+/, "");

  if (name === "email") {
    return normalizeEmailInput(withoutLeadingSpace);
  }

  if (name === "name") {
    return withoutLeadingSpace.replace(/[^A-Za-z '-]/g, "").replace(/\s{2,}/g, " ");
  }

  if (name === "phone") {
    return withoutLeadingSpace.replace(/[^0-9+\s\-()]/g, "").slice(0, 20);
  }

  if (name === "subject" || name === "message" || name === "company") {
    return withoutLeadingSpace.replace(/[<>]/g, "").replace(/\s{3,}/g, "  ");
  }

  return withoutLeadingSpace;
};

function ContactForm({
  title = "Get In Touch",
  description = "Share your details below and our team will get back to you as soon as possible.",
  buttonLabel = "Send Message",
  compact = false,
  className = "",
  formId,
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const urlProduct =
    searchParams.get("product") ||
    location.state?.productId ||
    location.state?.product ||
    "";
  const urlType = searchParams.get("type") || location.state?.type || "";
  const isDemo = urlType === "demo" || Boolean(urlProduct);
  const hasPreselectedProduct = Boolean(urlProduct);

  const [selectedProductId, setSelectedProductId] = useState(() => resolveProduct(urlProduct).id);

  const [contactData, setContactData] = useState(defaultContactValues);
  const [demoData, setDemoData] = useState(() => ({
    ...defaultDemoValues,
    message: isDemo
      ? `We would like a live product walkthrough of ${resolveProduct(urlProduct).shortName} for our team.`
      : "",
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [demoConfirmation, setDemoConfirmation] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const selectedProduct = useMemo(
    () => resolveProduct(hasPreselectedProduct ? urlProduct : selectedProductId),
    [hasPreselectedProduct, selectedProductId, urlProduct]
  );

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (isDemo) {
      const matched = resolveProduct(urlProduct);
      setSelectedProductId(matched.id);
      setDemoConfirmation(null);
      setStatus("");
      setSubmitMessage("");
      setErrors({});
      setTouched({});
      setDemoData((prev) => ({
        ...prev,
        message:
          prev.message && !prev.message.startsWith("We would like a live product walkthrough")
            ? prev.message
            : `We would like a live product walkthrough of ${matched.shortName} for our team.`,
      }));
    } else {
      setDemoConfirmation(null);
      setStatus("");
      setSubmitMessage("");
      setErrors({});
      setTouched({});
    }
  }, [isDemo, urlProduct]);

  useEffect(() => {
    if (status !== "success" || isDemo) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setStatus(""), 7000);
    return () => clearTimeout(timeoutId);
  }, [status, isDemo]);

  const visibleErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(errors).map(([key, value]) => [key, touched[key] ? value : ""])
      ),
    [errors, touched]
  );

  const activeMessage = isDemo ? demoData.message : contactData.message;
  const messageWordCount = getWordCount(activeMessage);

  const handleProductSelect = (productId) => {
    const matched = resolveProduct(productId);
    setSelectedProductId(matched.id);
    setStatus("");
    setSubmitMessage("");
    setDemoData((prev) => ({
      ...prev,
      message:
        !prev.message || prev.message.startsWith("We would like a live product walkthrough")
          ? `We would like a live product walkthrough of ${matched.shortName} for our team.`
          : prev.message,
    }));
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    const nextValue = sanitizeContactInput(name, value);
    setContactData((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: validateContactField(name, nextValue) }));
    if (value.trim()) setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleContactBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validateContactForm(contactData));
  };

  const handleDemoChange = (event) => {
    const { name, type, checked, value } = event.target;
    const nextValue = type === "checkbox" ? checked : sanitizeContactInput(name, value);
    setDemoData((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: validateDemoField(name, nextValue) }));
    if (type === "checkbox" || String(value).trim()) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleDemoBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validateFullDemoForm(demoData));
  };

  const handleCopyReference = async () => {
    if (!demoConfirmation?.referenceNumber) return;
    try {
      await navigator.clipboard.writeText(demoConfirmation.referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Clipboard may be unavailable in restricted contexts.
    }
  };

  const handleResetDemo = () => {
    setDemoConfirmation(null);
    setStatus("");
    setSubmitMessage("");
    setErrors({});
    setTouched({});
    setDemoData({
      ...defaultDemoValues,
      message: `We would like a live product walkthrough of ${selectedProduct.shortName} for our team.`,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const website = getHoneypotValue(event.currentTarget);

    if (isDemo) {
      const nextErrors = validateFullDemoForm(demoData);
      setTouched({
        name: true,
        email: true,
        phone: true,
        company: true,
        message: true,
        consentAccepted: true,
      });
      setErrors(nextErrors);

      if (hasErrors(nextErrors)) {
        setStatus("");
        return;
      }

      setLoading(true);
      setStatus("");
      setSubmitMessage("");

      try {
        const cleaned = sanitizeFormPayload({
          name: demoData.name,
          email: demoData.email,
          phone: demoData.phone,
          company: demoData.company,
          message: demoData.message,
        });

        const response = await fetch(DEMO_API, {
          method: "POST",
          headers: jsonApiHeaders,
          body: JSON.stringify({
            productId: selectedProduct.id,
            name: cleaned.name,
            email: cleaned.email,
            phone: cleaned.phone,
            company: cleaned.company,
            preferredDemoDate: demoData.preferredDemoDate || null,
            message: cleaned.message,
            consentAccepted: Boolean(demoData.consentAccepted),
            website,
          }),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          const msg =
            responseData?.message ||
            Object.values(responseData?.errors || {})[0] ||
            "Unable to submit demo request. Please check your details and try again.";
          throw new Error(msg);
        }

        setDemoConfirmation({
          referenceNumber: responseData?.referenceNumber || "PIR-DEMO-RECEIVED",
          productName: responseData?.productName || selectedProduct.title,
          status: responseData?.status || "New",
          customerEmail: cleaned.email,
        });
        setStatus("success");
        setDemoData(defaultDemoValues);
        setErrors({});
        setTouched({});
      } catch (error) {
        setSubmitMessage(error.message || "Something went wrong. Please try again.");
        setStatus("error");
      } finally {
        setLoading(false);
      }

      return;
    }

    // Standard General Contact submission
    const nextErrors = validateContactForm(contactData);
    setTouched({ name: true, email: true, subject: true, message: true });
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setStatus("");
      return;
    }

    setLoading(true);
    setStatus("");
    setSubmitMessage("");

    try {
      const payload = sanitizeFormPayload(contactData);
      const response = await fetch(CONTACT_API, {
        method: "POST",
        headers: jsonApiHeaders,
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          subject: payload.subject.trim().slice(0, 95),
          message: payload.message.trim().slice(0, 980),
          website,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Something went wrong. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message ||
            Object.values(errorData.errors || {})[0] ||
            errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await response.json();
      setStatus("success");
      setSubmitMessage("");
      setContactData(defaultContactValues);
      setErrors({});
      setTouched({});
    } catch (error) {
      setSubmitMessage(error.message || "Something went wrong. Please try again.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const dynamicTitle = isDemo ? "Schedule a Product Demo" : title;
  const dynamicDescription = isDemo
    ? "Share your organization details below and our solution architects will arrange a personalized live walkthrough."
    : description;

  return (
    <div
      className={`shared-contact-form-shell ${compact ? "shared-contact-form-compact" : ""} ${className}`.trim()}
      id={formId}
    >
      <div className="shared-contact-form-header">
        <h2>{dynamicTitle}</h2>
        <p>{dynamicDescription}</p>
      </div>

      {isDemo && demoConfirmation ? (
        <div className="demo-confirmation-card" role="status">
          <div className="demo-confirmation-head">
            <span className="demo-confirmation-icon">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <strong>Demo Request Confirmed</strong>
              <p>Your request has been logged for {demoConfirmation.productName}.</p>
            </div>
          </div>

          <div className="demo-confirmation-ref-box">
            <div>
              <small>Demo Reference Number</small>
              <strong>{demoConfirmation.referenceNumber}</strong>
            </div>
            <button
              type="button"
              className="demo-copy-btn"
              onClick={handleCopyReference}
              aria-label="Copy demo reference number"
            >
              {copiedRef ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedRef ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="demo-confirmation-steps">
            <p>
              <strong>Next Steps:</strong> An acknowledgement has been queued to{" "}
              <span>{demoConfirmation.customerEmail}</span>. Our solution specialists will reach
              out shortly to confirm your live walkthrough slot.
            </p>
            <p className="demo-confirmation-contact">
              Need immediate assistance? Email{" "}
              <a href="mailto:contact@pirnav.com">contact@pirnav.com</a> or call{" "}
              <a href="tel:040-35339312">040-35339312</a>.
            </p>
          </div>

          <div className="demo-confirmation-actions">
            <button type="button" className="demo-primary-action" onClick={handleResetDemo}>
              Book Another Demo
            </button>
            <Link to="/products" className="demo-secondary-link">
              Explore Products
            </Link>
          </div>
        </div>
      ) : isDemo ? (
        <form className="shared-contact-form" onSubmit={handleSubmit} noValidate>
          <HoneypotField />

          {hasPreselectedProduct ? (
            <div className="demo-selected-product-banner">
              <span className="demo-selected-product-icon">
                <Layers size={18} aria-hidden="true" />
              </span>
              <div className="demo-selected-product-copy">
                <small>Selected Product</small>
                <strong>{selectedProduct.title}</strong>
              </div>
              <span className="demo-selected-product-badge">{selectedProduct.category}</span>
            </div>
          ) : (
            <label className="shared-contact-field">
              <span>
                Product <em className="required-star">*</em>
              </span>
              <select
                name="productId"
                value={selectedProduct.id}
                onChange={(e) => handleProductSelect(e.target.value)}
              >
                {PIRNAV_PRODUCTS.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="shared-contact-grid shared-contact-grid-two">
            <label className="shared-contact-field">
              <span>
                Full Name <em className="required-star">*</em>
              </span>
              <input
                type="text"
                name="name"
                placeholder="Your full name"
                required
                minLength={LIMITS.nameMin}
                maxLength={LIMITS.nameMax}
                value={demoData.name}
                onChange={handleDemoChange}
                onBlur={handleDemoBlur}
                aria-invalid={Boolean(visibleErrors.name)}
              />
              {visibleErrors.name ? <small>{visibleErrors.name}</small> : null}
            </label>

            <label className="shared-contact-field">
              <span>
                Work Email <em className="required-star">*</em>
              </span>
              <input
                type="email"
                name="email"
                placeholder="name@company.com"
                required
                maxLength={150}
                value={demoData.email}
                onChange={handleDemoChange}
                onBlur={handleDemoBlur}
                aria-invalid={Boolean(visibleErrors.email)}
              />
              {visibleErrors.email ? <small>{visibleErrors.email}</small> : null}
            </label>
          </div>

          <div className="shared-contact-grid shared-contact-grid-two">
            <label className="shared-contact-field">
              <span>
                Phone Number <em className="required-star">*</em>
              </span>
              <input
                type="tel"
                name="phone"
                placeholder="+91 98765 43210"
                required
                maxLength={20}
                value={demoData.phone}
                onChange={handleDemoChange}
                onBlur={handleDemoBlur}
                aria-invalid={Boolean(visibleErrors.phone)}
              />
              {visibleErrors.phone ? <small>{visibleErrors.phone}</small> : null}
            </label>

            <label className="shared-contact-field">
              <span>
                Company / Institution <em className="required-star">*</em>
              </span>
              <input
                type="text"
                name="company"
                placeholder="Organization name"
                required
                maxLength={150}
                value={demoData.company}
                onChange={handleDemoChange}
                onBlur={handleDemoBlur}
                aria-invalid={Boolean(visibleErrors.company)}
              />
              {visibleErrors.company ? <small>{visibleErrors.company}</small> : null}
            </label>
          </div>

          <label className="shared-contact-field">
            <span>
              <Calendar size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
              Preferred Demo Date <em className="optional-label">(Optional)</em>
            </span>
            <input
              type="date"
              name="preferredDemoDate"
              min={todayIso}
              value={demoData.preferredDemoDate}
              onChange={handleDemoChange}
            />
          </label>

          <label className="shared-contact-field">
            <span>
              Requirements &amp; Team Size <em className="required-star">*</em>
            </span>
            <textarea
              name="message"
              rows="4"
              placeholder={`Share your goals or workflows for ${selectedProduct.shortName}`}
              required
              minLength={LIMITS.messageMin}
              maxLength={LIMITS.messageMax}
              value={demoData.message}
              onChange={handleDemoChange}
              onBlur={handleDemoBlur}
              aria-invalid={Boolean(visibleErrors.message)}
            />
            <small
              className={`shared-contact-word-count ${
                messageWordCount > LIMITS.messageWordMax ? "over-limit" : ""
              }`}
            >
              {messageWordCount} / {LIMITS.messageWordMax} words
            </small>
            {visibleErrors.message ? <small>{visibleErrors.message}</small> : null}
          </label>

          <label className="demo-consent-row">
            <input
              type="checkbox"
              name="consentAccepted"
              checked={demoData.consentAccepted}
              onChange={handleDemoChange}
              onBlur={handleDemoBlur}
            />
            <span>
              I agree to PIRNAV processing my contact details to coordinate this demo as
              described in the <Link to="/privacy-policy">Privacy Policy</Link>.{" "}
              <em className="required-star">*</em>
            </span>
          </label>
          {visibleErrors.consentAccepted ? (
            <small className="demo-consent-error">{visibleErrors.consentAccepted}</small>
          ) : null}

          <button type="submit" disabled={loading}>
            {loading ? "Submitting Demo Request..." : `Request ${selectedProduct.shortName} Demo →`}
          </button>

          {status === "error" ? (
            <p className="shared-contact-status shared-contact-status-error">
              {submitMessage || "Something went wrong. Please try again."}
            </p>
          ) : null}
        </form>
      ) : (
        <form className="shared-contact-form" onSubmit={handleSubmit} noValidate>
          <HoneypotField />

          <div className="shared-contact-grid shared-contact-grid-two">
            <label className="shared-contact-field">
              <span>
                Name <em className="required-star">*</em>
              </span>
              <input
                type="text"
                name="name"
                placeholder="Your name"
                required
                minLength={LIMITS.nameMin}
                maxLength={LIMITS.nameMax}
                value={contactData.name}
                onChange={handleContactChange}
                onBlur={handleContactBlur}
                aria-invalid={Boolean(visibleErrors.name)}
              />
              {visibleErrors.name ? <small>{visibleErrors.name}</small> : null}
            </label>

            <label className="shared-contact-field">
              <span>
                Email <em className="required-star">*</em>
              </span>
              <input
                type="email"
                name="email"
                placeholder="Your email address"
                required
                maxLength={LIMITS.emailMax}
                value={contactData.email}
                onChange={handleContactChange}
                onBlur={handleContactBlur}
                aria-invalid={Boolean(visibleErrors.email)}
              />
              {visibleErrors.email ? <small>{visibleErrors.email}</small> : null}
            </label>
          </div>

          <label className="shared-contact-field">
            <span>
              Subject <em className="required-star">*</em>
            </span>
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              required
              minLength={LIMITS.subjectMin}
              maxLength={LIMITS.subjectMax}
              value={contactData.subject}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
              aria-invalid={Boolean(visibleErrors.subject)}
            />
            {visibleErrors.subject ? <small>{visibleErrors.subject}</small> : null}
          </label>

          <label className="shared-contact-field">
            <span>
              Message <em className="required-star">*</em>
            </span>
            <textarea
              name="message"
              rows="5"
              placeholder="Tell us what you need"
              required
              minLength={LIMITS.messageMin}
              maxLength={LIMITS.messageMax}
              value={contactData.message}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
              aria-invalid={Boolean(visibleErrors.message)}
            />
            <small
              className={`shared-contact-word-count ${
                messageWordCount > LIMITS.messageWordMax ? "over-limit" : ""
              }`}
            >
              {messageWordCount} / {LIMITS.messageWordMax} words
            </small>
            {visibleErrors.message ? <small>{visibleErrors.message}</small> : null}
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : buttonLabel}
          </button>

          {status === "error" ? (
            <p className="shared-contact-status shared-contact-status-error">
              {submitMessage || "Something went wrong. Please try again."}
            </p>
          ) : null}

          {status === "success" ? (
            <div className="shared-contact-status shared-contact-status-success">
              <div className="status-success-header">
                <CheckCircle2 size={18} className="status-success-icon" />
                <strong>Message Sent Successfully!</strong>
              </div>
              <p className="status-success-desc">
                Thank you for reaching out. Our team will review your message and get back to
                you shortly.
              </p>
              <div className="status-success-direct">
                <span>Need immediate assistance? Call us directly: </span>
                <a href="tel:040-35339312">040-35339312</a>
              </div>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}

export default ContactForm;
