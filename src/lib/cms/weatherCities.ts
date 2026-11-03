// The UAE cities the Weather block can show (Open-Meteo needs coordinates). The website repeats this list: keep both in step.
export const WEATHER_CITIES = [
  { slug: "dubai", nameEn: "Dubai", nameAr: "دبي", lat: 25.2048, lon: 55.2708 },
  { slug: "abu-dhabi", nameEn: "Abu Dhabi", nameAr: "أبوظبي", lat: 24.4539, lon: 54.3773 },
  { slug: "sharjah", nameEn: "Sharjah", nameAr: "الشارقة", lat: 25.3463, lon: 55.4209 },
  { slug: "ajman", nameEn: "Ajman", nameAr: "عجمان", lat: 25.4052, lon: 55.5136 },
  { slug: "umm-al-quwain", nameEn: "Umm Al Quwain", nameAr: "أم القيوين", lat: 25.5647, lon: 55.5552 },
  { slug: "ras-al-khaimah", nameEn: "Ras Al Khaimah", nameAr: "رأس الخيمة", lat: 25.7895, lon: 55.9432 },
  { slug: "fujairah", nameEn: "Fujairah", nameAr: "الفجيرة", lat: 25.1288, lon: 56.3265 },
  { slug: "al-ain", nameEn: "Al Ain", nameAr: "العين", lat: 24.2075, lon: 55.7447 },
] as const;

export const WEATHER_CITY_SLUGS = WEATHER_CITIES.map((c) => c.slug) as unknown as readonly [string, ...string[]];
