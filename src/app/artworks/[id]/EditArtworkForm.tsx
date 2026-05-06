"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadToS3 } from "@/lib/uploadToS3";
import { deleteFromS3 } from "@/lib/deleteFromS3";
import { optimizeImage } from "@/lib/optimizeImage";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { apiFetch } from "@/lib/api";
import { apiData } from "@/lib/api";
import Swal from "sweetalert2";
import { uploadToS3WithProgress } from "@/lib/uploadToS3WithProgress";

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type Artwork = {
  id: number;
  slug: string;
  title: string;
  year: string;
  medium: string;
  size: string;
  category: string;
  status: string;
  coverImageUrl: string | null;
  coverS3Key: string | null;
  coverThumbUrl: string | null;
  coverThumbS3Key: string | null;
  description: string;
  descriptionTh: string;
  viewCount: number;
  likeCount: number;
  isPublished: number;
  images: {
    id: number;
    imageUrl: string;
    s3Key: string | null;
    thumbUrl: string | null;
    thumbS3Key: string | null;
    altText: string | null;
    sortOrder: number;
  }[];
};

export default function EditArtworkForm({ artwork }: { artwork: Artwork }) {
  const router = useRouter();

  const [title, setTitle] = useState(artwork.title);
  const [slug, setSlug] = useState(artwork.slug);
  const [year, setYear] = useState(artwork.year || "");
  const [medium, setMedium] = useState(artwork.medium || "");
  const [size, setSize] = useState(artwork.size || "");
  const [category, setCategory] = useState(artwork.category || "Mixed Media");
  const [status, setStatus] = useState(artwork.status || "available");
  const [description, setDescription] = useState(artwork.description || "");
  const [coverS3Key, setCoverS3Key] = useState(artwork.coverS3Key);
  const [coverThumbUrl, setCoverThumbUrl] = useState(artwork.coverThumbUrl);
  const [coverThumbS3Key, setCoverThumbS3Key] = useState(
    artwork.coverThumbS3Key,
  );
  const [descriptionTh, setDescriptionTh] = useState(
    artwork.descriptionTh || "",
  );
  const [isPublished, setIsPublished] = useState(Boolean(artwork.isPublished));
  const [saving, setSaving] = useState(false);

  const [coverImageUrl, setCoverImageUrl] = useState(artwork.coverImageUrl);
  const [galleryImages, setGalleryImages] = useState(artwork.images);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const isBusy = uploading || saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title,
        slug,
        year,
        medium,
        size,
        category,
        status,
        coverImageUrl,
        coverS3Key,
        coverThumbUrl,
        coverThumbS3Key,
        description,
        descriptionTh,
        isPublished,
      };

      await apiFetch(`/artworks/${artwork.id}`, {
        method: "PUT",
        json: payload,
      });

      Swal.fire({
        icon: "success",
        title: "อัปเดตผลงานสำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "อัปเดตไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverChange(fileList: FileList | null) {
    if (uploading || saving) return;
    const file = fileList?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploaded = await uploadArtworkCover(file, slug);

      setCoverImageUrl(uploaded.coverImageUrl);
      setCoverS3Key(uploaded.coverS3Key);
      setCoverThumbUrl(uploaded.coverThumbUrl);
      setCoverThumbS3Key(uploaded.coverThumbS3Key);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Upload cover ไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  }

  async function uploadArtworkCover(file: File, slug: string) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const uploadedLarge = await uploadToS3WithProgress(
      largeFile,
      `artworks/${slug}/cover`,
    );
    const uploadedThumb = await uploadToS3WithProgress(
      thumbFile,
      `artworks/${slug}/cover-thumb`,
    );

    return {
      coverImageUrl: uploadedLarge.url,
      coverS3Key: uploadedLarge.key,
      coverThumbUrl: uploadedThumb.url,
      coverThumbS3Key: uploadedThumb.key,
    };
  }

  async function uploadArtworkImage(
    file: File,
    slug: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p0: (percent: any) => void,
  ) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const uploadedLarge = await uploadToS3WithProgress(
      largeFile,
      `artworks/${slug}/large`,
    );
    const uploadedThumb = await uploadToS3WithProgress(
      thumbFile,
      `artworks/${slug}/thumb`,
    );

    return {
      imageUrl: uploadedLarge.url,
      s3Key: uploadedLarge.key,
      thumbUrl: uploadedThumb.url,
      thumbS3Key: uploadedThumb.key,
    };
  }

  async function handleAddImages(fileList: FileList | null) {
    if (uploading || saving) return;
    if (!fileList) return;

    try {
      setUploading(true);

      const files = Array.from(fileList);

      const uploadedImages = [];

      for (let i = 0; i < files.length; i++) {
        const uploaded = await uploadArtworkImage(files[i], slug, (percent) => {
          const totalPercent = Math.round(
            ((i + percent / 100) / files.length) * 100,
          );
          setUploadProgress(totalPercent);
        });

        uploadedImages.push(uploaded);
      }

      setUploadProgress(100);

      const payloadImages = uploadedImages.map((img, index) => ({
        imageUrl: img.imageUrl,
        s3Key: img.s3Key,
        thumbUrl: img.thumbUrl,
        thumbS3Key: img.thumbS3Key,
        altText: title,
        sortOrder: galleryImages.length + index + 1,
      }));

      await apiFetch(`/artworks/${artwork.id}/images`, {
        method: "POST",
        json: {
          images: payloadImages,
        },
      });

      setGalleryImages((prev) => [
        ...prev,
        ...payloadImages.map((img, index) => ({
          id: Date.now() + index, // fake id
          imageUrl: img.imageUrl,
          s3Key: img.s3Key,
          thumbUrl: img.thumbUrl,
          thumbS3Key: img.thumbS3Key,
          altText: img.altText,
          sortOrder: img.sortOrder,
        })),
      ]);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เพิ่มรูปไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (uploading || saving) return;
    const target = galleryImages.find((img) => img.id === imageId);

    if (!target) return;

    const result = await Swal.fire({
      title: "ลบรูป?",
      text: "คุณต้องการลบรูปนี้ใช่ไหม",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/artworks/${artwork.id}/images/${imageId}`, {
        method: "DELETE",
      });

      if (target.s3Key) {
        await deleteFromS3(target.s3Key);
      }

      setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "ลบรูปไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  async function saveImageSort(nextImages: typeof galleryImages) {
    const payload = {
      images: nextImages.map((img, index) => ({
        id: img.id,
        sortOrder: index + 1,
      })),
    };

    const data = await apiData<typeof galleryImages>(
      `/artworks/${artwork.id}/images/sort`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    setGalleryImages(data);
  }

  async function moveImage(index: number, direction: "left" | "right") {
    const nextIndex = direction === "left" ? index - 1 : index + 1;

    if (nextIndex < 0 || nextIndex >= galleryImages.length) return;

    const nextImages = [...galleryImages];
    const current = nextImages[index];
    nextImages[index] = nextImages[nextIndex];
    nextImages[nextIndex] = current;

    setGalleryImages(nextImages);

    try {
      await saveImageSort(nextImages);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เรียงรูปไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
      setGalleryImages(galleryImages);
    }
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = galleryImages.findIndex((i) => i.id === active.id);
    const newIndex = galleryImages.findIndex((i) => i.id === over.id);

    const newItems = arrayMove(galleryImages, oldIndex, newIndex);

    setGalleryImages(newItems);

    try {
      await saveImageSort(newItems);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เรียงรูปไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  async function handleDeleteArtwork() {
    const result = await Swal.fire({
      title: "ลบรูป?",
      text: "ต้องการลบผลงานนี้ทั้งหมดใช่ไหม?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      const keys = [
        coverS3Key,
        coverThumbS3Key,
        ...galleryImages.map((img) => img.s3Key).filter(Boolean),
      ] as string[];

      await Promise.all(keys.map((key) => deleteFromS3(key)));

      await apiFetch(`/artworks/${artwork.id}`, {
        method: "DELETE",
      });

      Swal.fire({
        icon: "success",
        title: "ลบผลงานสำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
      router.push("/artworks");
      router.refresh();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "ลบผลงานไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[1fr_420px]"
    >
      <section className="space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Artwork Information</h2>

          <div className="mt-6 grid gap-5">
            <Input label="Title" value={title} onChange={setTitle} />
            <Input label="Slug" value={slug} onChange={setSlug} />
            <Input label="Year" value={year} onChange={setYear} />
            <Input label="Medium" value={medium} onChange={setMedium} />
            <Input label="Size" value={size} onChange={setSize} />

            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Category"
                value={category}
                onChange={setCategory}
                options={["Mixed Media", "Painting", "Paper Work"]}
              />

              <Select
                label="Status"
                value={status}
                onChange={setStatus}
                options={["available", "reserved", "sold", "private"]}
              />
            </div>

            <Textarea
              label="Description EN"
              value={description}
              onChange={setDescription}
            />

            <Textarea
              label="Description TH"
              value={descriptionTh}
              onChange={setDescriptionTh}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-3xl">Gallery Images</h2>

            <label className="cursor-pointer rounded-full bg-black px-5 py-3 text-xs uppercase tracking-[0.16em] text-white">
              {uploading ? "Uploading..." : "Add Images"}
              <input
                type="file"
                multiple
                accept="image/*"
                disabled={isBusy}
                className="hidden"
                onChange={(event) => handleAddImages(event.target.files)}
              />
            </label>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={galleryImages.map((img) => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {galleryImages
                  .filter((image) => Boolean(image.imageUrl))
                  .map((image, index) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-2xl bg-black/5"
                    >
                      <img
                        src={image.thumbUrl ?? image.imageUrl}
                        alt={image.altText ?? title}
                        className="aspect-square w-full object-cover"
                      />

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-xs opacity-0 shadow transition group-hover:opacity-100"
                      >
                        Delete
                      </button>

                      <div className="absolute bottom-3 left-3 rounded-full bg-black px-3 py-1 text-[11px] text-white">
                        {index + 1}
                      </div>

                      <div className="absolute left-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          disabled={isBusy || index === 0}
                          onClick={() => moveImage(index, "left")}
                          className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          disabled={
                            isBusy || index === galleryImages.length - 1
                          }
                          onClick={() => moveImage(index, "right")}
                          className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Cover</h2>

          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="mt-6 aspect-[4/5] w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-black/20 p-12 text-center text-black/40">
              No cover image
            </div>
          )}

          <label
            className={`mt-4 flex cursor-pointer justify-center rounded-full border border-black/20 px-5 py-3 text-sm transition  hover:border-black${isBusy ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? "Uploading..." : "Change Cover"}
            <input
              type="file"
              accept="image/*"
              disabled={isBusy}
              className="hidden"
              onChange={(event) => handleCoverChange(event.target.files)}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Stats</h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#f7f7f4] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Views
              </p>
              <p className="mt-2 font-serif text-4xl">{artwork.viewCount}</p>
            </div>

            <div className="rounded-xl bg-[#f7f7f4] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Likes
              </p>
              <p className="mt-2 font-serif text-4xl">{artwork.likeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Publish</h2>

          <label className="mt-6 flex items-center justify-between border-y border-black/10 py-5">
            <span className="text-sm text-black/60">Published</span>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
          </label>

          {uploadProgress !== null && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs text-black/50">
                <span>Uploading...</span>
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
            className="mt-6 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-black/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Artwork"}
            <span>→</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleDeleteArtwork}
            className="mt-4 w-full rounded-full border border-red-500 px-6 py-4 text-xs uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-600 hover:text-white"
          >
            Delete Artwork
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-black/40">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-black/40">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-black/40">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortableImage({ image, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
