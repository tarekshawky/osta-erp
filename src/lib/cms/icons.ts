// Icon names the public site can draw (kept in sync with src/components/DynamicIcon.tsx in osta-bookig-users).
// Matching is forgiving: ShieldCheck, shield-check and "shield check" are the same icon. Anything else shows a circle.
export const ICON_NAMES = [
  "Award", "BadgeCheck", "BadgeDollarSign", "Banknote", "Building", "Building2", "Calendar", "CalendarCheck", "Check", "CheckCircle2", "Circle", "Clock", "ClipboardCheck",
  "CreditCard", "Droplets", "Factory", "Fan", "FileCheck", "Gauge", "Gift", "Globe", "Hammer", "Headphones", "Heart", "HeartHandshake", "House", "Leaf", "Lightbulb", "Mail",
  "MapPin", "MapPinned", "Medal", "MessageCircle", "Package", "PaintRoller", "Percent", "Phone", "Plug", "Receipt", "Recycle", "Settings", "ShieldCheck", "Smartphone",
  "Smile", "Snowflake", "Sparkles", "Star", "Tag", "Thermometer", "ThumbsUp", "Timer", "Trophy", "Truck", "UserCheck", "Users", "Wind", "Wrench", "Zap",
] as const;
