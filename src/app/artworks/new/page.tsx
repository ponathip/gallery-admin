"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { uploadToS3 } from "@/lib/uploadToS3";
import { optimizeImage } from "@/lib/optimizeImage";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { uploadToS3WithProgress } from "@/lib/uploadToS3WithProgress";

type PreviewImage = {
  id: string;
  file: File;
  url: string;
};

export default function CreateArtworkPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<PreviewImage | null>(null);
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [year, setYear] = useState("");
  const [medium, setMedium] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("Mixed Media");
  const [status, setStatus] = useState("available");
  const [description, setDescription] = useState("");
  const [descriptionTh, setDescriptionTh] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const isBusy = saving || uploadProgress !== null;

  const slug = useMemo(() => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }, [title]);

  function handleCoverChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setCoverImage({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    });
  }

  function handleImagesChange(fileList: FileList | null) {
    if (!fileList) return;

    const nextImages = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...nextImages]);
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function uploadArtworkImage(
    file: File,
    slug: string,
    onProgress?: (percent: number) => void,
  ) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const uploadedLarge = await uploadToS3WithProgress(
      largeFile,
      `artworks/${slug}/large`,
      (p) => onProgress?.(Math.round(p.percent * 0.7)),
    );

    const uploadedThumb = await uploadToS3WithProgress(
      thumbFile,
      `artworks/${slug}/thumb`,
      (p) => onProgress?.(70 + Math.round(p.percent * 0.3)),
    );

    return {
      imageUrl: uploadedLarge.url,
      s3Key: uploadedLarge.key,
      thumbUrl: uploadedThumb.url,
      thumbS3Key: uploadedThumb.key,
    };
  }

  async function uploadArtworkCover(file: File, slug: string) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const uploadedLarge = await uploadToS3WithProgress(
      largeFile,
      `artworks/${slug}/cover`,
      (p) => setUploadProgress(Math.round(p.percent * 0.7)),
    );

    const uploadedThumb = await uploadToS3WithProgress(
      thumbFile,
      `artworks/${slug}/cover-thumb`,
      (p) => setUploadProgress(70 + Math.round(p.percent * 0.3)),
    );

    return {
      coverImageUrl: uploadedLarge.url,
      coverS3Key: uploadedLarge.key,
      coverThumbUrl: uploadedThumb.url,
      coverThumbS3Key: uploadedThumb.key,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setUploadProgress(0);
    try {
      const uploadedCover = coverImage
        ? await uploadArtworkCover(coverImage.file, slug)
        : null;

      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadArtworkImage(
          images[i].file,
          slug,
          (percent) => {
            const totalPercent = Math.round(
              ((i + percent / 100) / images.length) * 100,
            );
            setUploadProgress(totalPercent);
          },
        );

        uploadedImages.push(uploaded);
      }

      const payload = {
        title,
        slug,
        year,
        medium,
        size,
        category,
        status: status.toLowerCase(),
        coverImageUrl: uploadedCover?.coverImageUrl ?? null,
        coverS3Key: uploadedCover?.coverS3Key ?? null,
        coverThumbUrl: uploadedCover?.coverThumbUrl ?? null,
        coverThumbS3Key: uploadedCover?.coverThumbS3Key ?? null,
        description,
        descriptionTh,
        images: uploadedImages.map((img, index) => ({
          imageUrl: img.imageUrl,
          s3Key: img.s3Key,
          thumbUrl: img.thumbUrl,
          thumbS3Key: img.thumbS3Key,
          sortOrder: index + 1,
        })),
      };

      const promise = apiFetch("/artworks", {
        method: "POST",
        json: payload,
      });

      toast.promise(promise, {
        loading: "กำลังบันทึก...",
        success: "บันทึกสำเร็จ 🎉",
        error: "บันทึกไม่สำเร็จ ❌",
      });
      router.push("/artworks");
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  }

  return (
    <AdminLayout title="Create Artwork">
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1fr_420px]"
      >
        <section className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Artwork Information</h2>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Silent Breeze"
                  required
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Slug
                </label>
                <input
                  value={slug}
                  readOnly
                  className="mt-3 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-4 text-black/50 outline-none"
                  placeholder="auto-generated"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Year
                  </label>
                  <input
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="2026"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  >
                    <option>Mixed Media</option>
                    <option>Painting</option>
                    <option>Paper Work</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Medium
                  </label>
                  <input
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="Mixed Media on Canvas"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Size
                  </label>
                  <input
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="120 × 150 cm"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                >
                  <option>Available</option>
                  <option>Reserved</option>
                  <option>Sold</option>
                  <option>Private</option>
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Description EN
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Artwork statement..."
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Description TH
                </label>
                <textarea
                  value={descriptionTh}
                  onChange={(e) => setDescriptionTh(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="คำอธิบายผลงาน..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Gallery Images</h2>
            <p className="mt-2 text-sm text-black/50">
              Upload multiple images: front view, detail, texture, and room
              mockup.
            </p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-[#f7f7f4] px-6 py-12 text-center transition hover:border-black">
              <span className="font-serif text-3xl">＋</span>
              <span className="mt-3 text-sm text-black/60">
                Click to upload multiple images
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                disabled={isBusy}
                className="hidden"
                onChange={(event) => handleImagesChange(event.target.files)}
              />
            </label>

            {images.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative overflow-hidden rounded-2xl bg-black/5"
                  >
                    <img
                      src={image.url}
                      alt={`Artwork preview ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => removeImage(image.id)}
                      className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-xs opacity-0 shadow transition group-hover:opacity-100"
                    >
                      Remove
                    </button>

                    <div className="absolute bottom-3 left-3 rounded-full bg-black px-3 py-1 text-[11px] text-white">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Cover Image</h2>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#f7f7f4] text-center transition hover:border-black">
              {coverImage ? (
                <img
                  src={coverImage.url}
                  alt="Cover preview"
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div className="px-6 py-20">
                  <span className="font-serif text-3xl">＋</span>
                  <p className="mt-3 text-sm text-black/60">
                    Upload cover image
                  </p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                disabled={isBusy}
                className="hidden"
                onChange={(event) => handleCoverChange(event.target.files)}
              />
            </label>

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="mt-4 w-full rounded-full border border-black/20 px-5 py-3 text-sm transition hover:border-black"
              >
                Remove Cover
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Publish</h2>

            <label className="mt-6 flex items-center justify-between border-y border-black/10 py-5">
              <span className="text-sm text-black/60">Published</span>
              <input type="checkbox" defaultChecked />
            </label>

            <label className="flex items-center justify-between border-b border-black/10 py-5">
              <span className="text-sm text-black/60">Featured on Home</span>
              <input type="checkbox" />
            </label>

            {uploadProgress !== null && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-black/50">
                  <span>{saving ? "Saving..." : "Uploading..."}</span>
                  <span>{uploadProgress}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-black/80"
            >
              {isBusy ? "Processing..." : "Save Artwork"} <span>→</span>
            </button>
          </div>
        </aside>
      </form>
    </AdminLayout>
  );
}
