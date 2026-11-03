import { Poppins, Tajawal } from "next/font/google";

export const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

// The admin portal's Latin typeface (the approved design uses Poppins).
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
