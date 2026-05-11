"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { optimizeImage } from "@/lib/optimizeImage";
import { uploadToS3WithProgress } from "@/lib/uploadToS3WithProgress";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import AdminLayout from "@/components/admin/AdminLayout";

type ArtworkOption = {
  id: number;
  title: string;
  year: string | null;
  category: string | null;
  coverImageUrl: string | null;
  coverThumbUrl: string | null;
};

type Exhibition = {
  title?: string;
  year?: string;
  type?: string;
  venue?: string;
  description?: string;
  descriptionTh?: string;
  statement?: string;
  statementTh?: string;
  isPublished?: string;
  artworks?: ArtworkOption[];
  coverImageUrl?: string;
  coverS3Key?: string;
  coverThumbUrl?: string;
  coverThumbS3Key?: string;
  exhibitionDate?: string;
  images?: PreviewImage[];
};
type PreviewImage = {
  id: string;
  file: File | null;
  url: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  thumbUrl?: string | null;
  thumbS3Key?: string | null;
};

export default function CreateExhibitionPage() {
  const [title, setTitle] = useState("");
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id;

  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [venue, setVenue] = useState("");
  const [exhibitionDate, setExhibitionDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionTh, setDescriptionTh] = useState("");
  const [statement, setStatement] = useState("");
  const [statementTh, setStatementTh] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [coverImage, setCoverImage] = useState<PreviewImage | null>(null);
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [saving, setSaving] = useState(false);

  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<number[]>([]);

  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [artworkSearch, setArtworkSearch] = useState("");

  const [deletedImages, setDeletedImages] = useState<
    { s3Key?: string | null; thumbS3Key?: string | null }[]
  >([]);
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
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

  useEffect(() => {
    if (!id) return;

    async function load() {
      const res = await apiFetch<{ data: Exhibition }>(`/exhibitions/${id}`);
      const data = res.data;

      setTitle(data.title ?? "");
      setYear(data.year ?? "");
      setType(data.type ?? "");
      setVenue(data.venue ?? "");
      setExhibitionDate(data.exhibitionDate ?? "");
      setDescription(data.description ?? "");
      setDescriptionTh(data.descriptionTh ?? "");
      setStatement(data.statement ?? "");
      setStatementTh(data.statementTh ?? "");
      setIsPublished(Boolean(data.isPublished));
      setSelectedArtworkIds(
        (data.artworks ?? []).map((art: ArtworkOption) => art.id),
      );

      if (data.coverImageUrl) {
        setCoverImage({
          id: crypto.randomUUID(),
          file: null,
          url: data.coverImageUrl,
          s3Key: data.coverS3Key,
          thumbUrl: data.coverThumbUrl,
          thumbS3Key: data.coverThumbS3Key,
        });
      }

      if (data.images) {
        setImages(
          data.images.map((img) => ({
            id: crypto.randomUUID(),
            dbId: img.id,
            file: null,
            url: img.imageUrl ?? img.url,
            s3Key: img.s3Key,
            thumbUrl: img.thumbUrl,
            thumbS3Key: img.thumbS3Key,
          })),
        );
      }
    }

    async function loadArtworks() {
      const res = await apiFetch<{ data: ArtworkOption[] }>("/artworks");
      setArtworks(res.data);
    }

    loadArtworks();

    load();
  }, [id]);

  async function uploadExhibitionImage(
    file: File,
    slug: string,
    onProgress?: (percent: number) => void,
  ) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const large = await uploadToS3WithProgress(
      largeFile,
      `exhibitions/${slug}/large`,
      (p) => onProgress?.(Math.round(p.percent * 0.7)),
    );

    const thumb = await uploadToS3WithProgress(
      thumbFile,
      `exhibitions/${slug}/thumb`,
      (p) => onProgress?.(70 + Math.round(p.percent * 0.3)),
    );

    return {
      imageUrl: large.url,
      s3Key: large.key,
      thumbUrl: thumb.url,
      thumbS3Key: thumb.key,
    };
  }

  async function uploadExhibitionCover(
    file: File,
    slug: string,
    onProgress?: (percent: number) => void,
  ) {
    const largeFile = await optimizeImage(file, "large");
    const thumbFile = await optimizeImage(file, "thumb");

    const large = await uploadToS3WithProgress(
      largeFile,
      `exhibitions/${slug}/cover`,
      (p) => onProgress?.(Math.round(p.percent * 0.7)),
    );

    const thumb = await uploadToS3WithProgress(
      thumbFile,
      `exhibitions/${slug}/cover-thumb`,
      (p) => onProgress?.(70 + Math.round(p.percent * 0.3)),
    );

    return {
      coverImageUrl: large.url,
      coverS3Key: large.key,
      coverThumbUrl: thumb.url,
      coverThumbS3Key: thumb.key,
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setUploadProgress(0);

    try {
      const cover = coverImage?.file
        ? await uploadExhibitionCover(coverImage.file, slug, setUploadProgress)
        : coverImage
          ? {
              coverImageUrl: coverImage.url,
              coverS3Key: coverImage.s3Key,
              coverThumbUrl: coverImage.thumbUrl,
              coverThumbS3Key: coverImage.thumbS3Key,
            }
          : null;

      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (!img.file) {
          uploadedImages.push({
            imageUrl: img.url,
            s3Key: img.s3Key,
            thumbUrl: img.thumbUrl,
            thumbS3Key: img.thumbS3Key,
            sortOrder: i + 1,
          });
          continue;
        }

        const uploaded = await uploadExhibitionImage(
          img.file,
          slug,
          (percent) => {
            const total = Math.round(
              ((i + percent / 100) / images.length) * 100,
            );
            setUploadProgress(total);
          },
        );

        uploadedImages.push({
          ...uploaded,
          sortOrder: i + 1,
        });
      }

      const payload = {
        slug,
        title,
        year,
        type,
        venue,
        exhibitionDate,
        artist: "PhanatchaNuch",
        coverImageUrl: cover?.coverImageUrl ?? null,
        coverS3Key: cover?.coverS3Key ?? null,
        coverThumbUrl: cover?.coverThumbUrl ?? null,
        coverThumbS3Key: cover?.coverThumbS3Key ?? null,
        description,
        descriptionTh,
        statement,
        statementTh,
        isPublished,
        images: uploadedImages,
        deletedImages,
        deletedFiles,
        artworkIds: selectedArtworkIds,
      };

      if (isEdit) {
        await apiFetch(`/exhibitions/${id}`, { method: "PUT", json: payload });
      } else {
        await apiFetch("/exhibitions", { method: "POST", json: payload });
      }

      toast.success("Saved");
      setDeletedImages([]);
      router.push(`/exhibitions?refresh=${Date.now()}`);
    } finally {
      setSaving(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  }

  function makePreview(file: File): PreviewImage {
    return {
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    };
  }

  function handleImagesChange(fileList: FileList | null) {
    if (!fileList) return;

    const nextImages = Array.from(fileList).map(makePreview);
    setImages((prev) => [...prev, ...nextImages]);
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return next;
    });
  }

  function toggleArtwork(id: number) {
    setSelectedArtworkIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const filteredArtworks = artworks.filter((art) => {
    const q = artworkSearch.toLowerCase();

    return (
      art.title?.toLowerCase().includes(q) ||
      art.year?.toLowerCase().includes(q) ||
      art.category?.toLowerCase().includes(q)
    );
  });

  async function handleDelete() {
    if (!id) return;

    const result = await Swal.fire({
      title: "Delete this exhibition?",
      text: "This will delete exhibition data and images.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#000",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);

      await apiFetch(`/exhibitions/${id}`, {
        method: "DELETE",
      });

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });

      router.push(`/exhibitions?refresh=${Date.now()}`);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Please try again",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCoverChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setCoverImage({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    });
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

  return (
    <AdminLayout title="Create Exhibition">
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1fr_420px]"
      >
        <section className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Exhibition Information</h2>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Echoes in Between"
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
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Year
                  </label>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="Year"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                    Type
                  </label>
                  <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                    placeholder="Type"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Venue
                </label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Venue"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Exhibition Date
                </label>
                <input
                  value={exhibitionDate}
                  onChange={(e) => setExhibitionDate(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="12 May – 30 June 2026"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Description EN"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  DescriptionTh
                </label>
                <textarea
                  value={descriptionTh}
                  onChange={(e) => setDescriptionTh(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Description TH"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Statement
                </label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Statement EN"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                  StatementTh
                </label>
                <textarea
                  value={statementTh}
                  onChange={(e) => setStatementTh(e.target.value)}
                  className="mt-3 h-36 w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 outline-none focus:border-black"
                  placeholder="Statement TH"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-3xl">Gallery Images</h2>
            <p className="mt-2 text-sm text-black/50">
              Upload exhibition views, installation shots, venue atmosphere, and
              details.
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
                disabled={saving}
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
                      src={image.thumbUrl ?? image.url}
                      alt={`Exhibition preview ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />

                    <div className="absolute left-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        disabled={saving || index === 0}
                        onClick={() => moveImage(index, "up")}
                        className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        disabled={saving || index === images.length - 1}
                        onClick={() => moveImage(index, "down")}
                        className="rounded-full bg-white px-3 py-2 text-xs shadow disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
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

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl">Works in Exhibition</h2>
                <p className="mt-2 text-sm text-black/50">
                  {selectedArtworkIds.length} selected artworks
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsArtworkModalOpen(true)}
                className="rounded-full bg-black px-5 py-3 text-xs uppercase tracking-[0.18em] text-white"
              >
                Select Works
              </button>
            </div>

            {selectedArtworkIds.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {selectedArtworkIds.map((id) => {
                  const art = artworks.find((item) => item.id === id);

                  if (!art) return null;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleArtwork(id)}
                      className="rounded-full bg-black/5 px-4 py-2 text-xs text-black/60 hover:bg-red-50 hover:text-red-600"
                    >
                      {art.title} ×
                    </button>
                  );
                })}
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
                disabled={saving}
                className="hidden"
                onChange={(event) => handleCoverChange(event.target.files)}
              />
            </label>

            {coverImage && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (coverImage && !coverImage.file) {
                    setDeletedFiles(
                      (old) =>
                        [
                          ...old,
                          coverImage.s3Key,
                          coverImage.thumbS3Key,
                        ].filter(Boolean) as string[],
                    );
                  }

                  setCoverImage(null);
                }}
                className="mt-4 w-full rounded-full border border-black/20 px-5 py-3 text-sm transition hover:border-black disabled:opacity-50"
              >
                Remove Cover
              </button>
            )}
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
              type="submit"
              className="mt-6 flex w-full items-center justify-between rounded-full bg-black px-6 py-4 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-black/80"
              disabled={saving}
            >
              {isBusy
                ? "Processing..."
                : isEdit
                  ? "Update Exhibition"
                  : "Save Exhibition"}
            </button>
            {isEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="mt-4 flex w-full items-center justify-between rounded-full border border-red-500 px-6 py-4 text-xs uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                Delete Exhibition <span>×</span>
              </button>
            )}
          </div>
        </aside>
      </form>

      {isArtworkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 p-6">
              <div>
                <h2 className="font-serif text-4xl">Select Artworks</h2>
                <p className="mt-1 text-sm text-black/50">
                  {selectedArtworkIds.length} selected
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsArtworkModalOpen(false)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm hover:border-black"
              >
                Close
              </button>
            </div>

            <div className="border-b border-black/10 p-6">
              <input
                value={artworkSearch}
                onChange={(e) => setArtworkSearch(e.target.value)}
                placeholder="Search by title, year, category..."
                className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-4 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="overflow-y-auto p-6">
              {filteredArtworks.length === 0 ? (
                <p className="text-sm text-black/50">No artworks found.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredArtworks.map((art) => {
                    const checked = selectedArtworkIds.includes(art.id);

                    return (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => toggleArtwork(art.id)}
                        className={`overflow-hidden rounded-2xl border text-left transition ${
                          checked
                            ? "border-black bg-black/[0.04]"
                            : "border-black/10 hover:border-black/40"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={
                              art.coverThumbUrl ??
                              art.coverImageUrl ??
                              "/images/placeholder.jpg"
                            }
                            alt={art.title}
                            className="aspect-square w-full object-cover"
                          />

                          {checked && (
                            <span className="absolute right-3 top-3 rounded-full bg-black px-3 py-1 text-xs text-white">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <p className="font-serif text-xl">{art.title}</p>
                          <p className="mt-1 text-xs text-black/45">
                            {art.year} · {art.category}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-black/10 p-6">
              <button
                type="button"
                onClick={() => setSelectedArtworkIds([])}
                className="text-xs uppercase tracking-[0.18em] text-black/45 hover:text-red-600"
              >
                Clear selection
              </button>

              <button
                type="button"
                onClick={() => setIsArtworkModalOpen(false)}
                className="rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.18em] text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
