import { API_ORIGIN } from "../../config/api";

export const EVENT_CATEGORIES = [
  "Webinars",
  "Workshops",
  "Conferences",
  "Product Launches",
  "Company Events",
  "Campus Events",
];

export const EVENT_MODES = ["Online", "Offline", "Hybrid"];

export const EVENT_STATUSES = ["Draft", "Published", "Cancelled"];

export const ATTENDANCE_STATUSES = ["Registered", "Attended", "NoShow", "Cancelled"];

export const resolveEventMediaUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
};

export const formatEventDate = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatEventDateTime = (startIso, endIso, timezone = "") => {
  if (!startIso) return "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";

  const datePart = start.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: true };
  const startTime = start.toLocaleTimeString("en-IN", timeOpts);

  let endTime = "";
  if (endIso) {
    const end = new Date(endIso);
    if (!Number.isNaN(end.getTime())) {
      endTime = end.toLocaleTimeString("en-IN", timeOpts);
    }
  }

  const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
  return timezone ? `${datePart} • ${timeRange} (${timezone})` : `${datePart} • ${timeRange}`;
};

const CATEGORY_META = {
  Webinars: {
    badge: "Live Webinar",
    tag: "WEB",
    gradient: "linear-gradient(135deg, #061426 0%, #0b4a5e 52%, #0793a8 100%)",
  },
  Workshops: {
    badge: "Hands-On Workshop",
    tag: "WKS",
    gradient: "linear-gradient(135deg, #072038 0%, #0b7286 55%, #16a3b5 100%)",
  },
  Conferences: {
    badge: "Tech Conference",
    tag: "CONF",
    gradient: "linear-gradient(135deg, #0b1f2b 0%, #074c59 55%, #0b7286 100%)",
  },
  "Product Launches": {
    badge: "Product Launch",
    tag: "LNCH",
    gradient: "linear-gradient(135deg, #061426 0%, #0f4c75 52%, #0b7286 100%)",
  },
  "Company Events": {
    badge: "PIRNAV Culture",
    tag: "CORP",
    gradient: "linear-gradient(135deg, #092030 0%, #0b6174 55%, #209eb0 100%)",
  },
  "Campus Events": {
    badge: "Campus Connect",
    tag: "CAMP",
    gradient: "linear-gradient(135deg, #081c2e 0%, #075969 55%, #0d9488 100%)",
  },
};

export const getCategoryMeta = (category = "Webinars") =>
  CATEGORY_META[category] || CATEGORY_META.Webinars;

export const getInitials = (name = "") => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
