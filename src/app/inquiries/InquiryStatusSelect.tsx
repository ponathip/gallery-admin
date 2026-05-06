"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Swal from "sweetalert2";

const statuses = ["new", "read", "replied", "archived"];

export default function InquiryStatusSelect({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(nextStatus: string) {
    const oldStatus = value;

    try {
      setValue(nextStatus);
      setSaving(true);

      await apiFetch(`/inquiries/${id}/status`, {
        method: "PUT",
        json: {
          status: nextStatus,
        },
      });
    } catch (error) {
      console.error(error);
      setValue(oldStatus);
      Swal.fire({
        icon: "error",
        title: "อัปเดตสถานะไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(event) => handleChange(event.target.value)}
      className="rounded-full bg-black/5 px-3 py-2 text-xs text-black/60 outline-none disabled:opacity-50"
    >
      {statuses.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
