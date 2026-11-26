import React from "react";
import {
  Building2,
  CalendarDays,
  Cpu,
  GraduationCap,
  MapPin,
  Presentation,
  Rocket,
  Video,
  Wrench,
} from "lucide-react";
import { getCategoryMeta, resolveEventMediaUrl } from "./eventHelpers";

const renderCategoryIcon = (category) => {
  switch (category) {
    case "Workshops":
      return <Wrench size={20} />;
    case "Conferences":
      return <Presentation size={20} />;
    case "Product Launches":
      return <Rocket size={20} />;
    case "Company Events":
      return <Building2 size={20} />;
    case "Campus Events":
      return <GraduationCap size={20} />;
    case "Webinars":
    default:
      return <Cpu size={20} />;
  }
};

const EventBannerMedia = ({
  bannerImageUrl,
  title,
  category,
  eventMode,
  isPast = false,
  className = "",
}) => {
  const resolvedUrl = resolveEventMediaUrl(bannerImageUrl);
  const meta = getCategoryMeta(category);

  return (
    <div className={`event-media-frame ${className}`.trim()}>
      {resolvedUrl ? (
        <img src={resolvedUrl} alt={title || "PIRNAV Event Banner"} loading="lazy" />
      ) : (
        <div className="event-placeholder-art" style={{ background: meta.gradient }}>
          <div className="event-placeholder-top">
            <span className="event-placeholder-tag">{meta.badge}</span>
            <span className="event-placeholder-brand">PIRNAV EVENTS</span>
          </div>
          <div className="event-placeholder-center">
            <p className="event-placeholder-title">{title || "PIRNAV Event"}</p>
            <span className="event-placeholder-icon-wrap" aria-hidden="true">
              {renderCategoryIcon(category)}
            </span>
          </div>
        </div>
      )}

      {(eventMode || isPast) && (
        <div className="event-media-badges">
          {eventMode && (
            <span className="event-mode-pill">
              {eventMode === "Online" ? <Video size={12} /> : <MapPin size={12} />}
              {eventMode}
            </span>
          )}
          {isPast && (
            <span className="event-mode-pill">
              <CalendarDays size={12} /> Past Event
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EventBannerMedia;
