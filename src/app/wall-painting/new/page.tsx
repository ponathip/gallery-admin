"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { uploadToS3WithProgress } from "@/lib/uploadToS3WithProgress";
import { optimizeImage } from "@/lib/optimizeImage";
import { apiFetch } from "@/lib/api";
import Swal from "sweetalert2";

type PreviewImage = {
  id: string;
  dbId?: number;
  file: File | null; // null = รูปเดิมจาก DB
  url: string;

  s3Key?: string | null;
  thumbUrl?: string | null;
  thumbS3Key?: string | null;
};

type WallProjectResponse = {
  data: {
    title?: string;
    location?: string;
    year?: string;
    space_type?: string;
    status?: string;
    spaceType?: string;
    description?: string;
    description_th?: string;
    concept?: string;
    concept_th?: string;
    descriptionTh?: string;
    conceptTh?: string;
    cover_image_url?: string;
    cover_s3_key?: string;
    cover_thumb_url?: string;
    cover_thumb_s3_key?: string;
    before_image_url?: string;
    before_s3_key?: string;
    before_thumb_url?: string;
    before_thumb_s3_key?: string;
    after_image_url?: string;
    after_s3_key?: string;
    after_thumb_s3_key?: string;
    is_published?: string;
    after_thumb_url?: string;
    images?: PreviewImage[];
  };
};

function makePreview(file: File): PreviewImage {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
  };
}

export default function CreateWallPaintingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [coverImage, setCoverImage] = useState<PreviewImage | null>(null);
  const [beforeImage, setBeforeImage] = useState<PreviewImage | null>(null);
  const [afterImage, setAfterImage] = useState<PreviewImage | null>(null);
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionTh, setDescriptionTh] = useState("");
  const [concept, setConcept] = useState("");
  const [conceptTh, setConceptTh] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);

  const isBusy = saving || uploadProgress !== null;

  useEffect(() => {
    if (!id) return;

    async function load() {
      const res = await apiFetch<WallProjectResponse>(`/wall-projects/${id}`);
      const data = res.data;

      setTitle(data.title || "");
      setLocation(data.location || "");
      setYear(data.year || "");
      setSpaceType(data.space_type || data.spaceType || "");
      setStatus(data.status || "completed");
      setDescription(data.description || "");
      setDescriptionTh(data.description_th || data.descriptionTh || "");
      setConcept(data.concept || "");
      setConceptTh(data.concept_th || data.conceptTh || "");
      setIsPublished(!!data.is_published);

      // preview รูปเดิม (ไม่มี file แต่มี url)
      if (data.cover_image_url) {
        setCoverImage({
          id: crypto.randomUUID(),
          file: null,
          url: data.cover_image_url,
          s3Key: data.cover_s3_key,
          thumbUrl: data.cover_thumb_url,
          thumbS3Key: data.cover_thumb_s3_key,
        });
      }

      if (data.before_image_url) {
        setBeforeImage({
          id: crypto.randomUUID(),
          file: null,
          url: data.before_image_url,
          s3Key: data.before_s3_key,
          thumbUrl: data.before_thumb_url,
          thumbS3Key: data.before_thumb_s3_key,
        });
      }

      if (data.after_image_url) {
        setAfterImage({
          id: crypto.randomUUID(),
          file: null,
          url: data.after_image_url,
          s3Key: data.after_s3_key,
          thumbUrl: data.after_thumb_url,
          thumbS3Key: data.after_thumb_s3_key,
        });
      }

      if (data.images) {
        setImages(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.images.map((img: any) => ({
            id: crypto.randomUUID(),
            dbId: img.id,
            file: null,
            url: img.image_url,
            s3Key: img.s3_key,
            thumbUrl: img.thumb_url,
            thumbS3Key: img.thumb_s3_key,
          })),
        );
      }
    }

    load();
  }, [id]);

  const slug = useMemo(() => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }, [title]);

  function handleSingleImage(
    fileList: FileList | null,
    setter: (image: PreviewImage | null) => void,
  ) {
    const file = fileList?.[0];
    if (!file) return;
    setter(makePreview(file));
  }

  function handleImagesChange(fileList: FileList | null) {
    if (!fileList) return;
    const nextImages = Array.from(fileList).map(makePreview);
    setImages((prev) => [...prev, ...nextImages]);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);

      if (target && !target.file) {
        setDeletedFiles(
          (old) =>
            [...old, target.s3Key, target.thumbS3Key].filter(
              Boolean,
            ) as string[],
        );
      }

      return prev.filter((img) => img.id !== id);
    });
  }

  function removeSingleImage(
    image: PreviewImage | null,
    setter: (image: PreviewImage | null) => void,
  ) {
    if (image && !image.file) {
      setDeletedFiles(
        (old) =>
          [...old, image.s3Key, image.thumbS3Key].filter(Boolean) as string[],
      );
    }

    setter(null);
  }

  async function moveImage(index: number, direction: "up" | "down") {
    const next = [...images];

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= next.length) return;

    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    setImages(next);

    try {
      await saveImageSort(next);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เรียงรูปไม่สำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  async function saveImageSort(nextImages: PreviewImage[]) {
    if (!id) return;

    const payload = {
      images: nextImages
        .filter((img) => img.dbId)
        .map((img, index) => ({
          id: img.dbId,
          sortOrder: index + 1,
        })),
    };

    await apiFetch(`/wall-projects/${id}/images/sort`, {
      method: "PUT",
      json: payload,
    });
  }

  async function handleDelete(id: string) {
    if (!id) return;
    const result = await Swal.fire({
      title: "Delete this project?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#000",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/wall-projects/${id}`, {
        method: "DELETE",
      });

      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 1200,
        showConfirmButton: false,
      });

      router.push(`/wall-painting?refresh=${Date.now()}`);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Please try again",
      });
    }
  }

  async function uploadWallSingle(
    file: File,
    slug: string,
    type: string,
    onProgress?: (percent: number) => void,
  ) {
    const large = await optimizeImage(file, "large");
    const thumb = await optimizeImage(file, "thumb");

    const upLarge = await uploadToS3WithProgress(
      large,
      `wall/${slug}/${type}`,
      (p) => onProgress?.(Math.round(p.percent * 0.7)),
    );

    const upThumb = await uploadToS3WithProgress(
      thumb,
      `wall/${slug}/${type}-thumb`,
      (p) => onProgress?.(70 + Math.round(p.percent * 0.3)),
    );

    return {
      url: upLarge.url,
      s3Key: upLarge.key,
      thumbUrl: upThumb.url,
      thumbS3Key: upThumb.key,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setUploadProgress(0);

    try {
      // 🔥 upload cover / before / after
      const cover = coverImage?.file
        ? await uploadWallSingle(
            coverImage.file,
            slug,
            "cover",
            setUploadProgress,
          )
        : coverImage?.url
          ? {
              url: coverImage.url,
              s3Key: coverImage.s3Key,
              thumbUrl: coverImage.thumbUrl,
              thumbS3Key: coverImage.thumbS3Key,
            }
          : null;

      const before = beforeImage?.file
        ? await uploadWallSingle(
            beforeImage.file,
            slug,
            "before",
            setUploadProgress,
          )
        : beforeImage?.url
          ? {
              url: beforeImage.url,
              s3Key: beforeImage.s3Key,
              thumbUrl: beforeImage.thumbUrl,
              thumbS3Key: beforeImage.thumbS3Key,
            }
          : null;

      const after = afterImage?.file
        ? await uploadWallSingle(
            afterImage.file,
            slug,
            "after",
            setUploadProgress,
          )
        : afterImage?.url
          ? {
              url: afterImage.url,
              s3Key: afterImage.s3Key,
              thumbUrl: afterImage.thumbUrl,
              thumbS3Key: afterImage.thumbS3Key,
            }
          : null;

      // 🔥 upload gallery
      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (!img.file) {
          // รูปเดิม
          uploadedImages.push({
            imageUrl: img.url,
            s3Key: img.s3Key,
            thumbUrl: img.thumbUrl,
            thumbS3Key: img.thumbS3Key,
            sortOrder: i + 1,
          });
          continue;
        }

        const uploaded = await uploadWallImage(img.file, slug, (percent) => {
          const total = Math.round(((i + percent / 100) / images.length) * 100);
          setUploadProgress(total);
        });
        uploadedImages.push({
          imageUrl: uploaded.imageUrl,
          s3Key: uploaded.s3Key,
          thumbUrl: uploaded.thumbUrl,
          thumbS3Key: uploaded.thumbS3Key,
          sortOrder: i + 1,
        });
      }

      // 🔥 payload
      const payload = {
        title,
        slug,
        location,
        year,
        spaceType,
        status,
        coverImageUrl: cover?.url ?? null,
        coverS3Key: cover?.s3Key ?? null,
        coverThumbUrl: cover?.thumbUrl ?? null,
        coverThumbS3Key: cover?.thumbS3Key ?? null,
        beforeImageUrl: before?.url ?? null,
        beforeS3Key: before?.s3Key ?? null,
        beforeThumbUrl: before?.thumbUrl ?? null,
        beforeThumbS3Key: before?.thumbS3Key ?? null,
        afterImageUrl: after?.url ?? null,
        afterS3Key: after?.s3Key ?? null,
        afterThumbUrl: after?.thumbUrl ?? null,
        afterThumbS3Key: after?.thumbS3Key ?? null,
        description,
        descriptionTh,
        concept,
        conceptTh,
        isPublished,
        images: uploadedImages,
        deletedFiles,
      };

      if (isEdit) {
        await apiFetch(`/wall-projects/${id}`, {
          method: "PUT",
          json: payload,
        });
      } else {
        await apiFetch("/wall-projects", {
          method: "POST",
          json: payload,
        });
      }

      // toast.success("Saved!");
      await Swal.fire({
        icon: "success",
        title: "สำเร็จ!",
        text: "บันทึกสำเร็จ!",
      });
      setDeletedFiles([]);
      router.refresh();
      router.push("/wall-painting");
    } catch (e) {
      console.error(e);
      // toast.error("Error");
      await Swal.fire({
        icon: "error",
        title: "ล้มเหลว!",
        text: "บันทึกไม่สำเร็จ!",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  }

  async function uploadWallImage(
    file: File,
    slug: string,
    onProgress?: (percent: number) => void,
  ) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const uploadedLarge = await uploadToS3WithProgress(
      largeFile,
      `wall/${slug}/large`,
      (p) => onProgress?.(Math.round(p.percent * 0.7)),
    );

    const uploadedThumb = await uploadToS3WithProgress(
      thumbFile,
      `wall/${slug}/thumb`,
      (p) => onProgress?.(70 + Math.round(p.percent * 0.3)),
    );

    return {
      imageUrl: uploadedLarge.url,
      s3Key: uploadedLarge.key,
      thumbUrl: uploadedThumb.url,
      thumbS3Key: uploadedThumb.key,
    };
  }

  return (
    <AdminLayout title="Create Wall Painting">
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1fr_420px]"
      >
        <section className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Project Information</h2>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Project Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Private Residence"
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
                    value={year}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="2026"
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Location
                  </label>
                  <input
                    value={location}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="Bangkok, Thailand"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Space Type
                  </label>
                  <select
                    value={spaceType}
                    onChange={(e) => setSpaceType(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  >
                    <option>Private Residence</option>
                    <option>Cafe</option>
                    <option>Hotel</option>
                    <option>Gallery</option>
                    <option>Office</option>
                    <option>Creative Space</option>
                  </select>
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
                    <option>Completed</option>
                    <option>In Progress</option>
                    <option>Concept</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Description EN
                </label>
                <textarea
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Project description..."
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Description TH
                </label>
                <textarea
                  onChange={(e) => setDescriptionTh(e.target.value)}
                  value={descriptionTh}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="คำอธิบายโปรเจกต์..."
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Concept EN
                </label>
                <textarea
                  onChange={(e) => setConcept(e.target.value)}
                  value={concept}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Project concept..."
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Concept TH
                </label>
                <textarea
                  onChange={(e) => setConceptTh(e.target.value)}
                  value={conceptTh}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="คอนเซปต์ของโปรเจกต์..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Project Gallery</h2>
            <p className="mt-2 text-sm text-black/50">
              Upload multiple project images, details, process shots, and room
              views.
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
                      alt={`Project preview ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />

                    <div className="absolute left-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        disabled={isBusy || index === 0}
                        onClick={() => moveImage(index, "up")}
                        className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || index === images.length - 1}
                        onClick={() => moveImage(index, "down")}
                        className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => removeImage(image.id)}
                      className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-xs opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-40"
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
          <ImageUploadBox
            title="Cover Image"
            image={coverImage}
            onChange={(files) => handleSingleImage(files, setCoverImage)}
            onRemove={() => removeSingleImage(coverImage, setCoverImage)}
          />

          <ImageUploadBox
            title="Before Image"
            image={beforeImage}
            onChange={(files) => handleSingleImage(files, setBeforeImage)}
            onRemove={() => removeSingleImage(beforeImage, setBeforeImage)}
          />

          <ImageUploadBox
            title="After Image"
            image={afterImage}
            onChange={(files) => handleSingleImage(files, setAfterImage)}
            onRemove={() => removeSingleImage(afterImage, setAfterImage)}
          />

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

            {/* <label className="flex items-center justify-between border-b border-black/10 py-5">
              <span className="text-sm text-black/60">Featured on Home</span>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
            </label> */}
            {uploadProgress !== null && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-black/50">
                  <span>{saving ? "Processing..." : "Uploading..."}</span>
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
              disabled={isBusy}
              type="submit"
              className="mt-6 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-black/80"
            >
              {isBusy
                ? "Processing..."
                : isEdit
                  ? "Update Project"
                  : "Save Project"}{" "}
              <span>→</span>
            </button>
            {isEdit && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleDelete(id)}
                className="mt-4 w-full rounded-full border border-red-500 px-6 py-4 text-xs uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-600 hover:text-white"
              >
                Delete
              </button>
            )}
          </div>
        </aside>
      </form>
    </AdminLayout>
  );
}

function ImageUploadBox({
  title,
  image,
  onChange,
  onRemove,
}: {
  title: string;
  image: PreviewImage | null;
  onChange: (files: FileList | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="font-serif text-3xl">{title}</h2>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#f7f7f4] text-center transition hover:border-black">
        {image ? (
          <img
            src={image.url}
            alt={`${title} preview`}
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <div className="px-6 py-16">
            <span className="font-serif text-3xl">＋</span>
            <p className="mt-3 text-sm text-black/60">Upload {title}</p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files)}
        />
      </label>

      {image && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-4 w-full rounded-full border border-black/20 px-5 py-3 text-sm transition hover:border-black"
        >
          Remove
        </button>
      )}
    </div>
  );
}
