"use client";

import { useEffect, useRef } from "react";

export default function NotificationWatcher() {
  const lastCount = useRef(0);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/inquiries/count?status=new`
        );
        const data = await res.json();

        const count = data.count ?? 0;

        // 🔥 มี inquiry ใหม่
        if (count > lastCount.current) {
          // 🔊 เล่นเสียง
          const audio = new Audio("/notify.mp3");
          audio.play().catch(() => {});

          // 💬 popup
          alert("📩 New inquiry received!");
        }

        lastCount.current = count;
      } catch (e) {
        console.error(e);
      }
    }

    check(); // run ครั้งแรก
    const timer = setInterval(check, 5000);

    return () => clearInterval(timer);
  }, []);

  return null;
}