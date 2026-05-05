const VARIANTS = {
  error:   { icon: "✕", title: "Something went wrong", bg: "#fef2f2", border: "#fca5a5", iconBg: "#fee2e2", iconColor: "#dc2626", titleColor: "#b91c1c", textColor: "#7f1d1d" },
  success: { icon: "✓", title: "Changes saved",        bg: "#f0fdf4", border: "#86efac", iconBg: "#dcfce7", iconColor: "#16a34a", titleColor: "#15803d", textColor: "#14532d" },
  warning: { icon: "!",  title: "Heads up",             bg: "#fffbeb", border: "#fcd34d", iconBg: "#fef3c7", iconColor: "#d97706", titleColor: "#b45309", textColor: "#78350f" },
  info:    { icon: "i",  title: "Notice",               bg: "#eff6ff", border: "#93c5fd", iconBg: "#dbeafe", iconColor: "#2563eb", titleColor: "#1d4ed8", textColor: "#1e3a8a" },
};

const Alert = ({ type = "error", title, message, onClose }) => {
  if (!message) return null;
  const v = VARIANTS[type] ?? VARIANTS.error;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", borderRadius: 8,
      background: v.bg, border: `1px solid ${v.border}`,
      fontFamily: "inherit",
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

      {/* Close */}
      {onClose && (
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 18, color: v.textColor, opacity: 0.5,
          padding: 0, lineHeight: 1, flexShrink: 0,
        }}>×</button>
      )}
    </div>
  );
};

export default Alert;