/* @ds-bundle: {"format":4,"namespace":"ConstruktProDesignSystem_8956f7","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"ICONS","sourcePath":"components/core/iconData.js"},{"name":"AreaChart","sourcePath":"components/data/AreaChart.jsx"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"ChatBubble","sourcePath":"components/data/ChatBubble.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"MessageItem","sourcePath":"components/data/MessageItem.jsx"},{"name":"MiniCalendar","sourcePath":"components/data/MiniCalendar.jsx"},{"name":"MonthCalendar","sourcePath":"components/data/MonthCalendar.jsx"},{"name":"PieChart","sourcePath":"components/data/PieChart.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FilterPill","sourcePath":"components/forms/FilterPill.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"OptionRow","sourcePath":"components/forms/OptionRow.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"UploadBox","sourcePath":"components/forms/UploadBox.jsx"},{"name":"ListingCard","sourcePath":"components/listings/ListingCard.jsx"},{"name":"ProductCard","sourcePath":"components/listings/ProductCard.jsx"},{"name":"Header","sourcePath":"components/navigation/Header.jsx"},{"name":"MobileTabBar","sourcePath":"components/navigation/MobileTabBar.jsx"},{"name":"SegmentedTabs","sourcePath":"components/navigation/SegmentedTabs.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Stepper","sourcePath":"components/navigation/Stepper.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"4f50a0050b5a","components/core/Badge.jsx":"d61dfaed65b6","components/core/Button.jsx":"74016009cdf5","components/core/Icon.jsx":"d9f50de79e65","components/core/IconButton.jsx":"93e81a7e93a0","components/core/Tag.jsx":"06605ce2795b","components/core/iconData.js":"0a2479cfefa1","components/data/AreaChart.jsx":"670f5e2a46ab","components/data/BarChart.jsx":"3cd4fcbf4225","components/data/Card.jsx":"621c4962aeda","components/data/ChatBubble.jsx":"65620d6e0b84","components/data/DataTable.jsx":"bafb8ac7423c","components/data/MessageItem.jsx":"a789d11d6ded","components/data/MiniCalendar.jsx":"b7c95e81492e","components/data/MonthCalendar.jsx":"b66fb8b2cb86","components/data/PieChart.jsx":"5cf95da7c5e9","components/data/StatCard.jsx":"3658bb9920cf","components/forms/Checkbox.jsx":"6ff1df2bd653","components/forms/FilterPill.jsx":"2cdadb08b659","components/forms/Input.jsx":"8db548364c31","components/forms/OptionRow.jsx":"c9dd22d1daac","components/forms/Select.jsx":"386966a8e12b","components/forms/Textarea.jsx":"40b7e20edbc0","components/forms/UploadBox.jsx":"f7a85380f10d","components/listings/ListingCard.jsx":"5b7df5d547b8","components/listings/ProductCard.jsx":"1583556255d1","components/navigation/Header.jsx":"5669d8208b51","components/navigation/MobileTabBar.jsx":"ec8b2d966037","components/navigation/SegmentedTabs.jsx":"6312a33428c3","components/navigation/Sidebar.jsx":"ccedc102a225","components/navigation/Stepper.jsx":"98632c996891","ui_kits/admin/CronogramaScreen.jsx":"1803986bd596","ui_kits/admin/HomeScreen.jsx":"192925e36900","ui_kits/admin/MensagensScreen.jsx":"dec04f88bff6","ui_kits/admin/ObrasScreen.jsx":"948d46885311","ui_kits/admin/PedidosScreen.jsx":"e9fd2b90165d","ui_kits/admin/Shell.jsx":"aacfd0277dbd","ui_kits/admin/data.jsx":"d0f76147fc01"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ConstruktProDesignSystem_8956f7 = window.ConstruktProDesignSystem_8956f7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function Avatar({
  src,
  name = '',
  size = 40,
  online,
  style
}) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: '50%',
      background: 'var(--cp-gray-300)',
      color: 'var(--cp-gray-600)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.36,
      fontWeight: 700,
      overflow: 'visible',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover'
    }
  }) : ini, online && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: size * 0.28,
      height: size * 0.28,
      borderRadius: '50%',
      background: 'var(--cp-success-strong)',
      border: '2px solid #fff'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const T = {
  danger: ['var(--cp-data-pink)', '#fff'],
  error: ['var(--cp-error)', '#fff'],
  neutral: ['var(--cp-gray-500)', '#fff'],
  warning: ['var(--cp-data-yellow)', 'var(--cp-black)'],
  info: ['var(--cp-data-blue)', '#fff'],
  cyan: ['var(--cp-data-turquoise)', 'var(--cp-black)'],
  success: ['var(--cp-success-strong)', '#fff'],
  electric: ['var(--cp-success)', 'var(--cp-black)'],
  orange: ['var(--cp-data-orange)', '#fff'],
  accent: ['var(--accent)', 'var(--cp-black)'],
  dark: ['var(--cp-black)', '#fff']
};
function Badge({
  tone = 'neutral',
  size = 'md',
  children,
  style
}) {
  const [bg, fg] = T[tone] || T.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: size === 'sm' ? 20 : 26,
      padding: size === 'sm' ? '0 8px' : '0 10px',
      borderRadius: 'var(--radius-xs)',
      background: bg,
      color: fg,
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      lineHeight: 1,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
const T = {
  accent: ['var(--accent-soft)', 'var(--cp-orange-700)'],
  neutral: ['var(--cp-gray-100)', 'var(--cp-black)'],
  success: ['var(--cp-success-100)', 'var(--cp-success-strong)'],
  danger: ['var(--cp-error-100)', '#B42318'],
  dark: ['var(--cp-black)', 'var(--cp-white)']
};
function Tag({
  tone = 'accent',
  dot,
  count,
  active,
  onClick,
  children,
  style
}) {
  const [bg, fg] = active ? ['var(--cp-black)', 'var(--cp-white)'] : T[tone] || T.accent;
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 12px',
      borderRadius: 'var(--radius-pill)',
      background: bg,
      color: fg,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: dot === true ? 'currentColor' : dot
    }
  }), children, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 16,
      height: 16,
      borderRadius: 999,
      background: active ? 'var(--accent)' : 'var(--cp-black)',
      color: active ? 'var(--cp-black)' : '#fff',
      fontSize: 10,
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px'
    }
  }, count));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/core/iconData.js
try { (() => {
const ICONS = {
  "layout-grid": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\" /> <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />",
  "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />",
  "message-circle": "<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\" />",
  "hard-hat": "<path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\" /> <path d=\"M14 6a6 6 0 0 1 6 6v3\" /> <path d=\"M4 15v-3a6 6 0 0 1 6-6\" /> <rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\" />",
  "building-2": "<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\" /> <path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\" /> <path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\" /> <path d=\"M10 6h4\" /> <path d=\"M10 10h4\" /> <path d=\"M10 14h4\" /> <path d=\"M10 18h4\" />",
  "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />",
  "calendar": "<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" />",
  "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" /> <path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />",
  "check": "<path d=\"M20 6 9 17l-5-5\" />",
  "star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />",
  "plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />",
  "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "x": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\" />",
  "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" /> <polyline points=\"16 17 21 12 16 7\" /> <line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\" />",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />",
  "calendar-days": "<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" /> <path d=\"M8 14h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M16 14h.01\" /> <path d=\"M8 18h.01\" /> <path d=\"M12 18h.01\" /> <path d=\"M16 18h.01\" />",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\" />",
  "panel-left-close": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M9 3v18\" /> <path d=\"m16 15-3-3 3-3\" />",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 16v-4\" /> <path d=\"M12 8h.01\" />",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\" />",
  "arrow-left": "<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />",
  "arrow-down-right": "<path d=\"m7 7 10 10\" /> <path d=\"M17 7v10H7\" />",
  "panel-left-open": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M9 3v18\" /> <path d=\"m14 9 3 3-3 3\" />",
  "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\" /> <circle cx=\"19\" cy=\"12\" r=\"1\" /> <circle cx=\"5\" cy=\"12\" r=\"1\" />",
  "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" /> <path d=\"m15 5 4 4\" />",
  "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" /> <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" /> <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" /> <path d=\"m2 2 20 20\" />",
  "chevron-up": "<path d=\"m18 15-6-6-6 6\" />",
  "trash-2": "<path d=\"M3 6h18\" /> <path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" /> <path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" /> <line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" /> <line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />",
  "cloud-upload": "<path d=\"M12 13v8\" /> <path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /> <path d=\"m8 17 4-4 4 4\" />",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" /> <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" />",
  "mail": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" /> <path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\" />",
  "truck": "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /> <path d=\"M15 18H9\" /> <path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\" /> <circle cx=\"17\" cy=\"18\" r=\"2\" /> <circle cx=\"7\" cy=\"18\" r=\"2\" />",
  "package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /> <path d=\"m7.5 4.27 9 5.15\" />",
  "wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /> <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />",
  "ruler": "<path d=\"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z\" /> <path d=\"m14.5 12.5 2-2\" /> <path d=\"m11.5 9.5 2-2\" /> <path d=\"m8.5 6.5 2-2\" /> <path d=\"m17.5 15.5 2-2\" />",
  "hammer": "<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\" /> <path d=\"m18 15 4-4\" /> <path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\" />",
  "wrench": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\" />",
  "construction": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"8\" rx=\"1\" /> <path d=\"M17 14v7\" /> <path d=\"M7 14v7\" /> <path d=\"M17 3v3\" /> <path d=\"M7 3v3\" /> <path d=\"M10 14 2.3 6.3\" /> <path d=\"m14 6 7.7 7.7\" /> <path d=\"m8 6 8 8\" />",
  "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /> <path d=\"M12 11h4\" /> <path d=\"M12 16h4\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 16h.01\" />",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <polyline points=\"12 6 12 12 16 14\" />",
  "map-pin": "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" />",
  "zap": "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />",
  "droplets": "<path d=\"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z\" /> <path d=\"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97\" />",
  "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />",
  "camera": "<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\" /> <circle cx=\"12\" cy=\"13\" r=\"3\" />",
  "filter": "<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\" />",
  "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />",
  "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />",
  "house": "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />",
  "send": "<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /> <path d=\"m21.854 2.147-10.94 10.939\" />",
  "image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />",
  "sliders-horizontal": "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" /> <line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" /> <line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" /> <line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" /> <line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" /> <line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" /> <line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" /> <line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" /> <line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />",
  "box": "<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\" /> <path d=\"m3.3 7 8.7 5 8.7-5\" /> <path d=\"M12 22V12\" />",
  "layers": "<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\" /> <path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\" /> <path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\" />",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />",
  "circle-dollar-sign": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\" /> <path d=\"M12 18V6\" />",
  "thumbs-up": "<path d=\"M7 10v12\" /> <path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\" />",
  "square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />",
  "square-check": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"m9 12 2 2 4-4\" />",
  "paintbrush": "<path d=\"m14.622 17.897-10.68-2.913\" /> <path d=\"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z\" /> <path d=\"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15\" />",
  "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"M18 17V9\" /> <path d=\"M13 17V5\" /> <path d=\"M8 17v-3\" />",
  "phone": "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />",
  "trending-up": "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\" /> <polyline points=\"16 7 22 7 22 13\" />",
  "shovel": "<path d=\"M2 22v-5l5-5 5 5-5 5z\" /> <path d=\"M9.5 14.5 16 8\" /> <path d=\"m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0s0 0 0 0a3.53 3.53 0 0 1 0-5L17 2\" />"
};
Object.assign(__ds_scope, { ICONS });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/iconData.js", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Icon({
  name,
  size = 20,
  stroke = 1.5,
  color = 'currentColor',
  style,
  ...rest
}) {
  const body = __ds_scope.ICONS[name] || '';
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    "aria-hidden": "true",
    dangerouslySetInnerHTML: {
      __html: body
    }
  }, rest));
}
const ICON_NAMES = Object.keys(__ds_scope.ICONS);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const V = {
  primary: {
    background: 'var(--cp-black)',
    color: 'var(--cp-white)',
    hover: 'var(--cp-black-900)'
  },
  accent: {
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    hover: 'var(--accent-hover)'
  },
  secondary: {
    background: 'var(--cp-gray-100)',
    color: 'var(--cp-black)',
    hover: 'var(--cp-gray-300)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--cp-black)',
    hover: 'var(--cp-gray-100)'
  },
  link: {
    background: 'transparent',
    color: 'var(--cp-black)',
    hover: 'transparent',
    underline: true
  },
  danger: {
    background: 'var(--cp-error)',
    color: 'var(--cp-white)',
    hover: '#D92D1C'
  }
};
const S = {
  sm: {
    h: 32,
    px: 12,
    fs: 12,
    ic: 14
  },
  md: {
    h: 40,
    px: 16,
    fs: 14,
    ic: 16
  },
  lg: {
    h: 48,
    px: 24,
    fs: 16,
    ic: 18
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  disabled,
  children,
  onClick,
  type = 'button',
  style
}) {
  const v = V[variant] || V.primary,
    s = S[size] || S.md;
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: s.h,
      padding: '0 ' + s.px + 'px',
      width: fullWidth ? '100%' : undefined,
      background: h && !disabled ? v.hover : v.background,
      color: v.color,
      border: 0,
      borderRadius: 'var(--radius-sm)',
      font: 'inherit',
      fontSize: s.fs,
      fontWeight: 600,
      textDecoration: v.underline && h ? 'underline' : 'none',
      textUnderlineOffset: 3,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast)',
      whiteSpace: 'nowrap',
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(.98)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = '';
    }
  }, iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.ic
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.ic
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const V = {
  ghost: ['transparent', 'var(--cp-black)', 'var(--cp-gray-100)', 'none'],
  outline: ['var(--cp-white)', 'var(--cp-black)', 'var(--cp-gray-100)', '1px solid var(--border-default)'],
  dark: ['var(--cp-black)', 'var(--cp-white)', 'var(--cp-black-900)', 'none'],
  danger: ['var(--cp-error)', 'var(--cp-white)', '#D92D1C', 'none'],
  inverse: ['transparent', 'var(--cp-white)', 'rgba(255,255,255,.08)', 'none']
};
function IconButton({
  icon,
  variant = 'ghost',
  size = 36,
  iconSize,
  badge,
  label,
  onClick,
  round,
  style
}) {
  const [bg, fg, hov, bd] = V[variant] || V.ghost;
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    title: label,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: h ? hov : bg,
      color: fg,
      border: bd,
      borderRadius: round ? '50%' : 'var(--radius-sm)',
      cursor: 'pointer',
      padding: 0,
      transition: 'background var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize || Math.round(size * 0.56)
  }), badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      borderRadius: 999,
      background: 'var(--accent)',
      color: 'var(--cp-black)',
      fontSize: 10,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid var(--bg-app)'
    }
  }, badge) : null);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/AreaChart.jsx
try { (() => {
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6) + ',' + (p1[1] + (p2[1] - p0[1]) / 6) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6) + ',' + (p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ',' + p2[1];
  }
  return d;
}
function AreaChart({
  data = [],
  labels = [],
  max,
  ticks = 5,
  height = 220,
  highlight,
  format = v => v,
  color = 'var(--accent)'
}) {
  const id = React.useId ? React.useId().replace(/:/g, '') : 'ac';
  const mx = max || Math.ceil(Math.max(...data, 1) / 100) * 100;
  const W = 600,
    H = 200;
  const pts = data.map((v, i) => [i / (data.length - 1) * W, H - v / mx * H]);
  const line = smooth(pts),
    area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  const [hi, setHi] = React.useState(highlight);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0,1fr)',
      gridTemplateRows: height + 'px auto',
      columnGap: 12,
      rowGap: 8,
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      textAlign: 'right'
    }
  }, Array.from({
    length: ticks + 1
  }, (_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      lineHeight: '0'
    }
  }, format(Math.round(mx - i * mx / ticks))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minWidth: 0
    },
    onMouseLeave: () => setHi(highlight)
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 ' + W + ' ' + H,
    preserveAspectRatio: "none",
    style: {
      width: '100%',
      height: '100%',
      display: 'block',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: 'g' + id,
    x1: "0",
    x2: "0",
    y1: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: color,
    stopOpacity: ".5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: color,
    stopOpacity: ".04"
  }))), Array.from({
    length: ticks + 1
  }, (_, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: "0",
    x2: W,
    y1: i * H / ticks,
    y2: i * H / ticks,
    stroke: "var(--border-default)",
    strokeDasharray: "4 4",
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#g' + id + ')'
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: color,
    strokeWidth: "2.5",
    vectorEffect: "non-scaling-stroke"
  }), hi != null && pts[hi] && /*#__PURE__*/React.createElement("line", {
    x1: pts[hi][0],
    x2: pts[hi][0],
    y1: pts[hi][1],
    y2: H,
    stroke: "var(--cp-black)",
    strokeDasharray: "3 3",
    vectorEffect: "non-scaling-stroke"
  })), data.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onMouseEnter: () => setHi(i),
    style: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: i / (data.length - 1) * 100 - 50 / (data.length - 1) + '%',
      width: 100 / (data.length - 1) + '%'
    }
  })), hi != null && pts[hi] && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: hi / (data.length - 1) * 100 + '%',
      top: pts[hi][1] / H * 100 + '%',
      transform: 'translate(-50%,-140%)',
      background: 'var(--cp-black)',
      color: '#fff',
      padding: '5px 8px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      pointerEvents: 'none'
    }
  }, format(data[hi]))), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, labels.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 12
    }
  }, l))));
}
Object.assign(__ds_scope, { AreaChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AreaChart.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
function BarChart({
  data = [],
  series = [{
    key: 'a',
    label: 'A',
    color: 'var(--accent)'
  }, {
    key: 'b',
    label: 'B',
    color: 'var(--cp-black)'
  }],
  max,
  ticks = 4,
  height = 200
}) {
  const mx = max || Math.ceil(Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1) / 50) * 50;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, series.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.key,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: s.color
    }
  }), s.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0,1fr)',
      columnGap: 12,
      rowGap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height,
      textAlign: 'right',
      fontSize: 11,
      fontWeight: 600
    }
  }, Array.from({
    length: ticks + 1
  }, (_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      lineHeight: 0
    }
  }, Math.round(mx - i * mx / ticks)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      backgroundImage: 'repeating-linear-gradient(to bottom, var(--border-default) 0 1px, transparent 1px ' + height / ticks + 'px)',
      backgroundSize: '100% ' + height / ticks + 'px'
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    title: series.map(s => s.label + ': ' + d[s.key]).join(' · '),
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 4,
      height: '100%'
    }
  }, series.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.key,
    style: {
      width: 'clamp(8px,2.2vw,24px)',
      height: d[s.key] / mx * 100 + '%',
      background: s.color,
      borderRadius: '6px 6px 0 0',
      transition: 'height var(--dur-slow) var(--ease-standard)'
    }
  }))))), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-around',
      fontSize: 12,
      fontWeight: 600
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, d.label)))));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function Card({
  title,
  icon,
  action,
  children,
  padding = 20,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      ...style
    }
  }, (title || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-card-title)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, icon, title), action), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/ChatBubble.jsx
try { (() => {
function ChatBubble({
  text,
  time,
  mine
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: mine ? 'flex-end' : 'flex-start',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'min(460px, 80%)',
      padding: '10px 14px',
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.45,
      borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
      background: mine ? 'var(--accent)' : 'var(--cp-gray-100)',
      color: 'var(--cp-black)'
    }
  }, text), time && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--text-secondary)',
      fontWeight: 600
    }
  }, time));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  rowKey = (r, i) => i,
  onRowClick,
  minWidth = 720,
  dense
}) {
  const [hov, setHov] = React.useState(-1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      minWidth,
      borderCollapse: 'collapse',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      background: 'var(--cp-black)',
      color: 'var(--cp-white)',
      textAlign: c.align || 'left',
      fontWeight: 600,
      fontSize: 13,
      padding: '14px 16px',
      whiteSpace: 'nowrap',
      width: c.width
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: rowKey(r, i),
    onMouseEnter: () => setHov(i),
    onMouseLeave: () => setHov(-1),
    onClick: () => onRowClick && onRowClick(r),
    style: {
      background: hov === i ? 'var(--cp-orange-50)' : 'transparent',
      cursor: onRowClick ? 'pointer' : 'default',
      transition: 'background var(--dur-fast)'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      padding: dense ? '10px 16px' : '14px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: c.align || 'left',
      fontWeight: 500,
      verticalAlign: 'middle'
    }
  }, c.render ? c.render(r) : r[c.key])))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/MessageItem.jsx
try { (() => {
function MessageItem({
  name,
  preview,
  time,
  unread,
  active,
  avatar,
  online,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      background: active ? 'var(--cp-gray-100)' : h ? 'var(--cp-gray-50)' : 'transparent',
      boxShadow: active ? 'inset 3px 0 0 var(--accent)' : 'none',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: avatar,
    size: 40,
    online: online
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, preview)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 4
    }
  }, time && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, time), unread ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      background: 'var(--accent)',
      color: 'var(--cp-black)',
      fontSize: 10,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, unread) : null));
}
Object.assign(__ds_scope, { MessageItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MessageItem.jsx", error: String((e && e.message) || e) }); }

// components/data/MiniCalendar.jsx
try { (() => {
const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function MiniCalendar({
  year = 2025,
  month = 10,
  marked = [],
  alert = [],
  today,
  onPrev,
  onNext,
  onSelect
}) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7,
    days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({
    length: first
  }, () => null).concat(Array.from({
    length: days
  }, (_, i) => i + 1));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-card-title)'
    }
  }, MES[month], ", ", year), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "chevron-left",
    variant: "outline",
    round: true,
    size: 28,
    label: "Anterior",
    onClick: onPrev
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "chevron-right",
    variant: "outline",
    round: true,
    size: 28,
    label: "Pr\xF3ximo",
    onClick: onNext
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      rowGap: 6,
      textAlign: 'center'
    }
  }, ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 13,
      fontWeight: 600,
      padding: '4px 0'
    }
  }, d)), cells.map((d, i) => {
    const m = marked.includes(d),
      a = alert.includes(d),
      t = d === today,
      past = today && d && d < today && !m && !a;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      onClick: () => d && onSelect && onSelect(d),
      style: {
        justifySelf: 'center',
        width: 34,
        height: 34,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 600,
        cursor: d ? 'pointer' : 'default',
        background: a ? 'var(--cp-error)' : m ? 'var(--accent)' : 'transparent',
        color: a ? '#fff' : m ? 'var(--cp-black)' : past ? 'var(--text-secondary)' : 'var(--text-primary)',
        textDecoration: past ? 'line-through' : 'none',
        boxShadow: t ? 'inset 0 0 0 1.5px var(--cp-black)' : 'none'
      }
    }, d || '');
  })));
}
Object.assign(__ds_scope, { MiniCalendar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MiniCalendar.jsx", error: String((e && e.message) || e) }); }

// components/data/MonthCalendar.jsx
try { (() => {
const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function MonthCalendar({
  year = 2025,
  month = 10,
  events = [],
  today,
  onPrev,
  onNext,
  onEventClick,
  compact
}) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7,
    days = new Date(year, month + 1, 0).getDate(),
    prevDays = new Date(year, month, 0).getDate();
  const total = Math.ceil((first + days) / 7) * 7;
  const weeks = [];
  for (let w = 0; w < total / 7; w++) weeks.push(Array.from({
    length: 7
  }, (_, c) => {
    const n = w * 7 + c - first + 1;
    return n < 1 ? {
      n: prevDays + n,
      out: true
    } : n > days ? {
      n: n - days,
      out: true
    } : {
      n
    };
  }));
  const rowH = compact ? 72 : 108;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "chevron-left",
    variant: "outline",
    round: true,
    size: 28,
    label: "Anterior",
    onClick: onPrev
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, MES[month], ", ", year), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "chevron-right",
    variant: "outline",
    round: true,
    size: 28,
    label: "Pr\xF3ximo",
    onClick: onNext
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      textAlign: 'center',
      fontSize: 13,
      fontWeight: 600,
      paddingBottom: 8
    }
  }, (compact ? ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']).map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-default)',
      borderLeft: '1px solid var(--border-default)'
    }
  }, weeks.map((wk, w) => {
    const ws = w * 7 - first + 1,
      we = ws + 6;
    const evs = events.filter(e => e.end >= ws && e.start <= we);
    return /*#__PURE__*/React.createElement("div", {
      key: w,
      style: {
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(7,1fr)',
        height: rowH
      }
    }, wk.map((d, c) => /*#__PURE__*/React.createElement("div", {
      key: c,
      style: {
        borderRight: '1px solid var(--border-default)',
        borderBottom: '1px solid var(--border-default)',
        padding: 6,
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: d.out ? 'var(--cp-gray-300)' : d.n === today && !d.out ? '#fff' : 'var(--text-primary)',
        background: d.n === today && !d.out ? 'var(--cp-black)' : 'transparent'
      }
    }, d.n))), evs.map((e, k) => {
      const s = Math.max(e.start, ws) - ws,
        en = Math.min(e.end, we) - ws;
      return /*#__PURE__*/React.createElement("div", {
        key: k,
        onClick: () => onEventClick && onEventClick(e),
        style: {
          position: 'absolute',
          left: 'calc(' + s / 7 * 100 + '% + 4px)',
          width: 'calc(' + (en - s + 1) / 7 * 100 + '% - 8px)',
          top: 34 + k * (compact ? 22 : 30),
          height: compact ? 20 : 44,
          background: e.color || 'var(--accent)',
          color: e.textColor || '#fff',
          borderRadius: compact ? 6 : 12,
          padding: compact ? '0 6px' : '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          fontSize: compact ? 10 : 12,
          fontWeight: 600,
          lineHeight: 1.3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.title), !compact && e.sub && /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: .9
        }
      }, e.sub)), !compact && /*#__PURE__*/React.createElement("span", {
        style: {
          width: 22,
          height: 22,
          flexShrink: 0,
          border: '1.5px solid currentColor',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
        name: "arrow-down-right",
        size: 14
      })));
    }));
  })));
}
Object.assign(__ds_scope, { MonthCalendar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MonthCalendar.jsx", error: String((e && e.message) || e) }); }

// components/data/PieChart.jsx
try { (() => {
function PieChart({
  data = [],
  size = 160,
  donut = 0
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const stops = data.map(d => {
    const s = acc / total * 360;
    acc += d.value;
    return d.color + ' ' + s + 'deg ' + acc / total * 360 + 'deg';
  }).join(',');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'conic-gradient(' + stops + ')',
      flexShrink: 0,
      WebkitMask: donut ? 'radial-gradient(circle, transparent ' + donut * 50 + '%, #000 ' + (donut * 50 + 0.5) + '%)' : undefined,
      mask: donut ? 'radial-gradient(circle, transparent ' + donut * 50 + '%, #000 ' + (donut * 50 + 0.5) + '%)' : undefined
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, data.map(d => /*#__PURE__*/React.createElement("span", {
    key: d.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: d.color
    }
  }), d.label, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, Math.round(d.value / total * 100), "%")))));
}
Object.assign(__ds_scope, { PieChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PieChart.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function StatCard({
  value,
  label,
  color = 'var(--stat-1)',
  icon,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0,
      ...style
    }
  }, icon, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      color,
      fontSize: 'clamp(22px, 2.4vw, 30px)',
      overflowWrap: 'anywhere'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  defaultChecked,
  onChange,
  label,
  disabled,
  size = 18
}) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const on = checked ?? inner;
  const toggle = () => {
    if (disabled) return;
    if (checked == null) setInner(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("span", {
    onClick: toggle,
    role: "checkbox",
    "aria-checked": on,
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontSize: 14,
      fontWeight: 500,
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 4,
      border: on ? '0' : '1.5px solid var(--border-strong)',
      background: on ? 'var(--cp-black)' : 'var(--cp-white)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast)'
    }
  }, on && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: size - 6,
    stroke: 3
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterPill.jsx
try { (() => {
function FilterPill({
  options = [],
  value,
  defaultValue,
  onChange
}) {
  const [inner, setInner] = React.useState(defaultValue ?? options[0]);
  const v = value ?? inner;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: '0 12px 0 14px',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--cp-white)',
      color: 'var(--text-secondary)',
      fontSize: 12,
      fontWeight: 600
    }
  }, v, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14
  }), /*#__PURE__*/React.createElement("select", {
    value: v,
    onChange: e => {
      setInner(e.target.value);
      onChange && onChange(e.target.value);
    },
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      cursor: 'pointer'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o
  }, o))));
}
Object.assign(__ds_scope, { FilterPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterPill.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Field({
  label,
  required,
  info,
  helper,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cp-error)'
    }
  }, "*"), label, info && /*#__PURE__*/React.createElement("span", {
    title: info,
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 12
  }))), children, (helper || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 500,
      color: error ? 'var(--cp-error)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 11
  }), error || helper));
}
function boxStyle(focus, error, disabled, filled) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 40,
    padding: '0 12px',
    background: disabled ? 'var(--cp-gray-100)' : 'var(--cp-white)',
    border: '1px solid ' + (error ? 'var(--cp-error)' : focus ? 'var(--border-focus)' : 'var(--border-default)'),
    borderRadius: 'var(--radius-xs)',
    boxShadow: focus && !error ? 'var(--ring-focus)' : 'none',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
    color: 'var(--text-primary)',
    opacity: disabled ? 0.6 : 1
  };
}
const inputReset = {
  flex: 1,
  minWidth: 0,
  border: 0,
  outline: 0,
  background: 'transparent',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  color: 'inherit',
  height: '100%'
};
function Input({
  label,
  required,
  info,
  helper,
  error,
  type = 'text',
  prefix,
  icon,
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const isPw = type === 'password';
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    required: required,
    info: info,
    helper: helper,
    error: error
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...boxStyle(focus, error, disabled),
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: "var(--text-secondary)"
  }), prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      paddingRight: 8,
      borderRight: '1px solid var(--border-default)'
    }
  }, prefix), /*#__PURE__*/React.createElement("input", {
    type: isPw && show ? 'text' : type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: inputReset
  }), isPw && /*#__PURE__*/React.createElement("span", {
    onClick: () => setShow(!show),
    style: {
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: show ? 'eye' : 'eye-off',
    size: 16
  }))));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/OptionRow.jsx
try { (() => {
function OptionRow({
  icon,
  label,
  checked,
  defaultChecked,
  onChange
}) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const on = checked ?? inner;
  const set = v => {
    if (checked == null) setInner(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => set(!on),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      cursor: 'pointer',
      minWidth: 0
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    checked: on,
    onChange: set
  })));
}
Object.assign(__ds_scope, { OptionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/OptionRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Field({
  label,
  required,
  info,
  helper,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cp-error)'
    }
  }, "*"), label, info && /*#__PURE__*/React.createElement("span", {
    title: info,
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 12
  }))), children, (helper || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 500,
      color: error ? 'var(--cp-error)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 11
  }), error || helper));
}
function boxStyle(focus, error, disabled, filled) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 40,
    padding: '0 12px',
    background: disabled ? 'var(--cp-gray-100)' : 'var(--cp-white)',
    border: '1px solid ' + (error ? 'var(--cp-error)' : focus ? 'var(--border-focus)' : 'var(--border-default)'),
    borderRadius: 'var(--radius-xs)',
    boxShadow: focus && !error ? 'var(--ring-focus)' : 'none',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
    color: 'var(--text-primary)',
    opacity: disabled ? 0.6 : 1
  };
}
const inputReset = {
  flex: 1,
  minWidth: 0,
  border: 0,
  outline: 0,
  background: 'transparent',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  color: 'inherit',
  height: '100%'
};
function Select({
  label,
  required,
  info,
  helper,
  error,
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    required: required,
    info: info,
    helper: helper,
    error: error
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...boxStyle(focus, error, disabled),
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    defaultValue: defaultValue ?? (placeholder ? '' : undefined),
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...inputReset,
      appearance: 'none',
      cursor: 'pointer',
      paddingRight: 20
    }
  }, placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      pointerEvents: 'none',
      color: 'var(--text-secondary)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function Field({
  label,
  required,
  info,
  helper,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cp-error)'
    }
  }, "*"), label, info && /*#__PURE__*/React.createElement("span", {
    title: info,
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 12
  }))), children, (helper || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 500,
      color: error ? 'var(--cp-error)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 11
  }), error || helper));
}
function boxStyle(focus, error, disabled, filled) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 40,
    padding: '0 12px',
    background: disabled ? 'var(--cp-gray-100)' : 'var(--cp-white)',
    border: '1px solid ' + (error ? 'var(--cp-error)' : focus ? 'var(--border-focus)' : 'var(--border-default)'),
    borderRadius: 'var(--radius-xs)',
    boxShadow: focus && !error ? 'var(--ring-focus)' : 'none',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
    color: 'var(--text-primary)',
    opacity: disabled ? 0.6 : 1
  };
}
const inputReset = {
  flex: 1,
  minWidth: 0,
  border: 0,
  outline: 0,
  background: 'transparent',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  color: 'inherit',
  height: '100%'
};
function Textarea({
  label,
  required,
  info,
  helper,
  error,
  placeholder,
  value,
  defaultValue,
  onChange,
  maxLength = 500,
  rows = 4,
  disabled
}) {
  const [focus, setFocus] = React.useState(false);
  const [n, setN] = React.useState((value || defaultValue || '').length);
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    required: required,
    info: info,
    helper: helper,
    error: error
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...boxStyle(focus, error, disabled),
      height: 'auto',
      padding: 12,
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: rows,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    maxLength: maxLength,
    disabled: disabled,
    onChange: e => {
      setN(e.target.value.length);
      onChange && onChange(e);
    },
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...inputReset,
      resize: 'vertical',
      height: 'auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-end',
      fontSize: 11,
      color: 'var(--text-secondary)',
      fontWeight: 600
    }
  }, n, "/", maxLength)));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/forms/UploadBox.jsx
try { (() => {
function UploadBox({
  title = 'Enviar arquivo',
  hint = 'Escolha um arquivo ou arraste e solte aqui.',
  formats,
  height = 200,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      height,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      textAlign: 'center',
      background: h ? 'var(--cp-orange-50)' : 'var(--cp-gray-100)',
      border: '1.5px dashed ' + (h ? 'var(--accent)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      transition: 'all var(--dur-base)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: '0 12px',
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "cloud-upload",
    size: 16
  }), title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, hint), formats && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, formats));
}
Object.assign(__ds_scope, { UploadBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/UploadBox.jsx", error: String((e && e.message) || e) }); }

// components/listings/ListingCard.jsx
try { (() => {
function Photo({
  src,
  style
}) {
  return src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: 'var(--radius-sm)',
      display: 'block',
      ...style
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-sm)',
      background: 'repeating-linear-gradient(135deg,var(--cp-gray-100) 0 10px,var(--cp-stone-100) 10px 20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--cp-stone)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "image",
    size: 22
  }));
}
function ListingCard({
  images = [],
  title,
  status,
  attrs = [],
  featuresLabel,
  features = [],
  onMore,
  onClick,
  stacked
}) {
  return /*#__PURE__*/React.createElement("article", {
    onClick: onClick,
    style: {
      display: 'grid',
      gridTemplateColumns: stacked ? '1fr' : 'minmax(0,1.6fr) minmax(0,.7fr) minmax(0,3fr)',
      gap: 12,
      padding: 12,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: stacked ? 180 : 'auto',
      minHeight: 160
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    src: images[0]
  })), !stacked && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateRows: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    src: images[1]
  }), /*#__PURE__*/React.createElement(Photo, {
    src: images[2]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: stacked ? '4px 4px 8px' : '8px 8px 8px 12px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8
    }
  }, status && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: status,
      marginTop: 6,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      flex: 1,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.3
    }
  }, title), onMore && /*#__PURE__*/React.createElement("span", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "ellipsis",
    size: 28,
    label: "Mais op\xE7\xF5es",
    onClick: onMore
  }))), attrs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px 40px'
    }
  }, attrs.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.label,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      fontWeight: 500
    }
  }, a.label, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 500
    }
  }, a.value)))), features.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, featuresLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      fontWeight: 500
    }
  }, featuresLabel, ":"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
      gap: '8px 20px'
    }
  }, features.map(f => /*#__PURE__*/React.createElement("span", {
    key: f.label,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 14,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: f.icon,
    size: 20
  }), f.label))))));
}
Object.assign(__ds_scope, { ListingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/listings/ListingCard.jsx", error: String((e && e.message) || e) }); }

// components/listings/ProductCard.jsx
try { (() => {
function Photo({
  src,
  style
}) {
  return src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: 'var(--radius-sm)',
      display: 'block',
      ...style
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-sm)',
      background: 'repeating-linear-gradient(135deg,var(--cp-gray-100) 0 10px,var(--cp-stone-100) 10px 20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--cp-stone)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "image",
    size: 22
  }));
}
function ProductCard({
  image,
  title,
  price,
  onEdit,
  editLabel = 'Editar'
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 8,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '1 / 1',
      background: 'var(--cp-gray-100)',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    src: image,
    style: {
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8,
      padding: '0 4px',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, price)), /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    style: {
      height: 32,
      border: 0,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--cp-black)',
      color: '#fff',
      font: 'inherit',
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pencil",
    size: 14
  }), editLabel));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/listings/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Header.jsx
try { (() => {
function Header({
  title,
  user,
  search = 'icon',
  onMenu,
  compact,
  notifications,
  messages,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 'var(--header-height)',
      padding: '12px 0',
      borderBottom: '1px solid var(--border-default)',
      ...style
    }
  }, onMenu && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "menu",
    label: "Abrir menu",
    onClick: onMenu,
    size: 40
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      flex: search === 'field' && !compact ? '0 0 auto' : 1,
      font: 'var(--type-page-title)',
      fontSize: compact ? 22 : 28,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), search === 'field' && !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 360,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 14px',
      background: 'var(--cp-gray-100)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar",
    style: {
      border: 0,
      outline: 0,
      background: 'transparent',
      font: 'inherit',
      fontSize: 13,
      flex: 1
    }
  }))), actions, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, search === 'icon' && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    label: "Buscar"
  }), messages !== false && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "message-circle",
    label: "Mensagens",
    badge: messages || undefined
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    label: "Notifica\xE7\xF5es",
    badge: notifications || undefined
  })), user && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 32,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: user.avatar,
    name: user.name,
    size: 40
  }), !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      fontWeight: 500
    }
  }, user.role)))));
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Header.jsx", error: String((e && e.message) || e) }); }

// components/navigation/MobileTabBar.jsx
try { (() => {
function MobileTabBar({
  items = [],
  activeId,
  onSelect,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      height: 'var(--mobile-tabbar-height)',
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--cp-black)',
      borderRadius: '20px 20px 0 0',
      padding: '6px 8px calc(6px + env(safe-area-inset-bottom))',
      ...style
    }
  }, items.map(it => {
    const on = it.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onSelect && onSelect(it.id),
      "aria-label": it.label,
      style: {
        flex: 1,
        minWidth: 44,
        border: 0,
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        cursor: 'pointer',
        color: on ? 'var(--accent)' : 'rgba(254,254,254,.72)',
        font: 'inherit',
        fontSize: 10,
        fontWeight: on ? 700 : 500
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 44,
        height: 28,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: on ? 'var(--accent)' : 'transparent',
        color: on ? 'var(--cp-black)' : 'inherit',
        boxShadow: on ? 'var(--shadow-nav-glow)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 20
    })), it.label);
  }));
}
Object.assign(__ds_scope, { MobileTabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/MobileTabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedTabs.jsx
try { (() => {
function SegmentedTabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  variant = 'dark',
  fullWidth
}) {
  const [inner, setInner] = React.useState(defaultValue ?? (tabs[0] && (tabs[0].value ?? tabs[0])));
  const v = value ?? inner;
  const dark = variant === 'dark';
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      gap: 4,
      padding: 4,
      background: dark ? 'var(--cp-black)' : 'var(--cp-gray-100)',
      borderRadius: 'var(--radius-sm)',
      overflowX: 'auto',
      maxWidth: '100%'
    }
  }, tabs.map(t => {
    const val = t.value ?? t,
      lab = t.label ?? t,
      on = val === v;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": on,
      onClick: () => {
        setInner(val);
        onChange && onChange(val);
      },
      style: {
        flex: fullWidth ? 1 : '0 0 auto',
        height: 32,
        padding: '0 18px',
        border: 0,
        borderRadius: 6,
        cursor: 'pointer',
        font: 'inherit',
        fontSize: 13,
        fontWeight: on ? 700 : 500,
        whiteSpace: 'nowrap',
        background: on ? dark ? 'var(--accent)' : 'var(--cp-white)' : 'transparent',
        color: on ? 'var(--cp-black)' : dark ? 'var(--cp-white)' : 'var(--text-secondary)',
        boxShadow: on && !dark ? 'var(--shadow-card)' : 'none',
        transition: 'background var(--dur-fast)'
      }
    }, lab, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 6,
        fontSize: 11,
        opacity: .8
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { SegmentedTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedTabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function NavItem({
  item,
  active,
  collapsed,
  depth = 0,
  onSelect,
  activeId
}) {
  const [open, setOpen] = React.useState(!!(item.children && item.children.some(c => c.id === activeId)));
  const [h, setH] = React.useState(false);
  const has = item.children && item.children.length && !collapsed;
  const isActive = active || collapsed && item.children && item.children.some(c => c.id === activeId);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    title: collapsed ? item.label : undefined,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    onClick: () => {
      if (has) setOpen(!open);else onSelect && onSelect(item.id);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: depth ? 38 : 44,
      padding: collapsed ? 0 : '0 ' + (12 + depth * 20) + 'px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      background: isActive ? 'var(--accent)' : h ? 'rgba(255,255,255,.06)' : 'transparent',
      color: isActive ? 'var(--cp-black)' : depth ? 'rgba(254,254,254,.72)' : 'var(--cp-white)',
      boxShadow: isActive ? 'var(--shadow-nav-glow)' : 'none',
      fontSize: depth ? 13 : 14,
      fontWeight: isActive ? 700 : 500,
      transition: 'background var(--dur-fast)',
      width: collapsed ? 44 : 'auto',
      margin: collapsed ? '0 auto' : 0
    }
  }, item.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 20
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, item.label), !collapsed && item.badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      height: 20,
      borderRadius: 999,
      background: isActive ? 'var(--cp-black)' : 'var(--accent)',
      color: isActive ? '#fff' : 'var(--cp-black)',
      fontSize: 11,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 6px'
    }
  }, item.badge) : null, has && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? 'chevron-up' : 'chevron-down',
    size: 16
  })), has && open && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      marginTop: 2
    }
  }, item.children.map(c => /*#__PURE__*/React.createElement(NavItem, {
    key: c.id,
    item: c,
    depth: depth + 1,
    active: c.id === activeId,
    activeId: activeId,
    onSelect: onSelect
  }))));
}
function Sidebar({
  items = [],
  footerItems = [],
  activeId,
  onSelect,
  collapsed,
  onToggle,
  onClose,
  logoSrc,
  compactLabel = 'CP',
  height = '100%',
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
      height,
      flexShrink: 0,
      background: 'var(--surface-sidebar)',
      borderRadius: 'var(--radius-lg)',
      padding: collapsed ? '24px 12px' : '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      transition: 'width var(--dur-slow) var(--ease-standard)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'space-between',
      flexDirection: collapsed ? 'column' : 'row',
      gap: 12,
      padding: collapsed ? 0 : '0 4px 0 12px',
      marginBottom: 24,
      minHeight: 40
    }
  }, collapsed ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: '-.02em',
      color: 'var(--cp-white)'
    }
  }, compactLabel.slice(0, -1), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, compactLabel.slice(-1))) : logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "ConstruktPro",
    style: {
      height: 36,
      width: 'auto',
      maxWidth: 180
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 20,
      color: '#fff'
    }
  }, "ConstruktPro"), (onToggle || onClose) && /*#__PURE__*/React.createElement("button", {
    "aria-label": onClose ? 'Fechar menu' : collapsed ? 'Expandir' : 'Recolher',
    onClick: onClose || onToggle,
    style: {
      width: 32,
      height: 32,
      border: 0,
      background: 'transparent',
      color: 'var(--cp-white)',
      cursor: 'pointer',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: onClose ? 'x' : collapsed ? 'panel-left-open' : 'panel-left-close',
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarWidth: 'none',
      padding: '4px 6px',
      margin: '-4px -6px'
    }
  }, items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    collapsed: collapsed,
    active: it.id === activeId,
    activeId: activeId,
    onSelect: onSelect
  }))), footerItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      paddingTop: 12
    }
  }, footerItems.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    collapsed: collapsed,
    active: it.id === activeId,
    activeId: activeId,
    onSelect: onSelect
  }))));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Stepper.jsx
try { (() => {
function Stepper({
  steps = 4,
  current = 1,
  label,
  progressLabel
}) {
  const pct = Math.round((current - 1) / steps * 100);
  const Dot = ({
    i
  }) => {
    const done = i < current,
      cur = i === current;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        background: done ? 'var(--cp-black)' : 'var(--cp-white)',
        color: done ? '#fff' : cur ? 'var(--cp-black)' : 'var(--text-secondary)',
        border: done ? 0 : '1.5px solid ' + (cur ? 'var(--cp-black)' : 'var(--border-strong)')
      }
    }, done ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 14,
      stroke: 3
    }) : i);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", null, label || 'Etapa ' + current), /*#__PURE__*/React.createElement("span", null, progressLabel || pct + '% concluído')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, Array.from({
    length: steps
  }, (_, k) => {
    const i = k + 1;
    const fill = i < current ? 1 : i === current ? 0.5 : 0;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 2,
        background: 'linear-gradient(90deg,var(--cp-black) ' + fill * 100 + '%,var(--border-default) ' + fill * 100 + '%)'
      }
    }), /*#__PURE__*/React.createElement(Dot, {
      i: i
    }));
  })));
}
Object.assign(__ds_scope, { Stepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Stepper.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/CronogramaScreen.jsx
try { (() => {
function CronogramaScreen({
  mobile,
  narrow
}) {
  const {
    MonthCalendar,
    Card,
    Button,
    Textarea
  } = window.DS;
  const [notes, setNotes] = React.useState([{
    who: 'Carlos Mendes',
    txt: 'Concretagem do bloco B depende de liberação da vistoria. Confirmar com engenheiro responsável.'
  }, {
    who: 'Ana Ribeiro',
    txt: 'Entrega de vergalhões precisa de guindaste no portão 2.'
  }]);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const events = [{
    start: 3,
    end: 5,
    title: 'Fundação · Rota 101',
    sub: 'Equipe 3',
    color: 'var(--cp-data-pink)'
  }, {
    start: 13,
    end: 16,
    title: 'Concretagem',
    sub: 'Vila Nova · Bloco B',
    color: 'var(--cp-data-purple)'
  }, {
    start: 19,
    end: 22,
    title: 'Entrega de aço',
    sub: 'Ed. Aurora',
    color: 'var(--cp-data-yellow)',
    textColor: 'var(--cp-black)'
  }, {
    start: 25,
    end: 27,
    title: 'Vistoria',
    sub: 'Prefeitura',
    color: 'var(--cp-data-turquoise)',
    textColor: 'var(--cp-black)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile || narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 300px',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(MonthCalendar, {
    year: 2025,
    month: 10,
    today: 1,
    events: events,
    compact: mobile
  }), /*#__PURE__*/React.createElement(Card, {
    title: "Anota\xE7\xF5es",
    padding: 16
  }, notes.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: 'var(--cp-gray-50)',
      borderRadius: 12,
      padding: 12,
      fontSize: 12,
      lineHeight: 1.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 13
    }
  }, n.who), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Nota:"), " ", n.txt))), adding && /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "Escreva a anota\xE7\xE3o",
    rows: 3,
    maxLength: 300,
    value: draft,
    onChange: e => setDraft(e.target.value)
  }), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    size: "sm",
    iconLeft: adding ? 'check' : 'plus',
    onClick: () => {
      if (adding && draft.trim()) {
        setNotes([...notes, {
          who: USER.name,
          txt: draft
        }]);
        setDraft('');
      }
      setAdding(!adding);
    }
  }, adding ? 'Salvar anotação' : 'Nova anotação')));
}
window.CronogramaScreen = CronogramaScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/CronogramaScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function HomeScreen({
  mobile,
  narrow,
  go
}) {
  const {
    StatCard,
    Card,
    AreaChart,
    BarChart,
    MiniCalendar,
    MessageItem,
    FilterPill,
    Button
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile || narrow ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))',
      gap: mobile ? 12 : 24
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "24",
    label: "Obras ativas",
    color: "var(--stat-1)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "103",
    label: "Entregas na semana",
    color: "var(--stat-2)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "86",
    label: "Equipes em campo",
    color: "var(--stat-3)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "R$ 342k",
    label: "Receita do m\xEAs",
    color: "var(--stat-4)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile || narrow ? 'minmax(0,1fr)' : 'minmax(0,2fr) minmax(300px,1fr)',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Receita",
    action: /*#__PURE__*/React.createElement(FilterPill, {
      options: ['Últimos 6 meses', 'Último ano', 'Este mês']
    })
  }, /*#__PURE__*/React.createElement(AreaChart, {
    height: mobile ? 160 : 220,
    data: [180, 240, 150, 420, 300, 240, 380, 460],
    labels: mobile ? ['Abr', 'Jun', 'Ago', 'Nov'] : ['Abr 2025', 'Mai 2025', 'Jun 2025', 'Jul 2025', 'Ago 2025', 'Set 2025', 'Out 2025', 'Nov 2025'],
    max: 500,
    highlight: 3,
    format: v => 'R$' + v + 'k'
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Medi\xE7\xF5es",
    action: /*#__PURE__*/React.createElement(FilterPill, {
      options: ['Última semana', 'Último mês']
    })
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 180,
    max: 250,
    series: [{
      key: 'a',
      label: 'Previsto',
      color: 'var(--accent)'
    }, {
      key: 'b',
      label: 'Realizado',
      color: 'var(--cp-black)'
    }],
    data: [{
      label: '29 out',
      a: 220,
      b: 120
    }, {
      label: '30 out',
      a: 170,
      b: 60
    }, {
      label: '31 out',
      a: 200,
      b: 110
    }, {
      label: '1 nov',
      a: 150,
      b: 70
    }, {
      label: '2 nov',
      a: 190,
      b: 90
    }, {
      label: '3 nov',
      a: 140,
      b: 40
    }, {
      label: '4 nov',
      a: 160,
      b: 70
    }].slice(0, mobile ? 5 : 7)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(MiniCalendar, {
    year: 2025,
    month: 10,
    today: 12,
    marked: [13, 16, 17, 19, 26],
    alert: [20],
    onSelect: () => go('cronograma')
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Mensagens recentes",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "link",
      size: "sm",
      onClick: () => go('mensagens')
    }, "Ver tudo"),
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      margin: '-8px -4px 0'
    }
  }, MSGS.map(m => /*#__PURE__*/React.createElement(MessageItem, _extends({
    key: m.id
  }, m, {
    onClick: () => go('mensagens')
  }))))))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/MensagensScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MensagensScreen({
  mobile,
  narrow
}) {
  const {
    MessageItem,
    ChatBubble,
    Avatar,
    Icon,
    IconButton,
    SegmentedTabs
  } = window.DS;
  const [sel, setSel] = React.useState(mobile ? null : 1);
  const [thread, setThread] = React.useState([{
    t: 'Bom dia! O concreto usinado chega amanhã às 7h?',
    m: false,
    time: 'Qui 11:40'
  }, {
    t: 'Bom dia, Carlos. Sim, confirmado com a usina — 3 caminhões.',
    m: true,
    time: 'Qui 11:45'
  }, {
    t: 'Perfeito. A bomba já está reservada?',
    m: false,
    time: 'Qui 11:46'
  }]);
  const [draft, setDraft] = React.useState('');
  const send = () => {
    if (!draft.trim()) return;
    setThread([...thread, {
      t: draft,
      m: true,
      time: 'Agora'
    }]);
    setDraft('');
  };
  const cur = MSGS.find(m => m.id === sel);
  const list = /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 16,
      boxShadow: 'var(--shadow-card)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 40,
      padding: '0 12px',
      background: 'var(--cp-gray-100)',
      borderRadius: 8,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar conversas",
    style: {
      border: 0,
      outline: 0,
      background: 'transparent',
      font: 'inherit',
      fontSize: 13,
      flex: 1
    }
  })), /*#__PURE__*/React.createElement(SegmentedTabs, {
    variant: "light",
    fullWidth: true,
    tabs: [{
      value: 'all',
      label: 'Todas',
      count: 4
    }, {
      value: 'f',
      label: 'Fornecedores'
    }, {
      value: 'c',
      label: 'Clientes'
    }]
  }), MSGS.map(m => /*#__PURE__*/React.createElement(MessageItem, _extends({
    key: m.id
  }, m, {
    active: m.id === sel,
    onClick: () => setSel(m.id)
  }))));
  const chat = cur && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 16,
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: mobile ? 'calc(100vh - 220px)' : 560,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, mobile && /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Voltar",
    onClick: () => setSel(null)
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: cur.name,
    online: cur.online
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 15
    }
  }, cur.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--cp-success-strong)',
      fontWeight: 600
    }
  }, cur.online ? '● Online' : 'Visto por último ontem')), /*#__PURE__*/React.createElement(IconButton, {
    icon: "phone",
    label: "Ligar"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "ellipsis",
    label: "Mais"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflowY: 'auto'
    }
  }, thread.map((b, i) => /*#__PURE__*/React.createElement(ChatBubble, {
    key: i,
    text: b.t,
    mine: b.m,
    time: b.time
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => e.key === 'Enter' && send(),
    placeholder: "Escreva uma mensagem",
    style: {
      flex: 1,
      height: 44,
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '0 14px',
      font: 'inherit',
      fontSize: 14,
      outline: 0
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "send",
    variant: "dark",
    size: 44,
    label: "Enviar",
    onClick: send
  })));
  if (mobile) return sel ? chat : list;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: narrow ? '280px minmax(0,1fr)' : '340px minmax(0,1fr)',
      gap: 24,
      alignItems: 'start'
    }
  }, list, chat);
}
window.MensagensScreen = MensagensScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/MensagensScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ObrasScreen.jsx
try { (() => {
function ObrasScreen({
  mobile,
  go
}) {
  const {
    ListingCard,
    Button,
    SegmentedTabs
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(SegmentedTabs, {
    tabs: ['Todas', 'Em andamento', 'Planejadas', 'Concluídas'],
    variant: "light"
  }), /*#__PURE__*/React.createElement(Button, {
    iconLeft: "plus",
    onClick: () => go('nova')
  }, "Nova obra")), OBRAS.map(o => /*#__PURE__*/React.createElement(ListingCard, {
    key: o.id,
    stacked: mobile,
    title: o.title,
    status: o.status,
    onMore: () => {},
    attrs: [{
      label: 'Prazo',
      value: o.prazo
    }, {
      label: 'Local',
      value: o.local
    }, {
      label: 'Área',
      value: o.area
    }],
    featuresLabel: "Etapas",
    features: o.etapas.map(([icon, label]) => ({
      icon,
      label
    }))
  })));
}
function NovaObraScreen({
  mobile,
  go
}) {
  const {
    Card,
    Stepper,
    OptionRow,
    Input,
    Select,
    Button,
    UploadBox
  } = window.DS;
  const cats = [['shovel', 'Terraplenagem'], ['construction', 'Estrutura'], ['hammer', 'Alvenaria'], ['zap', 'Elétrica'], ['droplets', 'Hidráulica'], ['layers', 'Laje'], ['paintbrush', 'Acabamento'], ['wrench', 'Estrutura metálica'], ['shield-check', 'Segurança do trabalho']];
  const incl = [['truck', 'Transporte'], ['hard-hat', 'Mão de obra'], ['package', 'Materiais'], ['ruler', 'Projeto executivo'], ['shield-check', 'Seguro'], ['file-text', 'Licenças']];
  const grid = {
    display: 'grid',
    gridTemplateColumns: mobile ? '1fr' : 'repeat(3,minmax(0,1fr))',
    columnGap: 48
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(Stepper, {
    steps: 4,
    current: 2
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700
    }
  }, "Sobre esta obra")), /*#__PURE__*/React.createElement(Card, {
    title: "Etapas contratadas"
  }, /*#__PURE__*/React.createElement("div", {
    style: grid
  }, cats.map(([i, l], k) => /*#__PURE__*/React.createElement(OptionRow, {
    key: l,
    icon: i,
    label: l,
    defaultChecked: k === 1 || k === 2
  })))), /*#__PURE__*/React.createElement(Card, {
    title: "Or\xE7amento"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Valor por m\xB2",
    required: true,
    prefix: "R$",
    placeholder: "0,00",
    defaultValue: "4.250,00"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Tipo de obra",
    required: true,
    placeholder: "Selecione",
    options: ['Residencial', 'Comercial', 'Industrial']
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '8px 0 0',
      font: 'var(--type-card-title)'
    }
  }, "O que est\xE1 inclu\xEDdo no valor?"), /*#__PURE__*/React.createElement("div", {
    style: grid
  }, incl.map(([i, l], k) => /*#__PURE__*/React.createElement(OptionRow, {
    key: l,
    icon: i,
    label: l,
    defaultChecked: k < 2
  })))), /*#__PURE__*/React.createElement(Card, {
    title: "Fotos do terreno"
  }, /*#__PURE__*/React.createElement(UploadBox, {
    title: "Enviar fotos",
    formats: "JPG ou PNG, at\xE9 6 imagens de 5 MB",
    height: 150
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12,
      paddingBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: "chevron-left",
    onClick: () => go('obras')
  }, "Voltar"), /*#__PURE__*/React.createElement(Button, {
    iconRight: "chevron-right",
    onClick: () => go('obras')
  }, "Pr\xF3xima etapa")));
}
Object.assign(window, {
  ObrasScreen,
  NovaObraScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ObrasScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/PedidosScreen.jsx
try { (() => {
function PedidosScreen({
  mobile
}) {
  const {
    DataTable,
    Badge,
    Tag,
    IconButton,
    SegmentedTabs,
    Button
  } = window.DS;
  const [f, setF] = React.useState('Todos');
  const rows = PEDIDOS.filter(p => f === 'Todos' || (f === 'Pendentes' ? ['Pendente', 'Novo pedido'].includes(p.status) : f === 'Pagos' ? p.status.startsWith('Pago') : p.status === 'Em trânsito'));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(SegmentedTabs, {
    variant: "light",
    value: f,
    onChange: setF,
    tabs: [{
      value: 'Todos',
      label: 'Todos',
      count: PEDIDOS.length
    }, {
      value: 'Pendentes',
      label: 'Pendentes'
    }, {
      value: 'Em trânsito',
      label: 'Em trânsito'
    }, {
      value: 'Pagos',
      label: 'Pagos'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "sliders-horizontal",
    variant: "outline",
    label: "Filtros"
  }), /*#__PURE__*/React.createElement(Button, {
    iconLeft: "plus"
  }, "Novo pedido"))), mobile ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, rows.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      background: '#fff',
      borderRadius: 16,
      boxShadow: 'var(--shadow-card)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, p.id), /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    tone: STATUS[p.status]
  }, p.status)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, p.item), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, p.fornecedor, " \xB7 ", p.obra), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Tag, null, p.cat), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, p.valor))))) : /*#__PURE__*/React.createElement(DataTable, {
    rows: rows,
    rowKey: r => r.id,
    minWidth: 980,
    columns: [{
      key: 'fornecedor',
      label: 'Fornecedor',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600
        }
      }, r.fornecedor), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.contato))
    }, {
      key: 'id',
      label: 'Pedido'
    }, {
      key: 'obra',
      label: 'Obra'
    }, {
      key: 'item',
      label: 'Item'
    }, {
      key: 'cat',
      label: 'Categoria',
      render: r => /*#__PURE__*/React.createElement(Tag, null, r.cat)
    }, {
      key: 'data',
      label: 'Data'
    }, {
      key: 'valor',
      label: 'Valor',
      align: 'right'
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: STATUS[r.status]
      }, r.status)
    }, {
      key: 'acoes',
      label: '',
      render: () => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement(IconButton, {
        icon: "pencil",
        size: 28,
        label: "Editar"
      }), /*#__PURE__*/React.createElement(IconButton, {
        icon: "trash-2",
        variant: "danger",
        size: 28,
        label: "Excluir"
      }))
    }]
  }));
}
window.PedidosScreen = PedidosScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/PedidosScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Shell.jsx
try { (() => {
function useWidth() {
  const [w, setW] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}
function useMobile() {
  const q = () => window.innerWidth < 900;
  const [m, setM] = React.useState(q());
  React.useEffect(() => {
    const h = () => setM(q());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}
const TITLES = {
  home: 'Início',
  obras: 'Obras',
  nova: 'Nova obra',
  pedidos: 'Pedidos de material',
  cronograma: 'Cronograma',
  mensagens: 'Mensagens',
  perfil: 'Meu perfil',
  equipes: 'Equipes',
  financeiro: 'Financeiro',
  config: 'Configurações'
};
function Placeholder({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 16,
      padding: 48,
      textAlign: 'center',
      color: 'var(--text-secondary)',
      boxShadow: 'var(--shadow-card)'
    }
  }, "A tela \u201C", title, "\u201D n\xE3o faz parte deste UI kit.");
}
function App() {
  const {
    Sidebar,
    Header,
    MobileTabBar
  } = window.DS;
  const mobile = useMobile();
  const narrow = useWidth() < 1200;
  const init = new URLSearchParams(location.search).get('screen') || localStorage.getItem('cp-admin-screen') || 'home';
  const [page, setPage] = React.useState(init);
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const go = p => {
    if (p === 'menu') {
      setDrawer(true);
      return;
    }
    if (['pt', 'en', 'es', 'sair', 'idioma'].includes(p)) return;
    setPage(p);
    setDrawer(false);
    localStorage.setItem('cp-admin-screen', p);
    window.scrollTo(0, 0);
  };
  const S = {
    home: HomeScreen,
    obras: ObrasScreen,
    nova: NovaObraScreen,
    pedidos: PedidosScreen,
    cronograma: CronogramaScreen,
    mensagens: MensagensScreen
  }[page];
  const active = page === 'nova' ? 'obras' : page;
  const body = S ? /*#__PURE__*/React.createElement(S, {
    mobile: mobile,
    narrow: narrow,
    go: go
  }) : /*#__PURE__*/React.createElement(Placeholder, {
    title: TITLES[page] || page
  });
  const logo = '../../../assets/logo-negativo.svg';
  if (mobile) return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      paddingBottom: 'calc(var(--mobile-tabbar-height) + 16px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      background: 'var(--bg-app)',
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(Header, {
    title: TITLES[page] || '',
    user: USER,
    compact: true,
    search: "none",
    messages: false,
    notifications: 3,
    onMenu: () => setDrawer(true)
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      padding: 16
    }
  }, body), /*#__PURE__*/React.createElement(MobileTabBar, {
    items: TABS,
    activeId: TABS.some(t => t.id === active) ? active : 'menu',
    onSelect: go,
    style: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 6
    }
  }), drawer && /*#__PURE__*/React.createElement("div", {
    onClick: () => setDrawer(false),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 10,
      background: 'var(--scrim)',
      backdropFilter: 'blur(4px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 8,
      bottom: 8,
      left: 8
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    logoSrc: logo,
    items: NAV,
    footerItems: NAV_FOOT,
    activeId: active,
    onSelect: go,
    onClose: () => setDrawer(false),
    style: {
      width: 'min(280px, calc(100vw - 48px))'
    }
  }))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 32,
      padding: 16,
      minHeight: '100vh',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 16,
      height: 'calc(100vh - 32px)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    logoSrc: logo,
    items: NAV,
    footerItems: NAV_FOOT,
    activeId: active,
    onSelect: go,
    collapsed: collapsed,
    onToggle: () => setCollapsed(!collapsed)
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      paddingRight: 16,
      paddingBottom: 32
    }
  }, /*#__PURE__*/React.createElement(Header, {
    title: TITLES[page] || '',
    user: USER,
    notifications: 3,
    messages: 3
  }), body));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/data.jsx
try { (() => {
const USER = {
  name: 'Marina Costa',
  role: 'Admin'
};
const NAV = [{
  id: 'home',
  label: 'Início',
  icon: 'layout-grid'
}, {
  id: 'perfil',
  label: 'Meu perfil',
  icon: 'user'
}, {
  id: 'obras',
  label: 'Obras',
  icon: 'building-2'
}, {
  id: 'pedidos',
  label: 'Pedidos',
  icon: 'clipboard-list',
  badge: 4
}, {
  id: 'equipes',
  label: 'Equipes',
  icon: 'hard-hat'
}, {
  id: 'cronograma',
  label: 'Cronograma',
  icon: 'calendar'
}, {
  id: 'financeiro',
  label: 'Financeiro',
  icon: 'wallet'
}, {
  id: 'mensagens',
  label: 'Mensagens',
  icon: 'message-circle',
  badge: 3
}];
const NAV_FOOT = [{
  id: 'idioma',
  label: 'Idioma',
  icon: 'globe',
  children: [{
    id: 'pt',
    label: 'Português'
  }, {
    id: 'en',
    label: 'English'
  }, {
    id: 'es',
    label: 'Español'
  }]
}, {
  id: 'config',
  label: 'Configurações',
  icon: 'settings'
}, {
  id: 'sair',
  label: 'Sair',
  icon: 'log-out'
}];
const TABS = [{
  id: 'home',
  label: 'Início',
  icon: 'layout-grid'
}, {
  id: 'obras',
  label: 'Obras',
  icon: 'building-2'
}, {
  id: 'pedidos',
  label: 'Pedidos',
  icon: 'clipboard-list'
}, {
  id: 'cronograma',
  label: 'Agenda',
  icon: 'calendar'
}, {
  id: 'menu',
  label: 'Menu',
  icon: 'menu'
}];
const OBRAS = [{
  id: 1,
  title: 'Residencial Vila Nova — Bloco B',
  status: 'var(--cp-success-strong)',
  prazo: '14 meses',
  local: 'Curitiba | PR',
  area: '4.200 m²',
  etapas: [['shovel', 'Fundação'], ['hammer', 'Alvenaria'], ['zap', 'Elétrica']]
}, {
  id: 2,
  title: 'Edifício Comercial Aurora',
  status: 'var(--cp-data-yellow)',
  prazo: '20 meses',
  local: 'Joinville | SC',
  area: '9.800 m²',
  etapas: [['construction', 'Estrutura'], ['droplets', 'Hidráulica'], ['layers', 'Laje']]
}, {
  id: 3,
  title: 'Galpão Logístico Rota 101',
  status: 'var(--cp-error)',
  prazo: '8 meses',
  local: 'Itajaí | SC',
  area: '12.500 m²',
  etapas: [['shovel', 'Terraplenagem'], ['wrench', 'Estrutura metálica'], ['paintbrush', 'Acabamento']]
}];
const STATUS = {
  'Novo pedido': 'danger',
  'Em trânsito': 'neutral',
  'Pendente': 'warning',
  'Recebido': 'info',
  'Pago 100%': 'success',
  'Pago 25%': 'success',
  'Falhou': 'error'
};
const PEDIDOS = [{
  id: 'PC-2052',
  fornecedor: 'Votoran Materiais',
  contato: 'vendas@votoran.com.br',
  obra: 'Vila Nova · Bloco B',
  item: 'Cimento CP-II 50kg × 400',
  cat: 'Estrutural',
  data: '26 nov',
  valor: 'R$ 15.200',
  status: 'Pago 100%'
}, {
  id: 'PC-2053',
  fornecedor: 'Aço Forte',
  contato: 'pedidos@acoforte.com',
  obra: 'Ed. Aurora',
  item: 'Vergalhão 10mm × 1.200',
  cat: 'Estrutural',
  data: '26 nov',
  valor: 'R$ 62.400',
  status: 'Pendente'
}, {
  id: 'PC-2054',
  fornecedor: 'Cerâmica Sul',
  contato: 'comercial@ceramicasul.com',
  obra: 'Vila Nova · Bloco B',
  item: 'Bloco cerâmico × 18.000',
  cat: 'Alvenaria',
  data: '27 nov',
  valor: 'R$ 21.600',
  status: 'Em trânsito'
}, {
  id: 'PC-2055',
  fornecedor: 'HidroMax',
  contato: 'contato@hidromax.com',
  obra: 'Galpão Rota 101',
  item: 'Tubo PVC 100mm × 300',
  cat: 'Hidráulica',
  data: '28 nov',
  valor: 'R$ 8.940',
  status: 'Novo pedido'
}, {
  id: 'PC-2056',
  fornecedor: 'Elétrica Brasil',
  contato: 'vendas@eletbr.com',
  obra: 'Ed. Aurora',
  item: 'Cabo 6mm × 5.000 m',
  cat: 'Elétrica',
  data: '28 nov',
  valor: 'R$ 17.500',
  status: 'Recebido'
}, {
  id: 'PC-2057',
  fornecedor: 'Areial Itajaí',
  contato: 'areial@itajai.com',
  obra: 'Galpão Rota 101',
  item: 'Areia média × 80 m³',
  cat: 'Agregados',
  data: '29 nov',
  valor: 'R$ 11.200',
  status: 'Falhou'
}];
const MSGS = [{
  id: 1,
  name: 'Carlos Mendes',
  preview: 'Olá! Gostaria de confirmar a entrega do concreto…',
  time: 'Agora',
  unread: 3,
  online: true
}, {
  id: 2,
  name: 'Ana Ribeiro',
  preview: 'Segue a medição do bloco B em anexo.',
  time: '14:36',
  unread: 1
}, {
  id: 3,
  name: 'João Pereira',
  preview: 'A equipe de elétrica chega às 8h.',
  time: 'Ontem'
}, {
  id: 4,
  name: 'Fernanda Lima',
  preview: 'Podemos antecipar a vistoria?',
  time: 'Terça'
}];
Object.assign(window, {
  USER,
  NAV,
  NAV_FOOT,
  TABS,
  OBRAS,
  STATUS,
  PEDIDOS,
  MSGS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.AreaChart = __ds_scope.AreaChart;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.MessageItem = __ds_scope.MessageItem;

__ds_ns.MiniCalendar = __ds_scope.MiniCalendar;

__ds_ns.MonthCalendar = __ds_scope.MonthCalendar;

__ds_ns.PieChart = __ds_scope.PieChart;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FilterPill = __ds_scope.FilterPill;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.OptionRow = __ds_scope.OptionRow;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.UploadBox = __ds_scope.UploadBox;

__ds_ns.ListingCard = __ds_scope.ListingCard;

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.MobileTabBar = __ds_scope.MobileTabBar;

__ds_ns.SegmentedTabs = __ds_scope.SegmentedTabs;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.Stepper = __ds_scope.Stepper;

})();
