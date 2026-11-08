import type { ReactNode } from "react";

export type IconProps = { className?: string; title?: string };

/** Shared 24×24 line-icon frame: currentColor strokes, width 2, round caps and joins. */
function Icon({ className, title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: false })}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const GEAR = (() => {
  const pts: string[] = [];
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = Math.PI / teeth;
    const p = (r: number, ang: number) => `${(12 + r * Math.cos(ang)).toFixed(2)} ${(12 + r * Math.sin(ang)).toFixed(2)}`;
    pts.push(p(7, a - w * 0.62), p(9.6, a - w * 0.36), p(9.6, a + w * 0.36), p(7, a + w * 0.62));
  }
  return `M${pts.join("L")}Z`;
})();

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
    <path d="M10 21h4" />
    <path d="M12 3V2" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export const IconGavel = (p: IconProps) => (
  <Icon {...p}>
    <rect x="11" y="2.5" width="6" height="11" rx="1.5" transform="rotate(-45 14 8)" />
    <path d="M11.9 10.1L4 18" />
    <path d="M13 21h8" />
  </Icon>
);

export const IconScales = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16M8 20h8M4.5 7h15" />
    <path d="M4.5 7L2 13M4.5 7L7 13M19.5 7L17 13M19.5 7L22 13" />
    <path d="M2 13a2.5 2.5 0 0 0 5 0ZM17 13a2.5 2.5 0 0 0 5 0Z" />
  </Icon>
);

export const IconQuill = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 3.5C12 4 6.5 9 6 17.5c8.5-.5 13.5-6 14.5-14Z" />
    <path d="M3 21L14 10" />
    <path d="M9.5 14.5H14M12.5 11.5h4" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />
  </Icon>
);

export const IconFlag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h13l-2.5 4.5L18 13H5" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const IconTrophy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
    <path d="M7 6H4.5a3 3 0 0 0 3 4.5M17 6h2.5a3 3 0 0 1-3 4.5" />
    <path d="M12 14v4M8 21h8l-1-3H9Z" />
  </Icon>
);

export const IconFire = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21.5c-4 0-7-2.8-7-6.8 0-3 1.8-4.8 3-6.7.6 1.6 1.6 2.6 3 3C11 7.5 12.5 4.5 15 2.5c.2 2.8 1.2 4.6 2.6 6.4C18.8 10.4 19 12.4 19 14.7c0 4-3 6.8-7 6.8Z" />
    <path d="M12 21.5c-1.8 0-3-1.3-3-3 0-1.8 1.5-2.7 2-4.5 1.5 1 4 2.4 4 4.6 0 1.6-1.2 2.9-3 2.9Z" />
  </Icon>
);

export const IconShare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d={GEAR} />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconArchive = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3.5" width="18" height="4.5" rx="1" />
    <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4c.9 4.6 2.4 6.1 7 7-4.6.9-6.1 2.4-7 7-.9-4.6-2.4-6.1-7-7 4.6-.9 6.1-2.4 7-7Z" />
    <path d="M19 2.5v4M17 4.5h4M19 17.5v3M17.5 19h3" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="11" width="15" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M12 15v2" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconEyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.7 3.6" />
    <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </Icon>
);

export const IconBriefcase = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18M11 13v2h2v-2" />
  </Icon>
);

export const IconPointing = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5c2 0 3.5-.5 5-1.5l1.5-1h10a1.75 1.75 0 0 1 0 3.5H13.5" />
    <path d="M13.5 10.5a1.75 1.75 0 0 1 0 3.5H13a1.75 1.75 0 0 1 0 3.5h-.5a1.5 1.5 0 0 1 0 3H8.5c-2 0-3.5-1-5.5-1" />
    <path d="M8.5 11c1.5 1 3.5 1 5 0" />
  </Icon>
);

export const IconCat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 3.5l4 4c1.2-.4 2.5-.5 4-.5s2.8.1 4 .5l4-4v9c0 4.6-3.6 8-8 8s-8-3.4-8-8Z" />
    <path d="M9 12.5v.5M15 12.5v.5" />
    <path d="M11 15.5l1 .8 1-.8" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
  </Icon>
);

export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4h18l-7 8.5V19l-4 2v-8.5Z" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2.8l2.85 5.8 6.4.93-4.63 4.5 1.1 6.37L12 17.4l-5.72 3 1.1-6.37-4.63-4.5 6.4-.93Z" />
  </Icon>
);
