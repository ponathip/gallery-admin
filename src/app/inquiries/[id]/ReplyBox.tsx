"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ReplyBox({ id }: { id: number }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;

    try {
      setSending(true);

      await apiFetch(`/inquiries/${id}/reply`, {
        method: "POST",
        json: { message },
      });

      alert("ส่งอีเมลสำเร็จ");
      setMessage("");
    } catch (error) {
      console.error(error);
      alert("ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 border-t border-black/10 pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-black/40">
        Reply Email
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write reply message..."
        className="mt-4 h-40 w-full rounded-xl border border-black/10 bg-[#f7f7f4] p-4 text-sm outline-none focus:border-black"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="mt-4 rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.18em] text-white disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send Reply"}
      </button>
    </div>
  );
}