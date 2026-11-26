import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  MapPin,
  PlayCircle,
  Users,
  Video,
} from "lucide-react";
import { buildApiUrl, jsonApiHeaders } from "../../config/api";
import {
  hasErrors,
  LIMITS,
  normalizeEmailInput,
  sanitizeFormPayload,
  validateCompany,
  validateEmail,
  validateName,
} from "../../utils/formValidation";
import EventBannerMedia from "./EventBannerMedia";
import {
  formatEventDateTime,
  getInitials,
  resolveEventMediaUrl,
} from "./eventHelpers";
import "./Events.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  jobRole: "",
  notes: "",
  consentAccepted: false,
  website: "",
};

const EventDetail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const registerBoxRef = useRef(null);
  const highlightsRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState("");

  const [formData, setFormData] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  useEffect(() => {
    let active = true;
    const loadEvent = async () => {
      setLoading(true);
      setNotFoundError("");
      setConfirmation(null);
      setSubmitError("");
      try {
        const res = await fetch(buildApiUrl(`Events/${encodeURIComponent(slug || "")}`), {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) {
          throw new Error(res.status === 404 ? "This event could not be found." : "Unable to load event details.");
        }
        const data = await res.json();
        if (active) setEvent(data);
      } catch (err) {
        if (active) setNotFoundError(err?.message || "Event unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadEvent();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!event) return;
    if (location.search.includes("register=1") && registerBoxRef.current) {
      setTimeout(() => {
        registerBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    } else if (location.hash === "#highlights" && highlightsRef.current) {
      setTimeout(() => {
        highlightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [event, location.search, location.hash]);

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "company":
        return validateCompany(value);
      case "phone": {
        const digits = String(value || "").replace(/\D/g, "");
        if (!digits) return "Please enter your phone number.";
        if (digits.length < 7 || digits.length > 15) {
          return "Enter a valid phone number (7-15 digits).";
        }
        return "";
      }
      case "consentAccepted":
        return value ? "" : "Please accept the privacy consent to register.";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, nextValue) }));
    }
    if (submitError) setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!event) return;

    const cleaned = sanitizeFormPayload({
      name: formData.name,
      email: normalizeEmailInput(formData.email),
      phone: formData.phone.trim(),
      company: formData.company,
      jobRole: formData.jobRole,
      notes: formData.notes,
    });

    const errors = {
      name: validateField("name", cleaned.name),
      email: validateField("email", cleaned.email),
      phone: validateField("phone", cleaned.phone),
      company: validateField("company", cleaned.company),
      consentAccepted: validateField("consentAccepted", formData.consentAccepted),
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(buildApiUrl(`Events/${event.id}/register`), {
        method: "POST",
        headers: jsonApiHeaders,
        body: JSON.stringify({
          ...cleaned,
          consentAccepted: formData.consentAccepted,
          website: formData.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          data?.message ||
            (Array.isArray(data?.errors) ? data.errors.join(" ") : "") ||
            "Could not complete registration. Please check your details."
        );
        return;
      }

      setConfirmation(data);
      setFormData(initialForm);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              registeredCount: (prev.registeredCount || 0) + 1,
              spotsRemaining:
                typeof prev.spotsRemaining === "number"
                  ? Math.max(0, prev.spotsRemaining - 1)
                  : null,
            }
          : prev
      );
    } catch {
      setSubmitError("Network error while registering. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReference = async () => {
    if (!confirmation?.referenceNumber) return;
    try {
      await navigator.clipboard.writeText(confirmation.referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="events-container" style={{ paddingTop: "7rem" }}>
          <div className="events-empty-box">
            <h3>Loading Event Details...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (notFoundError || !event) {
    return (
      <div className="event-detail-page">
        <div className="events-container" style={{ paddingTop: "7rem" }}>
          <div className="events-empty-box">
            <h3>Event Not Found</h3>
            <p>{notFoundError || "The requested event is unavailable."}</p>
            <Link to="/events" className="event-btn-primary" style={{ maxWidth: 220, margin: "1rem auto 0" }}>
              <ArrowLeft size={15} /> Back to All Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryCtaAction = () => {
    if (event.ctaState === "RegisterNow") {
      registerBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (event.ctaState === "ViewHighlights") {
      highlightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const ctaLabel =
    event.ctaState === "RegisterNow"
      ? "Register Now"
      : event.ctaState === "RegistrationClosed"
      ? "Registration Closed"
      : event.ctaState === "CapacityFull"
      ? "Capacity Full"
      : "View Highlights";

  return (
    <div className="event-detail-page">
      {/* ================= HERO ================= */}
      <section className="event-detail-hero">
        <div className="event-detail-hero-inner">
          <Link to="/events" className="event-back-link">
            <ArrowLeft size={16} /> Back to PIRNAV Events
          </Link>

          <div className="event-detail-hero-grid">
            <div>
              <span className="events-kicker">
                {event.category} • {event.isPast ? "Past Event" : "Upcoming Event"}
              </span>
              <h1>{event.title}</h1>
              <p className="event-detail-lead">{event.shortDescription}</p>

              <div className="event-detail-facts">
                <div className="event-fact-chip">
                  <CalendarDays size={18} />
                  <div>
                    <small>Date &amp; Time</small>
                    <strong>
                      {formatEventDateTime(event.startDateTime, event.endDateTime, event.timezone)}
                    </strong>
                  </div>
                </div>
                <div className="event-fact-chip">
                  {event.eventMode === "Online" ? <Video size={18} /> : <MapPin size={18} />}
                  <div>
                    <small>{event.eventMode} Format</small>
                    <strong>{event.locationOrPlatform}</strong>
                  </div>
                </div>
                <div className="event-fact-chip">
                  <Users size={18} />
                  <div>
                    <small>Attendance</small>
                    <strong>
                      {event.maxAttendees
                        ? `${event.registeredCount} Registered (${event.spotsRemaining ?? 0} spots left)`
                        : `${event.registeredCount} Registered`}
                    </strong>
                  </div>
                </div>
                <div className="event-fact-chip">
                  <Clock3 size={18} />
                  <div>
                    <small>Registration Status</small>
                    <strong>{ctaLabel}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="event-btn-primary"
                  style={{ flex: "0 1 auto", padding: "0.78rem 1.45rem" }}
                  onClick={primaryCtaAction}
                  disabled={event.ctaState === "RegistrationClosed" || event.ctaState === "CapacityFull"}
                >
                  {ctaLabel}
                </button>
                {event.isPast && event.recordingUrl && (
                  <a
                    href={event.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="event-btn-secondary"
                  >
                    <PlayCircle size={16} /> Watch Recording
                  </a>
                )}
              </div>
            </div>

            <div className="event-detail-banner-wrap">
              <EventBannerMedia
                bannerImageUrl={event.bannerImageUrl}
                title={event.title}
                category={event.category}
                eventMode={event.eventMode}
                isPast={event.isPast}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= BODY ================= */}
      <div className="event-detail-body">
        <main>
          <article className="event-detail-card">
            <h2>
              <Layers size={20} /> About This Event
            </h2>
            <p className="event-prose">{event.description}</p>

            {event.whoShouldAttend && (
              <div style={{ marginTop: "1.4rem", paddingTop: "1.2rem", borderTop: "1px solid #eef3f7" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "#0b1f2b" }}>
                  Who Should Attend?
                </h3>
                <p className="event-prose">{event.whoShouldAttend}</p>
              </div>
            )}
          </article>

          {/* Agenda */}
          {Array.isArray(event.agendaItems) && event.agendaItems.length > 0 && (
            <section className="event-detail-card">
              <h2>
                <Clock3 size={20} /> Agenda &amp; Schedule
              </h2>
              <div className="event-agenda-list">
                {event.agendaItems.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="event-agenda-item">
                    <div className="event-agenda-time">{item.time}</div>
                    <div className="event-agenda-content">
                      <h4>{item.title}</h4>
                      {item.speaker && <div className="event-agenda-speaker">{item.speaker}</div>}
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Speakers */}
          {Array.isArray(event.speakers) && event.speakers.length > 0 && (
            <section className="event-detail-card">
              <h2>
                <Users size={20} /> Featured Speakers
              </h2>
              <div className="event-speakers-grid">
                {event.speakers.map((sp) => {
                  const photoSrc = resolveEventMediaUrl(sp.photoUrl);
                  return (
                    <div key={sp.id || sp.name} className="event-speaker-card">
                      <div className="event-speaker-avatar">
                        {photoSrc ? (
                          <img src={photoSrc} alt={sp.name} />
                        ) : (
                          <span>{getInitials(sp.name)}</span>
                        )}
                      </div>
                      <div className="event-speaker-info">
                        <h4>{sp.name}</h4>
                        <div className="event-speaker-role">
                          {sp.roleTitle}
                          {sp.organization ? ` • ${sp.organization}` : ""}
                        </div>
                        {sp.bio && <p>{sp.bio}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Past Event Highlights & Gallery */}
          {(event.isPast ||
            event.highlightsSummary ||
            event.recordingUrl ||
            (Array.isArray(event.galleryItems) && event.galleryItems.length > 0)) && (
            <section ref={highlightsRef} id="highlights" className="event-detail-card">
              <h2>
                <ImageIcon size={20} /> Event Highlights &amp; Gallery
              </h2>
              {event.highlightsSummary && <p className="event-prose">{event.highlightsSummary}</p>}

              {event.recordingUrl && (
                <div style={{ marginTop: "1rem" }}>
                  <a
                    href={event.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="event-btn-primary"
                    style={{ display: "inline-flex" }}
                  >
                    <PlayCircle size={16} /> Watch Full Session Recording <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {Array.isArray(event.galleryItems) && event.galleryItems.length > 0 ? (
                <div className="event-gallery-grid">
                  {event.galleryItems.map((item) => {
                    if (item.mediaType === "Video") {
                      return (
                        <div key={item.id} className="event-gallery-item event-gallery-video">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                            <PlayCircle size={18} /> Session Video
                          </div>
                          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                            {item.caption || "Recorded event highlight video"}
                          </p>
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="event-btn-secondary"
                            style={{ alignSelf: "flex-start" }}
                          >
                            Watch Video <ExternalLink size={14} />
                          </a>
                        </div>
                      );
                    }

                    const imgUrl = resolveEventMediaUrl(item.mediaUrl);
                    return (
                      <div key={item.id} className="event-gallery-item">
                        <button
                          type="button"
                          onClick={() => setLightboxItem({ ...item, resolvedUrl: imgUrl })}
                          style={{ padding: 0, border: "none", width: "100%", cursor: "pointer", display: "block" }}
                        >
                          <img src={imgUrl} alt={item.caption || event.title} loading="lazy" />
                        </button>
                        {item.caption && <div className="event-gallery-caption">{item.caption}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem 1.15rem",
                    borderRadius: "0.85rem",
                    background: "#f6f9fc",
                    border: "1px dashed #cbdbe4",
                    color: "#526879",
                    fontSize: "0.88rem",
                  }}
                >
                  Gallery photos and video clips can be uploaded anytime from the PIRNAV Admin Portal.
                </div>
              )}
            </section>
          )}
        </main>

        {/* ================= REGISTRATION SIDEBAR ================= */}
        <aside ref={registerBoxRef}>
          <div className="event-register-card">
            {event.ctaState === "RegisterNow" ? (
              confirmation ? (
                <div className="event-confirm-box">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", color: "#074c59" }}>
                    <CheckCircle2 size={22} />
                    <h3 style={{ margin: 0 }}>Registration Confirmed</h3>
                  </div>
                  <p style={{ margin: "0.55rem 0 0", fontSize: "0.88rem", color: "#3d5466" }}>
                    {confirmation.message}
                  </p>
                  <div className="event-ref-box">
                    <div>
                      <small style={{ display: "block", fontSize: "0.7rem", color: "#526879", textTransform: "uppercase" }}>
                        Reference Number
                      </small>
                      <strong>{confirmation.referenceNumber}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      className="event-btn-secondary"
                      style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
                    >
                      <Copy size={13} /> {copiedRef ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.83rem", color: "#526879" }}>
                    We have queued a confirmation email with event details. Our team will share
                    joining/check-in updates ahead of the event.
                  </p>
                  <Link to="/events" className="event-btn-primary" style={{ width: "100%" }}>
                    Explore More Events
                  </Link>
                </div>
              ) : (
                <>
                  <h3>Register for this Event</h3>
                  <p className="event-register-sub">
                    Reserve your seat and receive an instant confirmation reference &amp; email update.
                  </p>

                  {submitError && <div className="event-submit-error">{submitError}</div>}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="event-honeypot" aria-hidden="true">
                      <label htmlFor="evt-website">Website</label>
                      <input
                        id="evt-website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.website}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-name">Full Name *</label>
                      <input
                        id="evt-name"
                        name="name"
                        type="text"
                        maxLength={LIMITS?.NAME_MAX || 80}
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                      />
                      {fieldErrors.name && <p className="event-field-error">{fieldErrors.name}</p>}
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-email">Work / Personal Email *</label>
                      <input
                        id="evt-email"
                        name="email"
                        type="email"
                        maxLength={LIMITS?.EMAIL_MAX || 120}
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {fieldErrors.email && <p className="event-field-error">{fieldErrors.email}</p>}
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-phone">Phone Number *</label>
                      <input
                        id="evt-phone"
                        name="phone"
                        type="tel"
                        maxLength={20}
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                      {fieldErrors.phone && <p className="event-field-error">{fieldErrors.phone}</p>}
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-company">Company / Institution *</label>
                      <input
                        id="evt-company"
                        name="company"
                        type="text"
                        maxLength={LIMITS?.COMPANY_MAX || 100}
                        placeholder="Organization or university"
                        value={formData.company}
                        onChange={handleChange}
                      />
                      {fieldErrors.company && (
                        <p className="event-field-error">{fieldErrors.company}</p>
                      )}
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-role">Job Role / Designation</label>
                      <input
                        id="evt-role"
                        name="jobRole"
                        type="text"
                        maxLength={80}
                        placeholder="e.g. Engineering Lead, Student"
                        value={formData.jobRole}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="event-form-field">
                      <label htmlFor="evt-notes">Questions / Topics of Interest</label>
                      <textarea
                        id="evt-notes"
                        name="notes"
                        rows={3}
                        maxLength={400}
                        placeholder="Optional topics or questions for our speakers"
                        value={formData.notes}
                        onChange={handleChange}
                      />
                    </div>

                    <label className="event-consent-row">
                      <input
                        type="checkbox"
                        name="consentAccepted"
                        checked={formData.consentAccepted}
                        onChange={handleChange}
                      />
                      <span>
                        I agree to PIRNAV processing my registration details to coordinate this event
                        as described in the{" "}
                        <Link to="/privacy-policy" style={{ color: "#0b7286", fontWeight: 700 }}>
                          Privacy Policy
                        </Link>
                        . *
                      </span>
                    </label>
                    {fieldErrors.consentAccepted && (
                      <p className="event-field-error" style={{ marginTop: "-0.6rem", marginBottom: "0.75rem" }}>
                        {fieldErrors.consentAccepted}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="event-btn-primary"
                      style={{ width: "100%", padding: "0.78rem 1rem" }}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting Registration..." : "Confirm Registration"}
                    </button>
                  </form>
                </>
              )
            ) : (
              <div>
                <h3>
                  {event.isPast
                    ? "Session Concluded"
                    : event.ctaState === "CapacityFull"
                    ? "All Seats Reserved"
                    : "Registration Closed"}
                </h3>
                <p className="event-register-sub">
                  {event.isPast
                    ? "This event has already taken place. Browse the summary, speaker lineup, and past event gallery."
                    : event.ctaState === "CapacityFull"
                    ? "This event has reached maximum capacity. Check upcoming events for our next scheduled session."
                    : "Registration for this event is currently closed by the PIRNAV team."}
                </p>
                {event.isPast && event.recordingUrl && (
                  <a
                    href={event.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="event-btn-primary"
                    style={{ width: "100%", marginBottom: "0.75rem" }}
                  >
                    <PlayCircle size={16} /> Watch Recording
                  </a>
                )}
                <Link to="/events" className="event-btn-secondary" style={{ width: "100%" }}>
                  Browse Upcoming Events
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Lightbox Modal for Gallery Photo */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 20, 38, 0.86)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "860px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <img
              src={lightboxItem.resolvedUrl}
              alt={lightboxItem.caption || event.title}
              style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", background: "#061426", display: "block" }}
            />
            <div style={{ padding: "0.9rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span style={{ color: "#102238", fontSize: "0.9rem", fontWeight: 600 }}>
                {lightboxItem.caption || event.title}
              </span>
              <button type="button" className="event-btn-secondary" onClick={() => setLightboxItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
