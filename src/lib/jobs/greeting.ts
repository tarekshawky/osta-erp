import { waDigits } from "./phone";

// The WhatsApp greeting for an applicant, in their preferred language, naming the job. Arabic speakers get Arabic;
// everyone else (English or another language) gets English.
export function greetingText(preferredLang: string, name: string, jobTitle: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return preferredLang === "ar"
    ? `مرحباً ${first}، معك فريق التوظيف في خدمات اسطا. بخصوص طلبك للعمل في وظيفة "${jobTitle}"، نود التواصل معك. هل يناسبك التحدث الآن؟`
    : `Hello ${first}, this is the Osta Services hiring team. Regarding your application for "${jobTitle}", we'd like to speak with you. Is now a good time?`;
}

export const whatsappLink = (e164: string, text: string) => `https://wa.me/${waDigits(e164)}?text=${encodeURIComponent(text)}`;
