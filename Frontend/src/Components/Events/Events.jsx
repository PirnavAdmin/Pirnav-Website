import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
  MapPin,
  PlayCircle,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { buildApiUrl } from "../../config/api";
import EventBannerMedia from "./EventBannerMedia";
import {
  EVENT_CATEGORIES,
  formatEventDate,
  formatEventDateTime,
} from "./eventHelpers";
import "./Events.css";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(buildApiUrl("Events?type=all"), {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) {
          throw new Error("Unable to load events right now.");
        }
        const data = await res.json();
        if (active) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err?.message || "Failed to fetch events.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchEvents();
    return () => {
      active = false;
    };
  }, []);

  const { upcomingEvents, pastEvents, featuredEvent } = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchesFilters = (ev) => {
      if (selectedCategory !== "All" && ev.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      return (
        ev.title?.toLowerCase().includes(query) ||
        ev.shortDescription?.toLowerCase().includes(query) ||
        ev.category?.toLowerCase().includes(query) ||
        ev.locationOrPlatform?.toLowerCase().includes(query)
      );
    };

    const allUpcoming = events
      .filter((e) => !e.isPast)
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    const allPast = events
      .filter((e) => e.isPast)
      .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

    const heroFeatured =
      allUpcoming.find((e) => e.isFeatured) ||
      allUpcoming[0] ||
      allPast[0] ||
      null;

    return {
      upcomingEvents: allUpcoming.filter(matchesFilters),
      pastEvents: allPast.filter(matchesFilters),
      featuredEvent: heroFeatured,
    };
  }, [events, selectedCategory, searchTerm]);

  const totalUpcomingCount = useMemo(
    () => events.filter((e) => !e.isPast).length,
    [events]
  );
  const totalPastCount = useMemo(
    () => events.filter((e) => e.isPast).length,
    [events]
  );

  const getUpcomingCtaLabel = (ev) => {
    if (!ev.isRegistrationOpen) return "Registration Closed";
    if (ev.maxAttendees && ev.registeredCount >= ev.maxAttendees) {
      return "Capacity Full";
    }
    return "Register Now";
  };

  return (
    <div className="events-page">
      {/* ================= HERO SECTION ================= */}
      <section className="events-hero">
        <div className="events-hero-shell">
          <div className="events-hero-copy">
            <span className="events-kicker">
              <Sparkles size={14} /> Upcoming Events
            </span>
            <h1>Discover what&apos;s happening at PIRNAV</h1>
            <p className="events-hero-subtitle">
              Join our engineering leaders, product architects, and community for
              live webinars, hands-on full-stack workshops, conferences, product
              launches, and campus tech sessions.
            </p>

            <div className="events-hero-stats">
              <div className="events-hero-stat">
                <strong>{totalUpcomingCount}</strong>
                <span>Upcoming Events</span>
              </div>
              <div className="events-hero-stat">
                <strong>{totalPastCount}</strong>
                <span>Past Highlights</span>
              </div>
              <div className="events-hero-stat">
                <strong>{EVENT_CATEGORIES.length}</strong>
                <span>Event Tracks</span>
              </div>
            </div>
          </div>

          {featuredEvent && (
            <article className="events-featured-card">
              <EventBannerMedia
                bannerImageUrl={featuredEvent.bannerImageUrl}
                title={featuredEvent.title}
                category={featuredEvent.category}
                eventMode={featuredEvent.eventMode}
                isPast={featuredEvent.isPast}
              />
              <div className="events-featured-body">
                <div className="events-featured-top">
                  <span className="events-featured-pill">
                    {featuredEvent.isPast ? "Featured Past Event" : "Featured Event"} •{" "}
                    {featuredEvent.category}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#526879", fontWeight: 600 }}>
                    {formatEventDate(featuredEvent.startDateTime)}
                  </span>
                </div>
                <h2>{featuredEvent.title}</h2>
                <p>{featuredEvent.shortDescription}</p>
                <div className="events-featured-actions">
                  {!featuredEvent.isPast ? (
                    <Link
                      to={`/events/${featuredEvent.slug}?register=1`}
                      className="event-btn-primary"
                    >
                      {getUpcomingCtaLabel(featuredEvent)} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <Link
                      to={`/events/${featuredEvent.slug}#highlights`}
                      className="event-btn-primary"
                    >
                      View Highlights <ArrowRight size={15} />
                    </Link>
                  )}
                  <Link
                    to={`/events/${featuredEvent.slug}`}
                    className="event-btn-secondary"
                  >
                    Event Details
                  </Link>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <div className="events-container">
        {/* Category & Search Toolbar */}
        <div className="events-toolbar" role="region" aria-label="Event filters">
          <div className="events-category-tabs">
            {["All", ...EVENT_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`events-cat-tab ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="events-search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search events, topics, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search events"
            />
          </div>
        </div>

        {loading && (
          <div className="events-empty-box">
            <h3>Loading PIRNAV Events...</h3>
            <p>Fetching upcoming sessions and past event highlights.</p>
          </div>
        )}

        {!loading && error && (
          <div className="events-empty-box">
            <h3>Could not load events</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ================= UPCOMING EVENTS ================= */}
            <section className="events-section" aria-labelledby="upcoming-events-heading">
              <div className="events-section-header">
                <div>
                  <span className="events-section-eyebrow">Live Schedule</span>
                  <h2 id="upcoming-events-heading">Upcoming Events</h2>
                  <p>Reserve your seat for upcoming sessions, launches, and workshops.</p>
                </div>
                <span className="events-count-pill">
                  {upcomingEvents.length} {upcomingEvents.length === 1 ? "Event" : "Events"}
                </span>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="events-empty-box">
                  <h3>No upcoming events match this filter</h3>
                  <p>
                    Try switching categories or clearing your search query to view all scheduled events.
                  </p>
                </div>
              ) : (
                <div className="events-grid">
                  {upcomingEvents.map((ev) => {
                    const isClosedOrFull =
                      !ev.isRegistrationOpen ||
                      (ev.maxAttendees && ev.registeredCount >= ev.maxAttendees);

                    return (
                      <article key={ev.id} className="event-card">
                        <Link to={`/events/${ev.slug}`} style={{ textDecoration: "none" }}>
                          <EventBannerMedia
                            bannerImageUrl={ev.bannerImageUrl}
                            title={ev.title}
                            category={ev.category}
                            eventMode={ev.eventMode}
                          />
                        </Link>
                        <div className="event-card-body">
                          <span className="event-card-category">{ev.category}</span>
                          <h3 className="event-card-title">
                            <Link to={`/events/${ev.slug}`}>{ev.title}</Link>
                          </h3>
                          <p className="event-card-desc">{ev.shortDescription}</p>

                          <div className="event-card-meta">
                            <div className="event-meta-row">
                              <Clock3 size={14} />
                              <span>
                                {formatEventDateTime(ev.startDateTime, ev.endDateTime, ev.timezone)}
                              </span>
                            </div>
                            <div className="event-meta-row">
                              {ev.eventMode === "Online" ? <Video size={14} /> : <MapPin size={14} />}
                              <span>{ev.locationOrPlatform}</span>
                            </div>
                            {ev.maxAttendees ? (
                              <div className="event-meta-row">
                                <Users size={14} />
                                <span>
                                  {Math.max(0, ev.maxAttendees - ev.registeredCount)} of{" "}
                                  {ev.maxAttendees} spots remaining
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="event-card-actions">
                            <Link
                              to={`/events/${ev.slug}${isClosedOrFull ? "" : "?register=1"}`}
                              className="event-btn-primary"
                            >
                              {getUpcomingCtaLabel(ev)} <ArrowRight size={15} />
                            </Link>
                            <Link to={`/events/${ev.slug}`} className="event-btn-secondary">
                              Details
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ================= PAST EVENTS ================= */}
            <section
              className="events-section events-past-divider"
              aria-labelledby="past-events-heading"
            >
              <div className="events-section-header">
                <div>
                  <span className="events-section-eyebrow">Archive &amp; Highlights</span>
                  <h2 id="past-events-heading">Past Events</h2>
                  <p>
                    Explore previous event summaries, photo galleries, key takeaways, and recorded sessions.
                  </p>
                </div>
                <span className="events-count-pill">
                  {pastEvents.length} {pastEvents.length === 1 ? "Past Event" : "Past Events"}
                </span>
              </div>

              {pastEvents.length === 0 ? (
                <div className="events-empty-box">
                  <h3>No past events match this filter</h3>
                  <p>Past event highlights and galleries will appear here after sessions conclude.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {pastEvents.map((ev) => (
                    <article key={ev.id} className="event-card">
                      <Link to={`/events/${ev.slug}#highlights`} style={{ textDecoration: "none" }}>
                        <EventBannerMedia
                          bannerImageUrl={ev.bannerImageUrl}
                          title={ev.title}
                          category={ev.category}
                          eventMode={ev.eventMode}
                          isPast
                        />
                      </Link>
                      <div className="event-card-body">
                        <span className="event-card-category past">{ev.category}</span>
                        <h3 className="event-card-title">
                          <Link to={`/events/${ev.slug}#highlights`}>{ev.title}</Link>
                        </h3>
                        <p className="event-card-desc">
                          {ev.highlightsSummary || ev.shortDescription}
                        </p>

                        <div className="event-card-meta">
                          <div className="event-meta-row">
                            <CalendarDays size={14} />
                            <span>Held on {formatEventDate(ev.startDateTime)}</span>
                          </div>
                          <div className="event-meta-row">
                            <ImageIcon size={14} />
                            <span>
                              {ev.galleryCount || 0} Gallery{" "}
                              {ev.galleryCount === 1 ? "Item" : "Items"}
                              {ev.recordingUrl ? " • Recording Available" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="event-card-actions">
                          <Link
                            to={`/events/${ev.slug}#highlights`}
                            className="event-btn-primary"
                          >
                            {ev.recordingUrl ? (
                              <>
                                <PlayCircle size={15} /> View Highlights &amp; Recording
                              </>
                            ) : (
                              <>
                                View Highlights <ArrowRight size={15} />
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Events;
