import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Images,
  Trophy,
  Utensils,
  X,
} from "lucide-react";
import {
  EVENTS_HERO_IMAGE,
  getSortedOfficeEvents,
} from "./eventsData";
import "./Events.css";

const renderEventIcon = (iconKey) => {
  switch (iconKey) {
    case "cricket":
      return <Trophy size={18} aria-hidden="true" />;
    case "potluck":
      return <Utensils size={18} aria-hidden="true" />;
    case "traditional":
      return <Flame size={18} aria-hidden="true" />;
    default:
      return <CalendarDays size={18} aria-hidden="true" />;
  }
};

const Events = () => {
  const sortedEvents = useMemo(() => getSortedOfficeEvents(), []);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const [visibleIds, setVisibleIds] = useState(() =>
    prefersReducedMotion || typeof IntersectionObserver === "undefined"
      ? new Set(sortedEvents.map((ev) => ev.id))
      : new Set()
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const [galleryEvent, setGalleryEvent] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const cardRefs = useRef([]);
  const closeBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const touchStartXRef = useRef(null);

  // Scroll-reveal & timeline progression observer
  useEffect(() => {
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const eventId = entry.target.getAttribute("data-event-id");
          const indexAttr = Number(entry.target.getAttribute("data-event-index"));
          if (entry.isIntersecting && eventId) {
            setVisibleIds((prev) => {
              if (prev.has(eventId)) return prev;
              const next = new Set(prev);
              next.add(eventId);
              return next;
            });
            if (!Number.isNaN(indexAttr)) {
              setActiveIndex((prev) => Math.max(prev, indexAttr));
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );

    cardRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const openGallery = useCallback((eventItem, triggerElement, startIdx = 0) => {
    lastTriggerRef.current = triggerElement || document.activeElement;
    setGalleryEvent(eventItem);
    setPhotoIndex(startIdx);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryEvent(null);
    setPhotoIndex(0);
    window.requestAnimationFrame(() => {
      if (lastTriggerRef.current && typeof lastTriggerRef.current.focus === "function") {
        lastTriggerRef.current.focus();
      }
    });
  }, []);

  const showPrevPhoto = useCallback(() => {
    if (!galleryEvent?.galleryImages?.length) return;
    setPhotoIndex((prev) =>
      prev === 0 ? galleryEvent.galleryImages.length - 1 : prev - 1
    );
  }, [galleryEvent]);

  const showNextPhoto = useCallback(() => {
    if (!galleryEvent?.galleryImages?.length) return;
    setPhotoIndex((prev) =>
      prev === galleryEvent.galleryImages.length - 1 ? 0 : prev + 1
    );
  }, [galleryEvent]);

  // Lock background scroll, manage initial focus, keyboard nav, and focus trap
  useEffect(() => {
    if (!galleryEvent) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeGallery();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPrevPhoto();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showNextPhoto();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryEvent, closeGallery, showPrevPhoto, showNextPhoto]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) >= 45) {
      if (delta > 0) showPrevPhoto();
      else showNextPhoto();
    }
  };

  const progressPct =
    sortedEvents.length > 1
      ? Math.round(((activeIndex + 1) / sortedEvents.length) * 100)
      : 100;

  const activePhoto = galleryEvent?.galleryImages?.[photoIndex] || null;

  return (
    <div className="office-events-page">
      {/* ================= HERO SECTION ================= */}
      <section className="office-events-hero" aria-labelledby="office-events-hero-title">
        <div className="office-events-hero-bg" aria-hidden="true">
          <img
            src={EVENTS_HERO_IMAGE.src}
            alt={EVENTS_HERO_IMAGE.alt}
            decoding="async"
          />
        </div>
        <div className="office-events-hero-overlay" aria-hidden="true" />

        <div className="office-events-hero-content">
          <span className="office-events-eyebrow">COMPANY EVENTS</span>
          <h1 id="office-events-hero-title">Events</h1>
          <p className="office-events-hero-desc">
            Relive the moments from our office events and celebrations at PIRNAV.
          </p>
        </div>
      </section>

      {/* ================= OFFICE EVENTS TIMELINE ================= */}
      <section className="office-timeline-section" aria-labelledby="timeline-section-heading">
        <div className="office-timeline-layout">
          {/* Left Sticky Column (~25%) */}
          <div className="office-timeline-intro">
            <span className="office-timeline-bar" aria-hidden="true" />
            <h2 id="timeline-section-heading">
              Our <span>Office Events</span> Timeline
            </h2>
            <p>
              A look back at the exciting events, team bonding activities and
              celebrations that bring the PIRNAV family closer together.
            </p>
          </div>

          {/* Right Vertical Timeline (~75%) */}
          <div className="office-timeline-track">
            <div className="office-timeline-spine" aria-hidden="true">
              <span
                className="office-timeline-spine-fill"
                style={{ height: `${progressPct}%` }}
              />
            </div>

            {sortedEvents.map((ev, index) => {
              const photoCount = Array.isArray(ev.galleryImages)
                ? ev.galleryImages.length
                : 0;
              const isVisible = visibleIds.has(ev.id);
              const isActive = index <= activeIndex;

              return (
                <div
                  key={ev.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  data-event-id={ev.id}
                  data-event-index={index}
                  className={`office-timeline-row ${isVisible ? "is-visible" : ""} ${
                    isActive ? "is-active" : ""
                  }`}
                >
                  <span
                    className={`office-timeline-node ${
                      ev.accent === "teal" ? "accent-teal" : "accent-orange"
                    }`}
                    aria-hidden="true"
                  />

                  <article className="office-event-card">
                    {/* Clickable Cover Image */}
                    <button
                      type="button"
                      className="office-event-media-btn"
                      onClick={(e) => openGallery(ev, e.currentTarget, 0)}
                      aria-label={`Open photo gallery for ${ev.title}`}
                    >
                      <img
                        src={ev.coverImage?.src}
                        alt={ev.coverImage?.alt || ev.title}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </button>

                    {/* Content */}
                    <div className="office-event-body">
                      <div className="office-event-heading">
                        <span className="office-event-icon-badge">
                          {renderEventIcon(ev.icon)}
                        </span>
                        <h3>{ev.title}</h3>
                      </div>

                      <p>{ev.description}</p>

                      <div className="office-event-actions">
                        <button
                          type="button"
                          className="office-view-photos-btn"
                          onClick={(e) => openGallery(ev, e.currentTarget, 0)}
                        >
                          <span>View Photos</span>
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>

                        <span className="office-photo-count-pill">
                          <Images size={15} aria-hidden="true" />
                          <span>
                            {photoCount} {photoCount === 1 ? "Photo" : "Photos"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE PHOTO GALLERY MODAL ================= */}
      {galleryEvent && activePhoto && (
        <div
          className="office-gallery-backdrop"
          onClick={closeGallery}
          role="presentation"
        >
          <div
            ref={dialogRef}
            className="office-gallery-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-gallery-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-gallery-header">
              <div className="office-gallery-title-wrap">
                <h2 id="office-gallery-title">{galleryEvent.title}</h2>
                <span className="office-gallery-counter">
                  Photo {photoIndex + 1} of {galleryEvent.galleryImages.length}
                </span>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                className="office-gallery-close-btn"
                onClick={closeGallery}
                aria-label="Close photo gallery"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div
              className="office-gallery-stage"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {galleryEvent.galleryImages.length > 1 && (
                <button
                  type="button"
                  className="office-gallery-nav-btn prev"
                  onClick={showPrevPhoto}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} aria-hidden="true" />
                </button>
              )}

              <img
                key={activePhoto.src}
                src={activePhoto.src}
                alt={activePhoto.alt}
                className="office-gallery-main-img"
              />

              {galleryEvent.galleryImages.length > 1 && (
                <button
                  type="button"
                  className="office-gallery-nav-btn next"
                  onClick={showNextPhoto}
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} aria-hidden="true" />
                </button>
              )}
            </div>

            {activePhoto.caption && (
              <div className="office-gallery-caption">{activePhoto.caption}</div>
            )}

            {galleryEvent.galleryImages.length > 1 && (
              <div
                className="office-gallery-thumbs"
                role="tablist"
                aria-label={`${galleryEvent.title} thumbnails`}
              >
                {galleryEvent.galleryImages.map((imgItem, idx) => {
                  const isThumbActive = idx === photoIndex;
                  return (
                    <button
                      key={`${imgItem.src}-${idx}`}
                      type="button"
                      role="tab"
                      aria-selected={isThumbActive}
                      aria-label={`View photo ${idx + 1}: ${imgItem.caption || galleryEvent.title}`}
                      className={`office-gallery-thumb-btn ${isThumbActive ? "active" : ""}`}
                      onClick={() => setPhotoIndex(idx)}
                    >
                      <img src={imgItem.src} alt="" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
