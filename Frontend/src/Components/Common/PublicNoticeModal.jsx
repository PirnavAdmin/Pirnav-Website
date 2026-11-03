import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaExclamationTriangle } from "react-icons/fa";
import "./PublicNoticeModal.css";

const ACCEPTED_KEY = "pirnav-public-notice-accepted";
const ACCEPTED_DATE_KEY = "pirnav-public-notice-date";
const ANIMATION_DURATION = 280;

const noticeHeading = "IMPORTANT PUBLIC NOTICE FROM PIRNAV SOFTWARE SOLUTIONS – OFFICIAL ADVISORY";

const noticeParagraphs = [
  "It has come to our organization's notice that some outside entities (Companies/Consultancies/Vendors) are floated by unknown persons using names, logos, and trademarks similar to Pirnav Software Solutions Pvt. Ltd.",
  "These fraudulent entities are misusing our identity and have been using our Hyderabad office address as their contact address to mislead job seekers and the general public.",
  "They advertise fake recruitment drives, conduct interviews, exams and collect money from candidates under the guise of processing fees or registration charges.",
  "Pirnav Software Solutions Pvt. Ltd. has never authorised any such activities.",
  "Fraudulent job offers have also been made through fake websites, social media accounts and unofficial email addresses claiming to represent Pirnav Software Solutions Pvt. Ltd.",
];

const noticeBullets = [
  "Pirnav Software Solutions Pvt. Ltd. NEVER charges candidates any recruitment fee.",
  "We NEVER request payment for interviews, examinations, processing charges, visa fees or work permits.",
  "Recruitment is conducted only through authorised HR representatives and approved recruitment partners.",
  "Official communications are sent only from email addresses ending with:",
];

const officialDomains = ["@pirnav.com", "@pirnav.in"];

const getLocalDateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const canUseStorage = () => {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
};

const readStoredAcceptance = () => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(ACCEPTED_KEY) === "true";
  } catch {
    return false;
  }
};

const writeStoredAcceptance = () => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(ACCEPTED_KEY, "true");
    window.localStorage.setItem(ACCEPTED_DATE_KEY, getLocalDateStamp());
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
};

const getAnimationDuration = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return ANIMATION_DURATION;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : ANIMATION_DURATION;
};

const getFocusableElements = (root) => {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll(
      [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ")
    )
  ).filter((element) => {
    const hidden = element.getAttribute("aria-hidden") === "true";
    return !hidden && !element.hasAttribute("data-public-notice-ignore");
  });
};

const PublicNoticeModal = () => {
  const [isOpen, setIsOpen] = useState(() => !readStoredAcceptance());
  const [isClosing, setIsClosing] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    const body = document.body;
    const appShell = document.querySelector(".app-shell");
    const previousBodyOverflow = body.style.overflow;
    const previousAppShellAriaHidden = appShell?.getAttribute("aria-hidden");
    const previousAppShellInert = appShell?.hasAttribute("inert");

    body.style.overflow = "hidden";
    body.classList.add("pirnav-public-notice-open");

    if (appShell) {
      appShell.setAttribute("aria-hidden", "true");
      appShell.setAttribute("inert", "");
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.classList.remove("pirnav-public-notice-open");

      if (appShell) {
        if (previousAppShellAriaHidden === null) {
          appShell.removeAttribute("aria-hidden");
        } else {
          appShell.setAttribute("aria-hidden", previousAppShellAriaHidden);
        }

        if (!previousAppShellInert) {
          appShell.removeAttribute("inert");
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;

    const focusInitialControl = () => {
      const focusableElements = getFocusableElements(dialogRef.current);
      const initialFocusTarget = focusableElements[0] || dialogRef.current;

      if (initialFocusTarget && typeof initialFocusTarget.focus === "function") {
        initialFocusTarget.focus({ preventScroll: true });
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus?.({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialogRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus({ preventScroll: true });
        }
        return;
      }

      if (activeElement === lastElement || !dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    const frame = window.requestAnimationFrame(focusInitialControl);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);

      const previousFocus = previousFocusRef.current;
      if (previousFocus && typeof previousFocus.focus === "function" && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleAccept = () => {
    if (!isAcknowledged || isAccepting) {
      return;
    }

    setIsAccepting(true);
    writeStoredAcceptance();
    setIsClosing(true);

    const closeDelay = getAnimationDuration();

    if (closeDelay === 0) {
      setIsOpen(false);
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const overlayClassName = [
    "public-notice-modal",
    "public-notice-modal--visible",
    isClosing ? "public-notice-modal--closing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={overlayClassName} aria-hidden="false">
      <div
        ref={dialogRef}
        className="public-notice-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-notice-title"
        aria-describedby="public-notice-description"
        tabIndex={-1}
      >
        <div className="public-notice-modal__header">
          <div className="public-notice-modal__icon-wrap" aria-hidden="true">
            <FaExclamationTriangle className="public-notice-modal__icon" />
          </div>

          <div className="public-notice-modal__header-copy">
            <span className="public-notice-modal__eyebrow">Fraud Alert / Public Notice</span>
            <h2 id="public-notice-title">IMPORTANT PUBLIC NOTICE</h2>
            <p>Pirnav Software Solutions Pvt. Ltd. Official Advisory</p>
          </div>
        </div>

        <div className="public-notice-modal__content" id="public-notice-description">
          <h3 className="public-notice-modal__notice-heading">{noticeHeading}</h3>

          {noticeParagraphs.map((paragraph) => (
            <p key={paragraph} className="public-notice-modal__paragraph">
              {paragraph}
            </p>
          ))}

          <p className="public-notice-modal__paragraph public-notice-modal__paragraph--label">
            Please note:
          </p>

          <ul className="public-notice-modal__bullet-list">
            {noticeBullets.map((item) => (
              <li key={item} className="public-notice-modal__bullet-item">
                {item}
              </li>
            ))}
          </ul>

          <div className="public-notice-modal__email-list" aria-label="Official Pirnav email domains">
            {officialDomains.map((domain) => (
              <span key={domain} className="public-notice-modal__email-chip">
                {domain}
              </span>
            ))}
          </div>

          <p className="public-notice-modal__paragraph">
            If an email comes from Gmail, Yahoo, Outlook, Live, AOL or any other public email service—even if it contains the word "Pirnav"—it should not be considered an official communication.
          </p>

          <p className="public-notice-modal__paragraph">
            If you receive suspicious recruitment emails or payment requests, please ignore them immediately and report them to Pirnav Software Solutions Pvt. Ltd.
          </p>

          <p className="public-notice-modal__paragraph">
            We have informed the appropriate legal authorities regarding these fraudulent activities.
          </p>

          <p className="public-notice-modal__paragraph public-notice-modal__paragraph--final">
            We request all job seekers and visitors to remain vigilant and avoid becoming victims of recruitment scams.
          </p>
        </div>

        <div className="public-notice-modal__footer">
          <label className="public-notice-modal__acknowledgement" htmlFor="public-notice-acknowledgement">
            <input
              id="public-notice-acknowledgement"
              type="checkbox"
              checked={isAcknowledged}
              onChange={(event) => setIsAcknowledged(event.target.checked)}
              disabled={isAccepting}
            />
            <span>By Clicking "I Agree and Understand" you acknowledge the official advisory and will proceed to Website.</span>
          </label>

          <button
            type="button"
            className="public-notice-modal__continue"
            onClick={handleAccept}
            disabled={!isAcknowledged || isAccepting}
            aria-disabled={!isAcknowledged || isAccepting}
            aria-busy={isAccepting}
          >
            {isAccepting ? (
              <>
                <span className="public-notice-modal__spinner" aria-hidden="true" />
                <span>Continuing...</span>
              </>
            ) : (
              "I Agree and Understand"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PublicNoticeModal;
