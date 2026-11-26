import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Mail,
  MonitorPlay,
  PhoneCall,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import "./Admin.css";
import { buildApiUrl } from "../../config/api";
import { PIRNAV_PRODUCTS } from "../Common/ContactForm.jsx";

const DEMO_API = buildApiUrl("Demo");
const ADMINS_API = buildApiUrl("Admin/admins");

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Demo Scheduled",
  "Demo Completed",
  "Qualified",
  "Converted",
  "Lost",
];

const getStatusSlug = (status = "") =>
  String(status || "New")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const DemoLeads = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    newRequests: 0,
    contacted: 0,
    demoScheduled: 0,
    demosCompleted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  });
  const [admins, setAdmins] = useState([]);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  const [statusForm, setStatusForm] = useState({
    status: "New",
    followUpDate: "",
    notes: "",
  });
  const [assignForm, setAssignForm] = useState({
    assignedToUserId: "",
    notes: "",
  });
  const [activityNote, setActivityNote] = useState("");
  const [activityFollowUp, setActivityFollowUp] = useState("");

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin-login");
      return null;
    }
    return {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    };
  }, [navigate]);

  const fetchAdmins = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;
    try {
      const res = await fetch(ADMINS_API, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      setAdmins(list);
    } catch {
      // Non-fatal if admins list is temporarily unavailable.
    }
  }, [getHeaders]);

  const fetchLeads = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (productFilter !== "all") params.set("productId", productFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (assignedFilter !== "all") params.set("assignedToUserId", assignedFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${DEMO_API}?${params.toString()}`, { headers });
      if (res.status === 401) {
        navigate("/admin-login");
        return;
      }
      if (!res.ok) throw new Error("Unable to load demo leads.");

      const data = await res.json();
      setLeads(Array.isArray(data?.items) ? data.items : []);
      if (data?.summary) setSummary(data.summary);
      setTotalPages(data?.totalPages || 1);
      setTotalRecords(data?.totalRecords ?? 0);
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message || "Failed to load demo leads." });
    } finally {
      setLoading(false);
    }
  }, [assignedFilter, fromDate, getHeaders, navigate, page, productFilter, search, statusFilter, toDate]);

  const openLeadDetail = useCallback(async (id) => {
    const headers = getHeaders();
    if (!headers) return;

    try {
      setDetailLoading(true);
      setFeedbackBanner(null);
      const res = await fetch(`${DEMO_API}/${id}`, { headers });
      if (res.status === 401) {
        navigate("/admin-login");
        return;
      }
      if (!res.ok) throw new Error("Demo lead not found.");

      const detail = await res.json();
      setSelectedLead(detail);
      setStatusForm({
        status: detail.status || "New",
        followUpDate: toDateInput(detail.followUpDate),
        notes: "",
      });
      setAssignForm({
        assignedToUserId: detail.assignedToUserId ? String(detail.assignedToUserId) : "",
        notes: "",
      });
      setActivityNote("");
      setActivityFollowUp(toDateInput(detail.followUpDate));
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message || "Failed to open demo lead." });
    } finally {
      setDetailLoading(false);
    }
  }, [getHeaders, navigate]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const deepLinkId = searchParams.get("id");
    if (deepLinkId) {
      openLeadDetail(deepLinkId);
      setSearchParams({}, { replace: true });
    }
  }, [openLeadDetail, searchParams, setSearchParams]);

  const handleStatusSave = async (event) => {
    event.preventDefault();
    if (!selectedLead) return;
    const headers = getHeaders();
    if (!headers) return;

    try {
      setActionBusy(true);
      const res = await fetch(`${DEMO_API}/${selectedLead.id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status: statusForm.status,
          followUpDate: statusForm.followUpDate || null,
          notes: statusForm.notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to update status.");

      setFeedbackBanner({ type: "success", text: `Status updated to ${statusForm.status}.` });
      await Promise.all([openLeadDetail(selectedLead.id), fetchLeads()]);
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleAssignSave = async (event) => {
    event.preventDefault();
    if (!selectedLead) return;
    const headers = getHeaders();
    if (!headers) return;

    try {
      setActionBusy(true);
      const res = await fetch(`${DEMO_API}/${selectedLead.id}/assign`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          assignedToUserId: assignForm.assignedToUserId ? Number(assignForm.assignedToUserId) : null,
          notes: assignForm.notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to assign employee.");

      setFeedbackBanner({ type: "success", text: data?.message || "Assignment updated." });
      await Promise.all([openLeadDetail(selectedLead.id), fetchLeads()]);
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!selectedLead || !activityNote.trim()) return;
    const headers = getHeaders();
    if (!headers) return;

    try {
      setActionBusy(true);
      const res = await fetch(`${DEMO_API}/${selectedLead.id}/activities`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          notes: activityNote.trim(),
          followUpDate: activityFollowUp || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to save follow-up note.");

      setFeedbackBanner({ type: "success", text: "Follow-up activity recorded." });
      await Promise.all([openLeadDetail(selectedLead.id), fetchLeads()]);
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetryEmails = async () => {
    if (!selectedLead) return;
    const headers = getHeaders();
    if (!headers) return;

    try {
      setActionBusy(true);
      const res = await fetch(`${DEMO_API}/${selectedLead.id}/retry-emails`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to queue retry.");

      setFeedbackBanner({ type: "success", text: data?.message || "Emails queued for retry." });
      await openLeadDetail(selectedLead.id);
    } catch (err) {
      setFeedbackBanner({ type: "error", text: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setProductFilter("all");
    setStatusFilter("all");
    setAssignedFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    productFilter !== "all" ||
    statusFilter !== "all" ||
    assignedFilter !== "all" ||
    fromDate !== "" ||
    toDate !== "";

  const kpiCards = [
    {
      label: "New Requests",
      value: summary.newRequests,
      statusValue: "New",
      icon: Sparkles,
      hint: "Awaiting outreach",
    },
    {
      label: "Contacted",
      value: summary.contacted,
      statusValue: "Contacted",
      icon: PhoneCall,
      hint: "In discussion",
    },
    {
      label: "Demos Completed",
      value: summary.demosCompleted,
      statusValue: "Demo Completed",
      icon: MonitorPlay,
      hint: "Walkthrough done",
    },
    {
      label: "Converted",
      value: summary.converted,
      statusValue: "Converted",
      icon: CheckCircle2,
      hint: "Won accounts",
    },
  ];

  return (
    <div className="messages-wrapper demo-leads-wrapper">
      <div className="messages-header">
        <div>
          <h1>Demo Leads</h1>
          <p className="demo-leads-subtitle">
            Centralized product demo requests, assignments, and follow-up tracking
          </p>
        </div>
        <span className="unread-badge demo-new-badge">{summary.newRequests} new</span>
      </div>

      {/* 4 Summary Cards */}
      <div className="demo-kpi-grid">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isSelected = statusFilter === card.statusValue;
          return (
            <button
              key={card.label}
              type="button"
              className={`stat-card demo-kpi-card ${isSelected ? "active" : ""}`}
              onClick={() => {
                setStatusFilter((prev) =>
                  prev === card.statusValue ? "all" : card.statusValue
                );
                setPage(1);
              }}
            >
              <div className="stat-header">
                <span>{card.label}</span>
                <span className="stat-icon">
                  <Icon size={20} />
                </span>
              </div>
              <div className="stat-body">
                <h2>{card.value}</h2>
                <span className="stat-trend">{card.hint}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar demo-filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Search customer, company, email, or PIR-DEMO..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by product"
        >
          <option value="all">All Products</option>
          {PIRNAV_PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.shortName}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={assignedFilter}
          onChange={(e) => {
            setAssignedFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by assigned employee"
        >
          <option value="all">All Employees</option>
          <option value="0">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.username}
            </option>
          ))}
        </select>

        <label className="messages-date-field">
          <CalendarClock size={15} aria-hidden="true" />
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="messages-date-field">
          <CalendarClock size={15} aria-hidden="true" />
          <span>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </label>

        {hasActiveFilters ? (
          <button type="button" className="demo-clear-btn" onClick={clearFilters}>
            Reset
          </button>
        ) : null}
      </div>

      {feedbackBanner && !selectedLead ? (
        <div className={`demo-banner demo-banner-${feedbackBanner.type}`}>
          {feedbackBanner.text}
        </div>
      ) : null}

      {/* Demo Leads Table */}
      <div className="demo-table-card">
        {loading ? (
          <p className="demo-loading-copy">Loading demo leads...</p>
        ) : leads.length === 0 ? (
          <div className="demo-empty-state">
            <MonitorPlay size={30} />
            <strong>No demo requests match these filters</strong>
            <p>Demo submissions from the website appear here automatically.</p>
          </div>
        ) : (
          <table className="demo-leads-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <span className="demo-ref-pill">{lead.referenceNumber}</span>
                  </td>
                  <td>
                    <div className="demo-customer-cell">
                      <strong>{lead.name}</strong>
                      <small>{lead.company}</small>
                      <small>{lead.email}</small>
                    </div>
                  </td>
                  <td>
                    <span className="demo-product-tag">{lead.productName}</span>
                  </td>
                  <td>
                    <span className="demo-assignee-copy">
                      {lead.assignedToUsername || "Unassigned"}
                    </span>
                  </td>
                  <td>
                    <span className={`demo-status-pill demo-status-${getStatusSlug(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <span className="table-date">{formatDate(lead.createdAt)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-icon-btn demo-view-btn"
                      onClick={() => openLeadDetail(lead.id)}
                      title="View and manage demo lead"
                    >
                      <Eye size={14} />
                      <span>Manage</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="demo-pagination">
        <span>
          Showing {leads.length} of {totalRecords} demo requests
        </span>
        <div className="demo-pagination-buttons">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Lead Detail & Management Modal */}
      {(selectedLead || detailLoading) && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal demo-detail-modal">
            {detailLoading && !selectedLead ? (
              <p>Loading lead details...</p>
            ) : selectedLead ? (
              <>
                <div className="demo-modal-header">
                  <div>
                    <span className="demo-ref-pill">{selectedLead.referenceNumber}</span>
                    <h3>{selectedLead.name} · {selectedLead.company}</h3>
                    <p>{selectedLead.productName}</p>
                  </div>
                  <button
                    type="button"
                    className="demo-modal-close"
                    onClick={() => setSelectedLead(null)}
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {feedbackBanner ? (
                  <div className={`demo-banner demo-banner-${feedbackBanner.type}`}>
                    {feedbackBanner.text}
                  </div>
                ) : null}

                <div className="demo-detail-grid">
                  <div className="demo-detail-info">
                    <div className="demo-meta-list">
                      <div>
                        <small>Email</small>
                        <strong>{selectedLead.email}</strong>
                      </div>
                      <div>
                        <small>Phone</small>
                        <strong>{selectedLead.phone}</strong>
                      </div>
                      <div>
                        <small>Preferred Demo Date</small>
                        <strong>{formatDate(selectedLead.preferredDemoDate)}</strong>
                      </div>
                      <div>
                        <small>Next Follow-Up</small>
                        <strong>{formatDate(selectedLead.followUpDate)}</strong>
                      </div>
                    </div>

                    <div className="demo-requirements-box">
                      <small>Customer Requirements</small>
                      <p>{selectedLead.message}</p>
                    </div>

                    {/* Email Outbox Panel */}
                    <div className="demo-outbox-panel">
                      <div className="demo-panel-head">
                        <span>
                          <Mail size={15} /> Email Outbox Status
                        </span>
                        {(selectedLead.outboxEmails || []).some(
                          (e) => e.deliveryStatus !== "Sent"
                        ) ? (
                          <button
                            type="button"
                            className="demo-retry-btn"
                            onClick={handleRetryEmails}
                            disabled={actionBusy}
                          >
                            <RefreshCw size={13} /> Retry Pending/Failed
                          </button>
                        ) : null}
                      </div>

                      <div className="demo-outbox-list">
                        {(selectedLead.outboxEmails || []).map((em) => (
                          <div key={em.id} className="demo-outbox-item">
                            <div>
                              <strong>{em.emailType}</strong>
                              <small>
                                To: {em.recipientEmail} (Attempts: {em.attemptCount})
                              </small>
                              {em.lastError ? (
                                <small className="demo-outbox-error">{em.lastError}</small>
                              ) : null}
                            </div>
                            <span
                              className={`demo-outbox-badge demo-outbox-${em.deliveryStatus.toLowerCase()}`}
                            >
                              {em.deliveryStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Management Actions */}
                  <div className="demo-detail-actions">
                    <form className="demo-action-card" onSubmit={handleStatusSave}>
                      <h4>Update Lifecycle Status</h4>
                      <label className="demo-field">
                        <span>Status</span>
                        <select
                          value={statusForm.status}
                          onChange={(e) =>
                            setStatusForm((p) => ({ ...p, status: e.target.value }))
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="demo-field">
                        <span>Follow-Up Date</span>
                        <input
                          type="date"
                          value={statusForm.followUpDate}
                          onChange={(e) =>
                            setStatusForm((p) => ({ ...p, followUpDate: e.target.value }))
                          }
                        />
                      </label>
                      <label className="demo-field">
                        <span>Note (optional)</span>
                        <input
                          type="text"
                          placeholder="Reason or next step..."
                          value={statusForm.notes}
                          onChange={(e) =>
                            setStatusForm((p) => ({ ...p, notes: e.target.value }))
                          }
                        />
                      </label>
                      <button type="submit" className="demo-action-btn" disabled={actionBusy}>
                        Save Status
                      </button>
                    </form>

                    <form className="demo-action-card" onSubmit={handleAssignSave}>
                      <h4>
                        <UserCheck size={15} /> Assign Employee
                      </h4>
                      <label className="demo-field">
                        <span>Assignee</span>
                        <select
                          value={assignForm.assignedToUserId}
                          onChange={(e) =>
                            setAssignForm((p) => ({ ...p, assignedToUserId: e.target.value }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {admins.map((a) => (
                            <option key={a.id} value={String(a.id)}>
                              {a.username} ({a.role})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="demo-field">
                        <span>Assignment Note</span>
                        <input
                          type="text"
                          placeholder="Optional handoff note..."
                          value={assignForm.notes}
                          onChange={(e) =>
                            setAssignForm((p) => ({ ...p, notes: e.target.value }))
                          }
                        />
                      </label>
                      <button type="submit" className="demo-action-btn" disabled={actionBusy}>
                        Update Assignee
                      </button>
                    </form>

                    <form className="demo-action-card" onSubmit={handleAddNote}>
                      <h4>
                        <Clock3 size={15} /> Add Follow-Up Note
                      </h4>
                      <label className="demo-field">
                        <span>Activity Note</span>
                        <textarea
                          rows="2"
                          placeholder="Call summary, demo feedback, follow-up plan..."
                          value={activityNote}
                          onChange={(e) => setActivityNote(e.target.value)}
                          required
                        />
                      </label>
                      <label className="demo-field">
                        <span>Reminder / Follow-Up Date</span>
                        <input
                          type="date"
                          value={activityFollowUp}
                          onChange={(e) => setActivityFollowUp(e.target.value)}
                        />
                      </label>
                      <button type="submit" className="demo-action-btn" disabled={actionBusy}>
                        Add Activity
                      </button>
                    </form>
                  </div>
                </div>

                {/* Activity History Timeline */}
                <div className="demo-timeline-section">
                  <h4>Activity History</h4>
                  <div className="demo-timeline-list">
                    {(selectedLead.activities || []).map((act) => (
                      <div key={act.id} className="demo-timeline-item">
                        <div className="demo-timeline-dot" />
                        <div className="demo-timeline-body">
                          <div className="demo-timeline-top">
                            <strong>{act.activityType}</strong>
                            {act.newStatus && act.previousStatus !== act.newStatus ? (
                              <span className="demo-timeline-transition">
                                {act.previousStatus || "None"} → {act.newStatus}
                              </span>
                            ) : null}
                            <small>{formatDateTime(act.createdAt)}</small>
                          </div>
                          <p>{act.notes}</p>
                          <div className="demo-timeline-meta">
                            {act.employeeName ? <span>By: {act.employeeName}</span> : null}
                            {act.followUpDate ? (
                              <span>Follow-up: {formatDate(act.followUpDate)}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoLeads;
