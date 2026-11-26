import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Bug,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GraduationCap,
  Layers3,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import "./Products.css";

export const productCatalog = [
  {
    id: "peoplehrsync",
    category: "Modern HRMS SaaS",
    filterCategory: "enterprise",
    title: "PeopleHRSync — Modern HRMS SaaS",
    shortLabel: "HRMS SaaS",
    statusLabel: "Live SaaS",
    logoText: "SYNC",
    description:
      "An all-in-one cloud HRMS SaaS platform engineered for modern workforces. Streamlines end-to-end employee lifecycles with automated biometric attendance synchronization, dynamic payroll calculation, shift scheduling, multi-level leave approvals, recruitment workflows, and intuitive employee self-service (ESS) portals.",
    deployedUrl: "https://peoplehrsync.com/",
    accent: "from-cyan",
    icon: Users,
    features: [
      "Automated Payroll Engine",
      "Biometric Attendance Sync",
      "Employee Self-Service (ESS)",
      "Role-Based Leave Workflows",
    ],
  },
  {
    id: "pulseleef",
    category: "Healthcare & Medical",
    filterCategory: "health",
    title: "PulseLeef — Healthcare & Clinical Suite",
    shortLabel: "Healthcare Suite",
    statusLabel: "Live Platform",
    logoText: "PULSE",
    description:
      "An enterprise-grade clinical administration and hospital management platform designed for healthcare practitioners and polyclinics. Unifies digital outpatient management, Electronic Health Records (EHR/EMR), doctor appointment scheduling, smart prescription generators, diagnostic test logs, and automated pharmacy billing.",
    deployedUrl: "https://pulseleef.com/",
    accent: "from-emerald",
    icon: ShieldCheck,
    features: [
      "Electronic Health Records (EHR)",
      "Doctor Appointment Scheduler",
      "Digital Prescription Engine",
      "Pharmacy & Lab Billing",
    ],
  },
  {
    id: "pupil-scholar",
    category: "Education & Campus ERP",
    filterCategory: "education",
    title: "Pupil Scholar — Education & Campus ERP",
    shortLabel: "Campus ERP",
    statusLabel: "Live Platform",
    logoText: "PUPIL",
    description:
      "A unified school and collegiate ERP engineered for academic institutions. Manages complete student and staff lifecycles, role-based access control (RBAC), digital admissions, fee ledgers with automatic receipt generation, exam grade sheets, academic timetables, and integrated parent communication alerts.",
    deployedUrl: "https://pupilscholar.com/",
    accent: "from-indigo",
    icon: GraduationCap,
    features: [
      "Student Lifecycle & Admissions",
      "Automated Fee Receipts & Dues",
      "Exam Grading & Report Cards",
      "Parent-Teacher Notification Portal",
    ],
  },
  {
    id: "kini-edx",
    category: "EdTech & Learning",
    filterCategory: "education",
    title: "Kini — KiniEdx Learning Platform",
    shortLabel: "EdTech LMS",
    statusLabel: "Live Platform",
    logoText: "KINI",
    description:
      "A next-generation digital education and curriculum delivery platform empowering educators and students. Combines interactive modular courses, video-based lessons, automated quiz evaluation, skill competency tracking, real-time student performance analytics, and gamified learning milestones.",
    deployedUrl: "https://kiniedx.com/",
    accent: "from-purple",
    icon: Brain,
    features: [
      "Interactive Course Modules",
      "Quiz & Assessment Engine",
      "Student Progress Analytics",
      "Gamified Learning Paths",
    ],
  },
  {
    id: "curecode-bug-tracker",
    category: "Developer Tools & QA",
    filterCategory: "enterprise",
    title: "CureCode — Agile Bug Tracker & QA Suite",
    shortLabel: "DevOps & QA",
    statusLabel: "Live SaaS",
    logoText: "CURE",
    description:
      "A high-performance defect tracking and agile development workspace where engineering teams cure software bugs faster. Offers visual Kanban sprint boards, bug severity and priority matrices, sprint backlog management, release milestone tracking, detailed crash logs, and collaborative team audit trails.",
    deployedUrl: "https://curecode.site/",
    accent: "from-rose",
    icon: Bug,
    features: [
      "Sprint Defect Board",
      "Issue Priority & Severity Matrix",
      "Release Milestone Tracking",
      "Team Collaboration & Audit Logs",
    ],
  },
];

const filterCategories = [
  { id: "all", label: "All Products" },
  { id: "enterprise", label: "Enterprise & HRMS" },
  { id: "health", label: "Healthcare" },
  { id: "education", label: "Education & EdTech" },
];

const deliveryPoints = [
  {
    icon: Layers3,
    title: "Designed Around Workflows",
    text: "Engineered to eliminate operational friction and streamline mission-critical business processes.",
  },
  {
    icon: MonitorCog,
    title: "Enterprise Customization",
    text: "Flexible modules and scalable microservices adaptable to your organization's specific business logic.",
  },
  {
    icon: Clock3,
    title: "Accelerated Time-to-Market",
    text: "Battle-tested cloud foundations and pre-built domain modules that cut deployment cycles dramatically.",
  },
];

function Products() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const elements = document.querySelectorAll(".products-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [selectedCategory]);

  const filteredProducts =
    selectedCategory === "all"
      ? productCatalog
      : productCatalog.filter(
          (product) => product.filterCategory === selectedCategory
        );

  const getCategoryCount = (categoryId) => {
    if (categoryId === "all") return productCatalog.length;
    return productCatalog.filter((product) => product.filterCategory === categoryId)
      .length;
  };

  const handleBookDemo = (product) => {
    const targetProductTitle = product ? product.title : "";
    const params = new URLSearchParams({ type: "demo" });
    if (targetProductTitle) {
      params.set("product", targetProductTitle);
    }

    navigate(`/contact?${params.toString()}`, {
      state: {
        product: targetProductTitle,
        productId: product?.id,
        deployedUrl: product?.deployedUrl,
        type: "demo",
        scrollToForm: true,
      },
    });
  };

  const handleHeroScroll = () => {
    const target = document.getElementById("products-grid");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate("/contact?type=demo", {
        state: { type: "demo", scrollToForm: true },
      });
    }
  };

  return (
    <div className="products-page">
      {/* ================= HERO SECTION ================= */}
      <section className="products-hero">
        <div className="products-hero-overlay" />
        <div className="products-hero-glow products-hero-glow-one" />
        <div className="products-hero-glow products-hero-glow-two" />

        <div className="products-hero-content">
          <div className="products-hero-copy products-reveal">
            <h1>Business products for modern teams.</h1>
            <p>
              Explore Pirnav product offerings built to support operations,
              collaboration, and modern business deliveries.
            </p>

            <div className="products-hero-actions">
              <button
                type="button"
                className="products-primary-btn"
                onClick={handleHeroScroll}
              >
                Explore Products
              </button>
              <button
                type="button"
                className="products-secondary-btn"
                onClick={() => handleBookDemo(null)}
              >
                Book a Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTRO & FILTER TABS ================= */}
      <section className="products-intro products-reveal">
        <span className="products-section-label">What We Offer</span>
        <h2>Simple products built for daily business needs.</h2>
        <p>
          These products are made to support daily work, team tasks and simple
          business operations.
        </p>

        {/* Category Filter Pills */}
        <div
          className="products-filter-bar"
          role="tablist"
          aria-label="Filter products by industry"
        >
          {filterCategories.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`products-filter-tab ${isActive ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className="products-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= PRODUCTS GRID (ZIGZAG LAYOUT) ================= */}
      <section id="products-grid" className="products-grid-section">
        <div className="products-grid">
          {filteredProducts.map((product, index) => {
            const Icon = product.icon;

            return (
              <article
                key={product.id || product.title}
                className="product-card products-reveal"
                style={{ transitionDelay: `${index * 0.06}s` }}
              >
                {/* Visual Media Card (Clickable to Live URL) */}
                <a
                  href={product.deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`product-card-media ${product.accent}`}
                  aria-label={`Open ${product.title} live project in a new tab`}
                  title={`Launch live project: ${product.deployedUrl}`}
                >
                  <div className="product-card-overlay" />

                  <div className="product-card-topline">
                    <span className="product-card-chip">{product.category}</span>
                    <span className="product-card-mini-tag product-card-live-badge">
                      <span className="live-status-dot" aria-hidden="true" />
                      {product.statusLabel}
                    </span>
                  </div>

                  <div className="product-card-logo-shell">
                    <span className="product-card-logo-icon">
                      <Icon size={34} aria-hidden="true" />
                    </span>
                    <div className="product-card-logo-copy">
                      <strong>{product.logoText}</strong>
                      <span>{product.category}</span>
                    </div>
                  </div>

                  <div className="product-card-hover-banner">
                    <span>Visit Live Site</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </div>
                </a>

                {/* Content Body */}
                <div className="product-card-body">
                  <div className="product-card-heading">
                    <span className="product-card-icon">
                      <Icon size={34} aria-hidden="true" />
                    </span>
                    <div className="product-card-title-block">
                      <span className="product-card-label">Product Solution</span>
                      <h3>
                        <a
                          href={product.deployedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="product-title-link"
                          title={`Open ${product.title}`}
                        >
                          {product.title}
                          <ExternalLink
                            size={16}
                            className="product-title-icon"
                            aria-hidden="true"
                          />
                        </a>
                      </h3>
                    </div>
                  </div>

                  <p>{product.description}</p>

                  {/* Feature Pills */}
                  <div className="product-feature-list">
                    {product.features.map((feature) => (
                      <span key={feature} className="product-feature-pill">
                        <CheckCircle2
                          size={13}
                          className="pill-check-icon"
                          aria-hidden="true"
                        />
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="product-card-actions">
                    <a
                      href={product.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="product-visit-btn"
                      title={`Visit ${product.title} live application`}
                    >
                      <span>Visit Live Site</span>
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      className="product-demo-btn"
                      onClick={() => handleBookDemo(product)}
                      title={`Book a personalized demo for ${product.title}`}
                    >
                      Book a Demo
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ================= VALUE DELIVERY POINTS ================= */}
      <section id="product-fit" className="products-fit-section">
        <div className="products-fit-copy products-reveal">
          <span className="products-section-label">Why These Products</span>
          <h2>Built to fit your business.</h2>
          <p>
            Choose the product you need and shape it around your workflow.
          </p>
        </div>

        <div className="products-fit-grid">
          {deliveryPoints.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="products-fit-card products-reveal"
                style={{ transitionDelay: `${index * 0.08}s` }}
              >
                <span className="products-fit-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Products;