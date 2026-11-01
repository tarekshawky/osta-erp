// Booking type descriptions were written for AC work. They now say {service}, which the booking page replaces with the service being booked.
// A description is only replaced while it is still the original AC wording (anything an admin edited is left alone).
import { prisma } from "../src/lib/prisma";

const TEXT: Record<string, { oldEn: string; en: string; ar: string }> = {
  STANDARD: {
    oldEn: "Book a regular home maintenance or AC service appointment during our standard working hours. Appointment availability depends on your location, service type, and technician schedule.",
    en: "Book a regular {service} appointment during our standard working hours. Appointment availability depends on your location, the service, and the technician schedule.",
    ar: "احجز موعدًا عاديًا لخدمة {service} خلال ساعات العمل المعتادة. يعتمد توفر الموعد على موقعك والخدمة وجدول الفنيين.",
  },
  PRIORITY: {
    oldEn: "Request priority scheduling for urgent AC repair or home maintenance. Same-day appointments are subject to technician availability, service coverage, and confirmation by Osta Services.",
    en: "Request priority scheduling for an urgent {service} visit. Same-day appointments are subject to technician availability, service coverage, and confirmation by Osta Services.",
    ar: "اطلب أولوية في تحديد موعد لزيارة {service} العاجلة. تخضع مواعيد نفس اليوم لتوفر الفنيين ونطاق التغطية وتأكيد خدمات اسطا.",
  },
  EMERGENCY: {
    oldEn: "For urgent AC or home maintenance issues that may require immediate attention, subject to service availability. Contact Osta Services to confirm technician availability, estimated arrival time, and applicable charges before booking confirmation.",
    en: "For urgent {service} issues that may require immediate attention, subject to service availability. Contact Osta Services to confirm technician availability, estimated arrival time, and applicable charges before booking confirmation.",
    ar: "لحالات {service} العاجلة التي قد تتطلب تدخلًا سريعًا، حسب توفر الخدمة. تواصل مع خدمات اسطا لتأكيد توفر الفني والوقت المتوقع للوصول والرسوم المطبقة قبل تأكيد الحجز.",
  },
};

async function main() {
  for (const [code, t] of Object.entries(TEXT)) {
    const row = await prisma.bookingType.findUnique({ where: { code }, select: { id: true, descriptionEn: true } });
    if (!row) { console.log(code, "missing"); continue; }
    if (row.descriptionEn !== t.oldEn) { console.log(code, "already changed: left alone"); continue; }
    await prisma.bookingType.update({ where: { id: row.id }, data: { descriptionEn: t.en, descriptionAr: t.ar } });
    console.log(code, "updated");
  }
}
main().finally(() => prisma.$disconnect());
