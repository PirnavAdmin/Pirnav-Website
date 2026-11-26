import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Search, Users } from "lucide-react";
import { buildApiUrl } from "../../config/api";
import { ATTENDANCE_STATUSES, formatEventDate } from "../Events/eventHelpers";

const EventRegistrations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get("eventId") || "all";

  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [eventFilter, setEventFilter] = useState(initialEventId);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    const loadEventOptions = async () => {
      try {
        const res = await fetch(buildApiUrl("Admin/Events"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        // non-blocking
      }
    };
    loadEventOptions();
  }, [token]);

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (eventFilter !== "all") params.set("eventId", eventFilter);
      if (attendanceFilter !== "all") params.set("attendanceStatus", attendanceFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(buildApiUrl(`Admin/Events/registrations?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to fetch registrations.");
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [eventFilter, attendanceFilter, searchTerm, token]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const handleEventChange = (nextId) => {
    setEventFilter(nextId);
    if (nextId === "all") {
      searchParams.delete("eventId");
    } else {
      searchParams.set("eventId", nextId);
    }
    setSearchParams(searchParams);
  };

  const handleAttendanceUpdate = async (regId, nextStatus) => {
    setUpdatingId(regId);
    try {
      const res = await fetch(buildApiUrl(`Admin/Events/registrations/${regId}/attendance`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attendanceStatus: nextStatus }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === regId ? { ...r, attendanceStatus: nextStatus } : r))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = async () => {
    if (eventFilter !== "all") {
      const res = await fetch(buildApiUrl(`Admin/Events/${eventFilter}/registrations/export`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventFilter}-registrations.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const esc = (v) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = "ReferenceNumber,Event,Name,Email,Phone,Company,JobRole,AttendanceStatus,RegisteredAt";
    const rows = registrations.map((r) =>
      [
        esc(r.referenceNumber),
        esc(r.eventTitle),
        esc(r.name),
        esc(r.email),
        esc(r.phone),
        esc(r.company),
        esc(r.jobRole || ""),
        esc(r.attendanceStatus),
        esc(r.createdAt),
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all-event-registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    return {
      total: registrations.length,
      registered: registrations.filter((r) => r.attendanceStatus === "Registered").length,
      attended: registrations.filter((r) => r.attendanceStatus === "Attended").length,
      noShow: registrations.filter((r) => r.attendanceStatus === "NoShow").length,
    };
  }, [registrations]);

  return (
    <div className="messages-wrapper">
      <div className="messages-header">
        <div>
          <h1>Event Registrations &amp; Attendance</h1>
          <p style={{ margin: "4px 0 0", color: "#526879", fontSize: "14px" }}>
            Track attendees across events, mark attendance status, and export CSV rosters.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/admin/events" className="event-admin-btn">
            <ArrowLeft size={15} /> Back to Events
          </Link>
          <button
            type="button"
            className="event-admin-btn primary"
            onClick={handleExportCsv}
            disabled={registrations.length === 0}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Counts */}
      <div className="demo-kpi-grid" style={{ marginBottom: "18px" }}>
        <div className="demo-kpi-card" style={{ cursor: "default" }}>
          <div className="stat-header">
            <span>Shown Registrations</span>
            <Users size={18} color="#0b7286" />
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "26px", color: "#102238" }}>{counts.total}</strong>
          </div>
        </div>
        <div className="demo-kpi-card" style={{ cursor: "default" }}>
          <div className="stat-header">
            <span>Registered</span>
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "26px", color: "#0b7286" }}>{counts.registered}</strong>
          </div>
        </div>
        <div className="demo-kpi-card" style={{ cursor: "default" }}>
          <div className="stat-header">
            <span>Attended</span>
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "26px", color: "#087f5b" }}>{counts.attended}</strong>
          </div>
        </div>
        <div className="demo-kpi-card" style={{ cursor: "default" }}>
          <div className="stat-header">
            <span>No Show</span>
          </div>
          <div className="stat-body">
            <strong style={{ fontSize: "26px", color: "#ad6800" }}>{counts.noShow}</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="demo-filter-bar" style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
          />
          <input
            type="search"
            placeholder="Search reference, attendee, email, company..."
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

        <select value={eventFilter} onChange={(e) => handleEventChange(e.target.value)}>
          <option value="all">All Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={String(ev.id)}>
              {ev.title}
            </option>
          ))}
        </select>

        <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)}>
          <option value="all">All Attendance Statuses</option>
          {ATTENDANCE_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="demo-table-card" style={{ padding: "24px" }}>Loading registrations...</div>}
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
                <th>Reference</th>
                <th>Attendee</th>
                <th>Contact</th>
                <th>Company &amp; Role</th>
                <th>Event</th>
                <th>Registered</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#526879" }}>
                    No event registrations match your current filters.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <tr key={reg.id}>
                    <td>
                      <span className="demo-ref-pill">{reg.referenceNumber}</span>
                    </td>
                    <td>
                      <strong style={{ color: "#102238", display: "block" }}>{reg.name}</strong>
                      {reg.notes && (
                        <small style={{ color: "#526879", display: "block", maxWidth: "210px" }}>
                          Note: {reg.notes}
                        </small>
                      )}
                    </td>
                    <td>
                      <div>{reg.email}</div>
                      <small style={{ color: "#526879" }}>{reg.phone}</small>
                    </td>
                    <td>
                      <div>{reg.company}</div>
                      <small style={{ color: "#526879" }}>{reg.jobRole || "—"}</small>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#102238" }}>{reg.eventTitle}</div>
                      <small style={{ color: "#526879" }}>{reg.eventCategory}</small>
                    </td>
                    <td>{formatEventDate(reg.createdAt)}</td>
                    <td>
                      <select
                        value={reg.attendanceStatus}
                        disabled={updatingId === reg.id}
                        onChange={(e) => handleAttendanceUpdate(reg.id, e.target.value)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid #cfe0ea",
                          background: "#ffffff",
                          fontWeight: 600,
                          fontSize: "12.5px",
                        }}
                      >
                        {ATTENDANCE_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EventRegistrations;
