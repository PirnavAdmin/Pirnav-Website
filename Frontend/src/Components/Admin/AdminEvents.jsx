import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { buildApiUrl } from "../../config/api";
import {
  EVENT_CATEGORIES,
  EVENT_MODES,
  EVENT_STATUSES,
  formatEventDateTime,
  getInitials,
  resolveEventMediaUrl,
} from "../Events/eventHelpers";

const toLocalInputValue = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const defaultFormState = () => {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  start.setHours(11, 0, 0, 0);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  return {
    title: "",
    slug: "",
    category: "Webinars",
    shortDescription: "",
    description: "",
    eventMode: "Online",
    locationOrPlatform: "Zoom Live Webinar",
    meetingLink: "",
    startDateTime: toLocalInputValue(start.toISOString()),
    endDateTime: toLocalInputValue(end.toISOString()),
    timezone: "IST (UTC+05:30)",
    bannerImageUrl: "",
    status: "Published",
    isFeatured: false,
    isRegistrationOpen: true,
    maxAttendees: "",
    whoShouldAttend: "",
    highlightsSummary: "",
    recordingUrl: "",
    agendaItems: [],
    speakers: [],
  };
};

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    published: 0,
    upcoming: 0,
    past: 0,
    drafts: 0,
    totalRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [pendingBannerFile, setPendingBannerFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [mediaModalEvent, setMediaModalEvent] = useState(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [videoForm, setVideoForm] = useState({ mediaUrl: "", caption: "" });

  const token = localStorage.getItem("adminToken");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(buildApiUrl(`Admin/Events?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!res.ok) throw new Error("Failed to load events.");
      const data = await res.json();
      setSummary(data.summary || {});
      const list = Array.isArray(data.items) ? data.items : [];
      setEvents(list);
      setMediaModalEvent((prev) =>
        prev ? list.find((item) => item.id === prev.id) || null : null
      );
    } catch (err) {
      setError(err?.message || "Unable to load admin events.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchTerm, token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormState(defaultFormState());
    setPendingBannerFile(null);
    setFormError("");
    setEditorOpen(true);
  };

  const openEditModal = (ev) => {
    let parsedAgenda = [];
    if (ev.agendaJson) {
      try {
        parsedAgenda = JSON.parse(ev.agendaJson) || [];
      } catch {
        parsedAgenda = [];
      }
    }
    setEditingId(ev.id);
    setPendingBannerFile(null);
    setFormError("");
    setFormState({
      title: ev.title || "",
      slug: ev.slug || "",
      category: ev.category || "Webinars",
      shortDescription: ev.shortDescription || "",
      description: ev.description || "",
      eventMode: ev.eventMode || "Online",
      locationOrPlatform: ev.locationOrPlatform || "",
      meetingLink: ev.meetingLink || "",
      startDateTime: toLocalInputValue(ev.startDateTime),
      endDateTime: toLocalInputValue(ev.endDateTime),
      timezone: ev.timezone || "IST (UTC+05:30)",
      bannerImageUrl: ev.bannerImageUrl || "",
      status: ev.status || "Published",
      isFeatured: Boolean(ev.isFeatured),
      isRegistrationOpen: Boolean(ev.isRegistrationOpen),
      maxAttendees: ev.maxAttendees ?? "",
      whoShouldAttend: ev.whoShouldAttend || "",
      highlightsSummary: ev.highlightsSummary || "",
      recordingUrl: ev.recordingUrl || "",
      agendaItems: parsedAgenda.map((a) => ({
        time: a.time || a.Time || "",
        title: a.title || a.Title || "",
        speaker: a.speaker || a.Speaker || "",
        description: a.description || a.Description || "",
      })),
      speakers: Array.isArray(ev.speakers)
        ? ev.speakers.map((s) => ({
            id: s.id,
            name: s.name || "",
            roleTitle: s.roleTitle || "",
            organization: s.organization || "",
            bio: s.bio || "",
            photoUrl: s.photoUrl || "",
            displayOrder: s.displayOrder || 1,
          }))
        : [],
    });
    setEditorOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.shortDescription.trim() || !formState.description.trim()) {
      setFormError("Title, short description, and full description are required.");
      return;
    }
    if (!formState.startDateTime || !formState.endDateTime) {
      setFormError("Start and End date/time are required.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      title: formState.title.trim(),
      slug: formState.slug.trim() || null,
      category: formState.category,
      shortDescription: formState.shortDescription.trim(),
      description: formState.description.trim(),
      eventMode: formState.eventMode,
      locationOrPlatform: formState.locationOrPlatform.trim(),
      meetingLink: formState.meetingLink.trim() || null,
      startDateTime: new Date(formState.startDateTime).toISOString(),
      endDateTime: new Date(formState.endDateTime).toISOString(),
      timezone: formState.timezone.trim() || "IST (UTC+05:30)",
      bannerImageUrl: formState.bannerImageUrl.trim() || null,
      status: formState.status,
      isFeatured: Boolean(formState.isFeatured),
      isRegistrationOpen: Boolean(formState.isRegistrationOpen),
      maxAttendees: formState.maxAttendees ? Number(formState.maxAttendees) : null,
      whoShouldAttend: formState.whoShouldAttend.trim() || null,
      highlightsSummary: formState.highlightsSummary.trim() || null,
      recordingUrl: formState.recordingUrl.trim() || null,
      agendaItems: formState.agendaItems.filter((a) => a.title.trim()),
      speakers: formState.speakers
        .filter((s) => s.name.trim())
        .map((s, idx) => ({
          id: s.id || null,
          name: s.name.trim(),
          roleTitle: s.roleTitle.trim(),
          organization: s.organization.trim() || null,
          bio: s.bio.trim() || null,
          photoUrl: s.photoUrl.trim() || null,
          displayOrder: idx + 1,
        })),
    };

    try {
      const url = editingId ? buildApiUrl(`Admin/Events/${editingId}`) : buildApiUrl("Admin/Events");
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.message || "Failed to save event.");
        return;
      }

      const savedId = editingId || data.id;
      if (pendingBannerFile && savedId) {
        const fd = new FormData();
        fd.append("file", pendingBannerFile);
        await fetch(buildApiUrl(`Admin/Events/${savedId}/banner`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      setEditorOpen(false);
      showToast(editingId ? "Event updated successfully." : "Event created successfully.");
      await loadEvents();
    } catch {
      setFormError("Network error while saving event.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPublishToggle = async (ev, nextStatus, nextRegOpen) => {
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/${ev.id}/publish`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus ?? ev.status,
          isRegistrationOpen:
            typeof nextRegOpen === "boolean" ? nextRegOpen : ev.isRegistrationOpen,
        }),
      });
      if (res.ok) {
        showToast("Event visibility updated.");
        loadEvents();
      }
    } catch {
      // handled silently
    }
  };

  const handleDeleteEvent = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}" and all its speakers/gallery/registrations?`)) {
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/${ev.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Event deleted.");
        loadEvents();
      }
    } catch {
      // handled silently
    }
  };

  const handleBannerUpload = async (eventId, file) => {
    if (!file) return;
    setMediaBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl(`Admin/Events/${eventId}/banner`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("Event banner uploaded.");
        setFormState((prev) =>
          editingId === eventId ? { ...prev, bannerImageUrl: data.bannerImageUrl || "" } : prev
        );
        await loadEvents();
      } else {
        alert(data?.message || "Banner upload failed.");
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleBannerClear = async (eventId) => {
    setMediaBusy(true);
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/${eventId}/banner`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Banner removed (reverted to themed placeholder).");
        setFormState((prev) =>
          editingId === eventId ? { ...prev, bannerImageUrl: "" } : prev
        );
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleSpeakerPhotoUpload = async (eventId, speakerId, file) => {
    if (!file) return;
    setMediaBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl(`Admin/Events/${eventId}/speakers/${speakerId}/photo`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        showToast("Speaker photo updated.");
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleSpeakerPhotoClear = async (eventId, speakerId) => {
    setMediaBusy(true);
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/${eventId}/speakers/${speakerId}/photo`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Speaker photo cleared.");
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleGalleryUpload = async (eventId, file) => {
    if (!file) return;
    setMediaBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (galleryCaption.trim()) fd.append("caption", galleryCaption.trim());
      const res = await fetch(buildApiUrl(`Admin/Events/${eventId}/gallery`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        setGalleryCaption("");
        showToast("Gallery image uploaded.");
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!mediaModalEvent || !videoForm.mediaUrl.trim()) return;
    setMediaBusy(true);
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/${mediaModalEvent.id}/gallery/video`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaUrl: videoForm.mediaUrl.trim(),
          caption: videoForm.caption.trim() || null,
        }),
      });
      if (res.ok) {
        setVideoForm({ mediaUrl: "", caption: "" });
        showToast("Video link added to event gallery.");
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const handleDeleteGalleryItem = async (mediaId) => {
    setMediaBusy(true);
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/gallery/${mediaId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Gallery item deleted.");
        await loadEvents();
      }
    } finally {
      setMediaBusy(false);
    }
  };

  return (
    <div className="messages-wrapper">
      <div className="messages-header">
        <div>
          <h1>Events Management</h1>
          <p style={{ margin: "4px 0 0", color: "#526879", fontSize: "14px" }}>
            Create, publish, upload/replace event banners, manage speakers, and organize past event galleries.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/admin/event-registrations" className="event-admin-btn">
            <Users size={15} /> All Registrations ({summary.totalRegistrations || 0})
          </Link>
          <button type="button" className="event-admin-btn primary" onClick={openCreateModal}>
            <Plus size={16} /> Create Event
          </button>
        </div>
      </div>

      {toast && (
        <div
          style={{
            marginBottom: "14px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "#e6fcf5",
            border: "1px solid #96f2d7",
            color: "#087f5b",
            fontWeight: 600,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* KPI Cards */}
      <div className="demo-kpi-grid" style={{ marginBottom: "18px" }}>
        <button
          type="button"
          className={`demo-kpi-card ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="stat-header">
            <span>Total Events</span>
            <Sparkles size={18} color="#0b7286" />
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "28px", color: "#102238" }}>{summary.total || 0}</strong>
            <span className="stat-trend">{summary.drafts || 0} Draft(s)</span>
          </div>
        </button>

        <button
          type="button"
          className={`demo-kpi-card ${statusFilter === "Published" ? "active" : ""}`}
          onClick={() => setStatusFilter("Published")}
        >
          <div className="stat-header">
            <span>Published</span>
            <CheckCircle2 size={18} color="#087f5b" />
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "28px", color: "#102238" }}>{summary.published || 0}</strong>
            <span className="stat-trend">Live on website</span>
          </div>
        </button>

        <div className="demo-kpi-card" style={{ cursor: "default" }}>
          <div className="stat-header">
            <span>Upcoming / Past</span>
            <CalendarDays size={18} color="#0b7286" />
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "28px", color: "#102238" }}>
              {summary.upcoming || 0} / {summary.past || 0}
            </strong>
            <span className="stat-trend">Active vs Archive</span>
          </div>
        </div>

        <Link to="/admin/event-registrations" className="demo-kpi-card" style={{ textDecoration: "none" }}>
          <div className="stat-header">
            <span>Registrations</span>
            <Users size={18} color="#0b7286" />
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "28px", color: "#102238" }}>
              {summary.totalRegistrations || 0}
            </strong>
            <span className="stat-trend">Click to manage attendance</span>
          </div>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="demo-filter-bar" style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative", flex: "1 1 250px" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
          />
          <input
            type="search"
            placeholder="Search by title, slug, venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              minHeight: "44px",
              padding: "0 12px 0 36px",
              borderRadius: "12px",
              border: "1px solid #dbe4ec",
              background: "#ffffff",
            }}
          />
        </div>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {EVENT_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="demo-table-card" style={{ padding: "24px" }}>Loading events...</div>}
      {!loading && error && (
        <div className="demo-table-card" style={{ padding: "24px", color: "#c92a2a" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="demo-table-card">
          <table className="demo-leads-table">
            <thead>
              <tr>
                <th>Banner &amp; Event</th>
                <th>Schedule &amp; Mode</th>
                <th>Status &amp; Registration</th>
                <th>Registrations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#526879" }}>
                    No events found. Click &ldquo;Create Event&rdquo; to add your first event.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const bannerUrl = resolveEventMediaUrl(ev.bannerImageUrl);
                  return (
                    <tr key={ev.id}>
                      <td>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <div className="event-admin-thumb">
                            {bannerUrl ? (
                              <img src={bannerUrl} alt={ev.title} />
                            ) : (
                              <div className="event-admin-thumb-placeholder">Placeholder</div>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: "#102238", display: "block" }}>{ev.title}</strong>
                            <small style={{ color: "#526879" }}>
                              {ev.category} • /{ev.slug}
                              {ev.isFeatured ? " • Featured" : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", color: "#102238" }}>
                          {formatEventDateTime(ev.startDateTime, ev.endDateTime, ev.timezone)}
                        </div>
                        <small style={{ color: "#526879" }}>
                          {ev.eventMode} — {ev.locationOrPlatform}
                        </small>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            <span className={`event-admin-pill ${ev.status.toLowerCase()}`}>
                              {ev.status}
                            </span>
                            {ev.isPast && <span className="event-admin-pill past">Past</span>}
                          </div>
                          <button
                            type="button"
                            className="event-admin-btn"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                            onClick={() => handleQuickPublishToggle(ev, ev.status, !ev.isRegistrationOpen)}
                          >
                            {ev.isRegistrationOpen ? "Registration: Open" : "Registration: Closed"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/admin/event-registrations?eventId=${ev.id}`}
                          className="event-admin-btn"
                        >
                          <Users size={13} />
                          {ev.registeredCount || 0}
                          {ev.maxAttendees ? ` / ${ev.maxAttendees}` : ""}
                        </Link>
                      </td>
                      <td>
                        <div className="event-admin-actions">
                          <button
                            type="button"
                            className="event-admin-btn"
                            onClick={() => openEditModal(ev)}
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="event-admin-btn"
                            onClick={() => setMediaModalEvent(ev)}
                          >
                            <ImageIcon size={13} /> Images &amp; Gallery
                          </button>
                          {ev.status !== "Published" ? (
                            <button
                              type="button"
                              className="event-admin-btn primary"
                              onClick={() => handleQuickPublishToggle(ev, "Published")}
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="event-admin-btn"
                              onClick={() => handleQuickPublishToggle(ev, "Draft")}
                            >
                              Set Draft
                            </button>
                          )}
                          <a
                            href={`/events/${ev.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="event-admin-btn"
                            title="Preview Public Page"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            type="button"
                            className="event-admin-btn danger"
                            onClick={() => handleDeleteEvent(ev)}
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= CREATE / EDIT EVENT MODAL ================= */}
      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="modal job-modal event-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0 }}>{editingId ? "Edit Event" : "Create New Event"}</h2>
              <button type="button" className="modal-close-icon" onClick={() => setEditorOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#fff5f5",
                  border: "1px solid #ffc9c9",
                  color: "#c92a2a",
                  marginBottom: "12px",
                  fontSize: "13px",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEvent}>
              <div className="event-admin-form-grid">
                <div className="admin-form-field">
                  <label>Event Title *</label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. AI in Modern Business Webinar"
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label>URL Slug (auto-generated if blank)</label>
                  <input
                    type="text"
                    value={formState.slug}
                    onChange={(e) => setFormState((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="ai-in-modern-business-2026"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState((p) => ({ ...p, category: e.target.value }))}
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-field">
                  <label>Event Mode *</label>
                  <select
                    value={formState.eventMode}
                    onChange={(e) => setFormState((p) => ({ ...p, eventMode: e.target.value }))}
                  >
                    {EVENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-field">
                  <label>Venue / Online Platform *</label>
                  <input
                    type="text"
                    value={formState.locationOrPlatform}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, locationOrPlatform: e.target.value }))
                    }
                    placeholder="Hyderabad Campus / Zoom Live"
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label>Meeting Link (sent/stored for online/hybrid)</label>
                  <input
                    type="text"
                    value={formState.meetingLink}
                    onChange={(e) => setFormState((p) => ({ ...p, meetingLink: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div className="admin-form-field">
                  <label>Start Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={formState.startDateTime}
                    onChange={(e) => setFormState((p) => ({ ...p, startDateTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label>End Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={formState.endDateTime}
                    onChange={(e) => setFormState((p) => ({ ...p, endDateTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label>Timezone</label>
                  <input
                    type="text"
                    value={formState.timezone}
                    onChange={(e) => setFormState((p) => ({ ...p, timezone: e.target.value }))}
                  />
                </div>

                <div className="admin-form-field">
                  <label>Max Attendees (leave blank for unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    value={formState.maxAttendees}
                    onChange={(e) => setFormState((p) => ({ ...p, maxAttendees: e.target.value }))}
                    placeholder="e.g. 250"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Publish Status</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value }))}
                  >
                    {EVENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-field" style={{ display: "flex", gap: "18px", alignItems: "center", paddingTop: "22px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={formState.isFeatured}
                      onChange={(e) => setFormState((p) => ({ ...p, isFeatured: e.target.checked }))}
                      style={{ width: "auto" }}
                    />
                    Featured Event
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={formState.isRegistrationOpen}
                      onChange={(e) =>
                        setFormState((p) => ({ ...p, isRegistrationOpen: e.target.checked }))
                      }
                      style={{ width: "auto" }}
                    />
                    Registration Open
                  </label>
                </div>
              </div>

              <div className="admin-form-field" style={{ marginTop: "10px" }}>
                <label>Short Description *</label>
                <input
                  type="text"
                  value={formState.shortDescription}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, shortDescription: e.target.value }))
                  }
                  placeholder="Concise 1-2 line card summary"
                  required
                />
              </div>

              <div className="admin-form-field" style={{ marginTop: "10px" }}>
                <label>Full Event Description *</label>
                <textarea
                  rows={4}
                  value={formState.description}
                  onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed overview, learning outcomes, and session highlights..."
                  required
                />
              </div>

              <div className="event-admin-form-grid" style={{ marginTop: "10px" }}>
                <div className="admin-form-field">
                  <label>Who Should Attend?</label>
                  <textarea
                    rows={2}
                    value={formState.whoShouldAttend}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, whoShouldAttend: e.target.value }))
                    }
                    placeholder="CTOs, Engineering Leads, Students, Cloud Architects..."
                  />
                </div>
                <div className="admin-form-field">
                  <label>Recording URL (for past events)</label>
                  <input
                    type="text"
                    value={formState.recordingUrl}
                    onChange={(e) => setFormState((p) => ({ ...p, recordingUrl: e.target.value }))}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>

              <div className="admin-form-field" style={{ marginTop: "10px" }}>
                <label>Past Event Highlights Summary</label>
                <textarea
                  rows={2}
                  value={formState.highlightsSummary}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, highlightsSummary: e.target.value }))
                  }
                  placeholder="Key takeaways and impact once the event concludes..."
                />
              </div>

              {/* Banner Image Upload / Placeholder Note */}
              <div className="event-admin-subcard">
                <div className="event-admin-subcard-head">
                  <strong>Event Banner Image (optional — uses PIRNAV placeholder if empty)</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (editingId) {
                        handleBannerUpload(editingId, file);
                      } else {
                        setPendingBannerFile(file);
                      }
                    }}
                  />
                  {editingId && formState.bannerImageUrl && (
                    <button
                      type="button"
                      className="event-admin-btn danger"
                      onClick={() => handleBannerClear(editingId)}
                    >
                      Remove Banner
                    </button>
                  )}
                  {pendingBannerFile && <small>Selected: {pendingBannerFile.name}</small>}
                </div>
              </div>

              {/* Agenda Builder */}
              <div className="event-admin-subcard">
                <div className="event-admin-subcard-head">
                  <strong>Agenda / Schedule ({formState.agendaItems.length})</strong>
                  <button
                    type="button"
                    className="event-admin-btn"
                    onClick={() =>
                      setFormState((p) => ({
                        ...p,
                        agendaItems: [
                          ...p.agendaItems,
                          { time: "", title: "", speaker: "", description: "" },
                        ],
                      }))
                    }
                  >
                    <Plus size={13} /> Add Session
                  </button>
                </div>
                {formState.agendaItems.map((item, idx) => (
                  <div key={idx} className="event-admin-subrow">
                    <input
                      type="text"
                      placeholder="Time (e.g. 11:00 AM)"
                      value={item.time}
                      onChange={(e) => {
                        const next = [...formState.agendaItems];
                        next[idx] = { ...next[idx], time: e.target.value };
                        setFormState((p) => ({ ...p, agendaItems: next }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Session Title"
                      value={item.title}
                      onChange={(e) => {
                        const next = [...formState.agendaItems];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setFormState((p) => ({ ...p, agendaItems: next }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Speaker (optional)"
                      value={item.speaker}
                      onChange={(e) => {
                        const next = [...formState.agendaItems];
                        next[idx] = { ...next[idx], speaker: e.target.value };
                        setFormState((p) => ({ ...p, agendaItems: next }));
                      }}
                    />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Short notes"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...formState.agendaItems];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setFormState((p) => ({ ...p, agendaItems: next }));
                        }}
                      />
                      <button
                        type="button"
                        className="event-admin-btn danger"
                        onClick={() =>
                          setFormState((p) => ({
                            ...p,
                            agendaItems: p.agendaItems.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Speakers Builder */}
              <div className="event-admin-subcard">
                <div className="event-admin-subcard-head">
                  <strong>Speakers ({formState.speakers.length})</strong>
                  <button
                    type="button"
                    className="event-admin-btn"
                    onClick={() =>
                      setFormState((p) => ({
                        ...p,
                        speakers: [
                          ...p.speakers,
                          { name: "", roleTitle: "", organization: "PIRNAV Software", bio: "", photoUrl: "" },
                        ],
                      }))
                    }
                  >
                    <Plus size={13} /> Add Speaker
                  </button>
                </div>
                {formState.speakers.map((sp, idx) => (
                  <div key={idx} className="event-admin-subrow">
                    <input
                      type="text"
                      placeholder="Speaker Name"
                      value={sp.name}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setFormState((p) => ({ ...p, speakers: next }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Role Title (e.g. Principal Architect)"
                      value={sp.roleTitle}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], roleTitle: e.target.value };
                        setFormState((p) => ({ ...p, speakers: next }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Organization"
                      value={sp.organization}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], organization: e.target.value };
                        setFormState((p) => ({ ...p, speakers: next }));
                      }}
                    />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Short bio"
                        value={sp.bio}
                        onChange={(e) => {
                          const next = [...formState.speakers];
                          next[idx] = { ...next[idx], bio: e.target.value };
                          setFormState((p) => ({ ...p, speakers: next }));
                        }}
                      />
                      <button
                        type="button"
                        className="event-admin-btn danger"
                        onClick={() =>
                          setFormState((p) => ({
                            ...p,
                            speakers: p.speakers.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="event-admin-btn" onClick={() => setEditorOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="event-admin-btn primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MEDIA, SPEAKER PHOTOS & GALLERY MODAL ================= */}
      {mediaModalEvent && (
        <div className="modal-overlay" onClick={() => setMediaModalEvent(null)}>
          <div className="modal job-modal event-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h2 style={{ margin: 0 }}>Images &amp; Gallery Manager</h2>
                <small style={{ color: "#526879" }}>{mediaModalEvent.title}</small>
              </div>
              <button type="button" className="modal-close-icon" onClick={() => setMediaModalEvent(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Banner Upload / Replace / Remove */}
            <div className="event-admin-subcard">
              <div className="event-admin-subcard-head">
                <strong>Event Banner Image</strong>
                {mediaModalEvent.bannerImageUrl && (
                  <button
                    type="button"
                    className="event-admin-btn danger"
                    disabled={mediaBusy}
                    onClick={() => handleBannerClear(mediaModalEvent.id)}
                  >
                    <Trash2 size={13} /> Clear Banner (Use Placeholder)
                  </button>
                )}
              </div>
              <div className="event-media-preview-banner">
                {mediaModalEvent.bannerImageUrl ? (
                  <img
                    src={resolveEventMediaUrl(mediaModalEvent.bannerImageUrl)}
                    alt={mediaModalEvent.title}
                  />
                ) : (
                  <div className="event-admin-thumb-placeholder" style={{ height: "130px", fontSize: "13px" }}>
                    Currently showing PIRNAV themed placeholder artwork. Upload a JPG/PNG/WEBP image below to replace it.
                  </div>
                )}
              </div>
              <label className="event-admin-btn primary" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Upload / Replace Banner
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  disabled={mediaBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBannerUpload(mediaModalEvent.id, file);
                  }}
                />
              </label>
            </div>

            {/* Speaker Photos */}
            <div className="event-admin-subcard">
              <div className="event-admin-subcard-head">
                <strong>Speaker Photos ({mediaModalEvent.speakers?.length || 0})</strong>
              </div>
              {!mediaModalEvent.speakers || mediaModalEvent.speakers.length === 0 ? (
                <p style={{ margin: 0, fontSize: "13px", color: "#526879" }}>
                  No speakers added yet. Edit this event to add speakers first.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {mediaModalEvent.speakers.map((sp) => (
                    <div
                      key={sp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #e1ebf2",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="event-speaker-avatar" style={{ width: "44px", height: "44px", fontSize: "14px" }}>
                          {sp.photoUrl ? (
                            <img src={resolveEventMediaUrl(sp.photoUrl)} alt={sp.name} />
                          ) : (
                            <span>{getInitials(sp.name)}</span>
                          )}
                        </div>
                        <div>
                          <strong style={{ display: "block", fontSize: "13.5px" }}>{sp.name}</strong>
                          <small style={{ color: "#526879" }}>{sp.roleTitle}</small>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <label className="event-admin-btn" style={{ cursor: "pointer" }}>
                          <Upload size={13} /> Upload Photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            hidden
                            disabled={mediaBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSpeakerPhotoUpload(mediaModalEvent.id, sp.id, file);
                            }}
                          />
                        </label>
                        {sp.photoUrl && (
                          <button
                            type="button"
                            className="event-admin-btn danger"
                            disabled={mediaBusy}
                            onClick={() => handleSpeakerPhotoClear(mediaModalEvent.id, sp.id)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Event Gallery */}
            <div className="event-admin-subcard">
              <div className="event-admin-subcard-head">
                <strong>Event Gallery Photos &amp; Videos ({mediaModalEvent.galleryItems?.length || 0})</strong>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Optional image caption"
                  value={galleryCaption}
                  onChange={(e) => setGalleryCaption(e.target.value)}
                  style={{ flex: "1 1 220px", padding: "8px 10px", borderRadius: "8px", border: "1px solid #d5e4ec" }}
                />
                <label className="event-admin-btn primary" style={{ cursor: "pointer" }}>
                  <ImageIcon size={14} /> Upload Gallery Photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={mediaBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGalleryUpload(mediaModalEvent.id, file);
                    }}
                  />
                </label>
              </div>

              <form onSubmit={handleAddVideo} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="url"
                  placeholder="Video URL (YouTube / Vimeo / Recording)"
                  value={videoForm.mediaUrl}
                  onChange={(e) => setVideoForm((p) => ({ ...p, mediaUrl: e.target.value }))}
                  style={{ flex: "1 1 240px", padding: "8px 10px", borderRadius: "8px", border: "1px solid #d5e4ec" }}
                />
                <input
                  type="text"
                  placeholder="Video caption"
                  value={videoForm.caption}
                  onChange={(e) => setVideoForm((p) => ({ ...p, caption: e.target.value }))}
                  style={{ flex: "1 1 160px", padding: "8px 10px", borderRadius: "8px", border: "1px solid #d5e4ec" }}
                />
                <button type="submit" className="event-admin-btn" disabled={mediaBusy}>
                  <Video size={14} /> Add Video
                </button>
              </form>

              {mediaModalEvent.galleryItems?.length > 0 && (
                <div className="event-gallery-thumb-grid">
                  {mediaModalEvent.galleryItems.map((g) => (
                    <div key={g.id} className="event-gallery-thumb-card">
                      {g.mediaType === "Video" ? (
                        <div style={{ padding: "14px", background: "#061426", color: "#fff", fontSize: "12.5px" }}>
                          <strong>Video Link</strong>
                          <div style={{ wordBreak: "break-all", marginTop: "4px", opacity: 0.85 }}>{g.mediaUrl}</div>
                        </div>
                      ) : (
                        <img src={resolveEventMediaUrl(g.mediaUrl)} alt={g.caption || "Gallery"} />
                      )}
                      <div style={{ padding: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <small style={{ color: "#526879" }}>{g.caption || g.mediaType}</small>
                        <button
                          type="button"
                          className="event-admin-btn danger"
                          style={{ padding: "4px 7px" }}
                          onClick={() => handleDeleteGalleryItem(g.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
