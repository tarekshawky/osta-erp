"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO_SRC, DEFAULT_CERTIFICATE_LOGO_SRC } from "@/lib/logo";

export function LogoImage({
  className,
  type = "main",
}: {
  className?: string;
  type?: "main" | "certificate";
}) {
  const fallback = type === "certificate" ? DEFAULT_CERTIFICATE_LOGO_SRC : DEFAULT_LOGO_SRC;
  const [src, setSrc] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    const qs = type === "certificate" ? "?type=certificate" : "";
    fetch(`/api/logo${qs}`)
      .then((res) => res.json())
      .then((data: { src?: string }) => {
        if (!cancelled && data.src) setSrc(data.src);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="OSTA" className={className} />;
}
