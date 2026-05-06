"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import { optimizeImage } from "@/lib/optimizeImage";
import { uploadToS3WithProgress } from "@/lib/uploadToS3WithProgress";

type Settings = Record<string, string | null>;

export default function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings;
}) {
  const [settings, setSettings] = useState<Settings>({
    site_name: initialSettings.site_name ?? "",
    email: initialSettings.email ?? "",
    instagram: initialSettings.instagram ?? "",
    facebook: initialSettings.facebook ?? "",
    line: initialSettings.line ?? "",
    location_en: initialSettings.location_en ?? "",
    location_th: initialSettings.location_th ?? "",
    default_title: initialSettings.default_title ?? "",
    default_description: initialSettings.default_description ?? "",
    default_og_image: initialSettings.default_og_image ?? "",
    profile_image_url: initialSettings.profile_image_url ?? "",
    profile_s3_key: initialSettings.profile_s3_key ?? "",
    about_title_en: initialSettings.about_title_en ?? "",
    about_title_th: initialSettings.about_title_th ?? "",
    bio_en: initialSettings.bio_en ?? "",
    bio_th: initialSettings.bio_th ?? "",
    artist_statement_en: initialSettings.artist_statement_en ?? "",
    artist_statement_th: initialSettings.artist_statement_th ?? "",
  });

  const [saving, setSaving] = useState(false);

  function update(key: string, value: string) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);

      await apiFetch("/settings", {
        method: "PUT",
        json: settings,
      });

      toast.success("Settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSettingImage(file: File, folder: string) {
    const optimized = await optimizeImage(file, "large");

    const uploaded = await uploadToS3WithProgress(
        optimized,
        `settings/${folder}`,
    );

    return {
        url: uploaded.url,
        key: uploaded.key,
    };
    }

    async function handleProfileImageChange(fileList: FileList | null) {
  const file = fileList?.[0];
  if (!file) return;

  try {
    setSaving(true);

    const uploaded = await uploadSettingImage(file, "profile");

    setSettings((prev) => ({
      ...prev,
      profile_image_url: uploaded.url,
      profile_s3_key: uploaded.key,
    }));

    toast.success("Profile image uploaded");
  } catch (error) {
    console.error(error);
    toast.error("Upload failed");
  } finally {
    setSaving(false);
  }
}

async function handleOgImageChange(fileList: FileList | null) {
  const file = fileList?.[0];
  if (!file) return;

  try {
    setSaving(true);

    const uploaded = await uploadSettingImage(file, "og");

    setSettings((prev) => ({
      ...prev,
      default_og_image: uploaded.url,
      default_og_s3_key: uploaded.key,
    }));

    toast.success("OG image uploaded");
  } catch (error) {
    console.error(error);
    toast.error("Upload failed");
  } finally {
    setSaving(false);
  }
}

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[1fr_420px]"
    >
      <section className="space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Site Profile</h2>

          <div className="mt-6 grid gap-5">
            <Input
              label="Site Name"
              value={settings.site_name ?? ""}
              onChange={(value) => update("site_name", value)}
              placeholder="PhanatchaNuch"
            />

            <Input
              label="Email"
              value={settings.email ?? ""}
              onChange={(value) => update("email", value)}
              placeholder="hello@example.com"
            />

            <Input
              label="Location EN"
              value={settings.location_en ?? ""}
              onChange={(value) => update("location_en", value)}
              placeholder="Thailand"
            />

            <Input
              label="Location TH"
              value={settings.location_th ?? ""}
              onChange={(value) => update("location_th", value)}
              placeholder="ประเทศไทย"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">SEO</h2>

          <div className="mt-6 grid gap-5">
            <Input
              label="Default Title"
              value={settings.default_title ?? ""}
              onChange={(value) => update("default_title", value)}
              placeholder="PhanatchaNuch"
            />

            <Textarea
              label="Default Description"
              value={settings.default_description ?? ""}
              onChange={(value) => update("default_description", value)}
              placeholder="Original artworks, wall painting, and exhibitions..."
            />

            <div>
  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
    Default OG Image
  </label>

  {settings.default_og_image && (
    <img
      src={settings.default_og_image}
      alt="Default OG"
      className="mt-3 aspect-[1200/630] w-full max-w-md rounded-xl object-cover"
    />
  )}

  <input
    type="file"
    accept="image/*"
    disabled={saving}
    onChange={(e) => handleOgImageChange(e.target.files)}
    className="mt-4 block w-full text-sm"
  />
</div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Artist Profile</h2>

                <div className="mt-6 grid gap-5">
                <div>
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Profile Image
        </label>

        {settings.profile_image_url && (
            <img
            src={settings.profile_image_url}
            alt="Profile"
            className="mt-3 aspect-[4/5] w-full max-w-xs rounded-xl object-cover"
            />
        )}

        <input
            type="file"
            accept="image/*"
            disabled={saving}
            onChange={(e) => handleProfileImageChange(e.target.files)}
            className="mt-4 block w-full text-sm"
        />
        </div>

            <Input
              label="About Title EN"
              value={settings.about_title_en ?? ""}
              onChange={(value) => update("about_title_en", value)}
            />

            <Input
              label="About Title TH"
              value={settings.about_title_th ?? ""}
              onChange={(value) => update("about_title_th", value)}
            />

            <Textarea
              label="Bio EN"
              value={settings.bio_en ?? ""}
              onChange={(value) => update("bio_en", value)}
            />

            <Textarea
              label="Bio TH"
              value={settings.bio_th ?? ""}
              onChange={(value) => update("bio_th", value)}
            />

            <Textarea
              label="Artist Statement EN"
              value={settings.artist_statement_en ?? ""}
              onChange={(value) => update("artist_statement_en", value)}
            />

            <Textarea
              label="Artist Statement TH"
              value={settings.artist_statement_th ?? ""}
              onChange={(value) => update("artist_statement_th", value)}
            />
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Social Links</h2>

          <div className="mt-6 grid gap-5">
            <Input
              label="Instagram"
              value={settings.instagram ?? ""}
              onChange={(value) => update("instagram", value)}
              placeholder="phanatchanuch"
            />

            <Input
              label="Facebook"
              value={settings.facebook ?? ""}
              onChange={(value) => update("facebook", value)}
              placeholder="https://facebook.com/..."
            />

            <Input
              label="LINE"
              value={settings.line ?? ""}
              onChange={(value) => update("line", value)}
              placeholder="@lineid"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Save</h2>

          <p className="mt-3 text-sm leading-7 text-black/50">
            These settings are used by the public website, SEO metadata, contact
            details, and social links.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-black/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"} <span>→</span>
          </button>
        </div>
      </aside>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-black/40">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-black/40">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 h-32 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
      />
    </div>
  );
}
