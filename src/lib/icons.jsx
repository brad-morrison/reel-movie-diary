// Minimal inline icon set (stroke-based, inherits currentColor).
const S = ({ children, size = 20, fill = 'none', ...p }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {children}
  </svg>
)

export const IconPlus = (p) => (
  <S {...p}><path d="M12 5v14M5 12h14" /></S>
)
export const IconSun = (p) => (
  <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></S>
)
export const IconMoon = (p) => (
  <S {...p}><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z" /></S>
)
export const IconSearch = (p) => (
  <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>
)
export const IconStar = ({ fill = 'currentColor', ...p }) => (
  <S fill={fill} stroke="none" {...p}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.9l1.2-6.5L2.5 9.8l6.6-.9z" />
  </S>
)
export const IconStarOutline = (p) => (
  <S {...p}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.9l1.2-6.5L2.5 9.8l6.6-.9z" />
  </S>
)
export const IconHeart = ({ fill = 'none', ...p }) => (
  <S fill={fill} {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </S>
)
export const IconChart = (p) => (
  <S {...p}><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="12" y="6" width="3" height="11" /><rect x="17" y="13" width="3" height="4" /></S>
)
export const IconFilm = (p) => (
  <S {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10" /></S>
)
export const IconSettings = (p) => (
  <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></S>
)
export const IconX = (p) => (
  <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>
)
export const IconClose = IconX
export const IconTrash = (p) => (
  <S {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></S>
)
export const IconChevron = (p) => (
  <S {...p}><path d="m6 9 6 6 6-6" /></S>
)
export const IconRepeat = (p) => (
  <S {...p}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></S>
)
export const IconCalendar = (p) => (
  <S {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></S>
)
export const IconCheck = (p) => (
  <S {...p}><path d="M20 6 9 17l-5-5" /></S>
)
export const IconDownload = (p) => (
  <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></S>
)
export const IconUpload = (p) => (
  <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></S>
)
export const IconSparkle = (p) => (
  <S {...p} fill="currentColor" stroke="none"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /><path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" /></S>
)
export const IconCrown = ({ fill = 'currentColor', ...p }) => (
  <S {...p} fill={fill} stroke="none"><path d="M3 8.5l4.2 3.2L12 5l4.8 6.7L21 8.5 19.3 19H4.7L3 8.5z" /><circle cx="3" cy="7" r="1.4" /><circle cx="12" cy="3.6" r="1.4" /><circle cx="21" cy="7" r="1.4" /></S>
)
export const IconCloud = (p) => (
  <S {...p}><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19z" /></S>
)
export const IconCloudCheck = (p) => (
  <S {...p}><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19h11.5z" /><path d="m9 14 2 2 4-4" /></S>
)
export const IconLogOut = (p) => (
  <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>
)
export const IconUser = (p) => (
  <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>
)
export const IconGoogle = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" {...p}>
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7C21.7 18.9 23 15.9 23 12.3z" />
    <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z" />
    <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6z" />
    <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.4l3.8 3c.9-2.7 3.4-4.6 6.4-4.6z" />
  </svg>
)
