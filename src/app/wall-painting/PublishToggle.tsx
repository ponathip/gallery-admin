"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function PublishToggle({
  id,
  isPublished,
}: {
  id: number;
  isPublished: boolean;
}) {
  const [checked, setChecked] = useState(isPublished);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: boolean) {
    const old = checked;

    try {
      setChecked(next);
      setSaving(true);

      await apiFetch(`/wall-projects/${id}/publish`, {
        method: "PATCH",
        json: { isPublished: next },
      });
    } catch (error) {
      console.error(error);
      setChecked(old);
      alert("Update publish failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={saving}
      onChange={(e) => handleChange(e.target.checked)}
    />
  );
}