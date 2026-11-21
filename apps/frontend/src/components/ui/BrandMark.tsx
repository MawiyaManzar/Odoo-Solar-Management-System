import React from "react";
import { APP_CONFIG } from "../../config/app.config";

/** Logo mark plus the app name. Used by the app navbar and the auth header. */
export const BrandMark: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <img
      src="/logo.png"
      alt=""
      width={28}
      height={28}
      style={{
        width: "28px",
        height: "28px",
        objectFit: "contain",
        display: "block",
        flexShrink: 0
      }}
    />
    <span style={{ fontSize: "var(--text-lg, 18px)", fontWeight: 700, color: "var(--text)" }}>
      {APP_CONFIG.name}
    </span>
  </div>
);
