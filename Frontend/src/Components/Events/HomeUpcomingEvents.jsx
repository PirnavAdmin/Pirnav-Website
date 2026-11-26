import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, MapPin, Video } from "lucide-react";
import { buildApiUrl } from "../../config/api";
import EventBannerMedia from "./EventBannerMedia";
import { formatEventDateTime } from "./eventHelpers";
import "./Events.css";

const HomeUpcomingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUpcoming = async () => {
      try {
        const res = await fetch(buildApiUrl("Events?type=upcoming&limit=3"), {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) {
          if (active) setLoaded(true);
          return;
        }
        const data = await res.json();
        if (active) {
          setEvents(Array.isArray(data) ? data : []);
          setLoaded(true);
        }
      } catch {
        if (active) setLoaded(true);
      }
    };
    loadUpcoming();
    return () => {
      active = false;
    };
  }, []);

  if (loaded && events.length === 0) {
    return (
      <section className="home-events-section" aria-labelledby="home-events-heading">
        <div className="home-events-shell">
          <div className="blog-preview-header">
            <div>
              <span className="blog-preview-kicker">Events &amp; Community</span>
              <h2 id="home-events-heading">Upcoming Events</h2>
            </div>
            <Link to="/events" className="blog-preview-viewall">
              Explore Events <ArrowRight size={15} style={{ marginLeft: "0.4rem" }} />
            </Link>
          </div>
          <div className="events-empty-box">
            <h3>Discover What&apos;s Coming Next at PIRNAV</h3>
            <p style={{ marginBottom: "1rem" }}>
              Explore our upcoming webinars, engineering workshops, product launches, and past event highlights.
            </p>
            <Link to="/events" className="event-btn-primary" style={{ display: "inline-flex" }}>
              Visit Events Hub <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-events-section" aria-labelledby="home-events-heading">
      <div className="home-events-shell">
        <div className="blog-preview-header">
          <div>
            <span className="blog-preview-kicker">Events &amp; Community</span>
            <h2 id="home-events-heading">Upcoming Events</h2>
          </div>
          <Link to="/events" className="blog-preview-viewall">
            View All Events <ArrowRight size={15} style={{ marginLeft: "0.4rem" }} />
          </Link>
        </div>

        <div className="events-grid">
          {events.map((ev) => (
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
                <span className="event-card-category">
                  <CalendarDays size={12} style={{ marginRight: "0.3rem" }} />
                  {ev.category}
                </span>
                <h3 className="event-card-title">
                  <Link to={`/events/${ev.slug}`}>{ev.title}</Link>
                </h3>
                <p className="event-card-desc">{ev.shortDescription}</p>

                <div className="event-card-meta">
                  <div className="event-meta-row">
                    <Clock3 size={14} />
                    <span>{formatEventDateTime(ev.startDateTime, ev.endDateTime, ev.timezone)}</span>
                  </div>
                  <div className="event-meta-row">
                    {ev.eventMode === "Online" ? <Video size={14} /> : <MapPin size={14} />}
                    <span>{ev.locationOrPlatform}</span>
                  </div>
                </div>

                <div className="event-card-actions">
                  <Link
                    to={`/events/${ev.slug}?register=1`}
                    className="event-btn-primary"
                  >
                    Register Now <ArrowRight size={15} />
                  </Link>
                  <Link to={`/events/${ev.slug}`} className="event-btn-secondary">
                    Details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeUpcomingEvents;
