import { useState, useEffect } from "react";

const VARIANTS = {
  error:   { icon: "✕", title: "Something went wrong", bg: "#fef2f2", border: "#fca5a5", iconBg: "#fee2e2", iconColor: "#dc2626", titleColor: "#b91c1c", textColor: "#7f1d1d" },
  success: { icon: "✓", title: "Changes saved",        bg: "#f0fdf4", border: "#86efac", iconBg: "#dcfce7", iconColor: "#16a34a", titleColor: "#15803d", textColor: "#14532d" },
  warning: { icon: "!",  title: "Heads up",             bg: "#fffbeb", border: "#fcd34d", iconBg: "#fef3c7", iconColor: "#d97706", titleColor: "#b45309", textColor: "#78350f" },
  info:    { icon: "i",  title: "Notice",               bg: "#eff6ff", border: "#93c5fd", iconBg: "#dbeafe", iconColor: "#2563eb", titleColor: "#1d4ed8", textColor: "#1e3a8a" },
};

const Alert = ({ type = "error", title, message, onClose, duration = 3000 }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!message) return;

    // Start fade out 300ms before removal
    const fadeTimer = setTimeout(() => setFading(true), duration - 500);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  const v = VARIANTS[type] ?? VARIANTS.error;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", borderRadius: 8,
      background: v.bg, border: `1px solid ${v.border}`,
      fontFamily: "inherit",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      opacity: fading ? 0 : 1,
      transform: fading ? "translateY(-4px)" : "translateY(0)",
    }}>
      {/* Icon */}
      <div style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
        background: v.iconBg, color: v.iconColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, marginTop: 1,
      }}>
        {v.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: v.titleColor, marginBottom: 2 }}>
          {title ?? v.title}
        </div>
        <div style={{ fontSize: 13, color: v.textColor, lineHeight: 1.5 }}>
          {message}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 2,
        background: v.border, borderRadius: "0 0 8px 8px",
        animation: `shrink ${duration}ms linear forwards`,
      }} />

      {/* Close */}
      <button onClick={() => { setFading(true); setTimeout(() => { setVisible(false); onClose?.(); }, 300); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 18, color: v.textColor, opacity: 0.5,
          padding: 0, lineHeight: 1, flexShrink: 0,
        }}>×
      </button>

      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
};

export default Alert;