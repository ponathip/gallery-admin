"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ interval = 10000 }: { interval?: number }) {
  const router = useRouter();

    useEffect(() => {
    const timer = setInterval(() => {
        if (document.visibilityState === "visible") {
        router.refresh();
        }
    }, interval);

    return () => clearInterval(timer);
    }, [router, interval]);

  return null;
}