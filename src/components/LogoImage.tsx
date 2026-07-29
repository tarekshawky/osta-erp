"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO_SRC } from "@/lib/logo";

export function LogoImage({ className }: { className?: string }) {
  const [src, setSrc] = useState(DEFAULT_LOGO_SRC);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/logo")
      .then((res) => res.json())
      .then((data: { src?: string }) => {
        if (!cancelled && data.src) setSrc(data.src);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="OSTA" className={className} />;
}
