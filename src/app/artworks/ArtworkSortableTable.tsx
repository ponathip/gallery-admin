"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "@/lib/api";
import Swal from "sweetalert2";

type Artwork = {
  id: number;
  slug: string;
  title: string;
  year: string;
  medium: string;
  category: string;
  status: string;
  coverImageUrl: string | null;
  viewCount: number;
  likeCount: number;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ArtworkSortableTable({
  artworks,
}: {
  artworks: Artwork[];
}) {
  const isClient = useIsClient();
  const [items, setItems] = useState(artworks);
  //   const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  //   const saveOrder = async () => {
  //     setSaving(true);

  //     try {
  //       const payload = {
  //         items: items.map((item, index) => ({
  //           id: item.id,
  //           sort_order: index + 1,
  //         })),
  //       };

  //       await apiFetch(`/artworks/reorder`, {
  //         method: "PUT",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify(payload),
  //       });

  //       Swal.fire({
  //         icon: "success",
  //         title: "Sequence saved successfully!",
  //         showConfirmButton: false,
  //         timer: 1500,
  //       });
  //     } catch (error) {
  //       console.error(error);
  //       Swal.fire({
  //         icon: "error",
  //         title: "Failed to save sequence!",
  //         showConfirmButton: false,
  //         timer: 1500,
  //       });
  //     } finally {
  //       setSaving(false);
  //     }
  //   };

  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={saveOrder}
          disabled={saving}
          className="rounded-full bg-black px-5 py-3 text-xs uppercase tracking-[0.18em] text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div> */}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="hidden gap-4 border-b border-black/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-black/40 lg:grid lg:grid-cols-[48px_80px_1fr_130px_120px_100px_100px_90px]">
          <div>Sort</div>
          <div>Image</div>
          <div>Title</div>
          <div>Category</div>
          <div>Status</div>
          <div>Views</div>
          <div>Likes</div>
          <div>Action</div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={async (event) => {
            const { active, over } = event;

            if (!over || active.id === over.id) return;

            const oldIndex = items.findIndex((item) => item.id === active.id);

            const newIndex = items.findIndex((item) => item.id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);

            setItems(newItems);

            try {
              await apiFetch(`/artworks/reorder`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    items: newItems.map((item, index) => ({
                      id: item.id,
                      sort_order: index + 1,
                    })),
                  }),
                },
              );
            Swal.fire({
                icon: "success",
                title: "Sequence saved successfully!",
                showConfirmButton: false,
                timer: 1500,
            });
            } catch (error) {
              console.error(error);
            Swal.fire({
                icon: "error",
                title: "Failed to save sequence!",
                showConfirmButton: false,
                timer: 1500,
            });
            }
          }}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((art) => (
              <SortableArtworkRow key={art.id} art={art} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

function SortableArtworkRow({ art }: { art: Artwork }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: art.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid gap-4 border-b border-black/10 px-5 py-4 transition lg:grid-cols-[48px_80px_1fr_130px_120px_100px_100px_90px] lg:items-center ${
        isDragging ? "bg-black/5 shadow-lg" : "hover:bg-black/[0.03]"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-lg border border-black/10 px-3 py-2 text-black/40 hover:bg-black/5 active:cursor-grabbing"
        title="ลากเพื่อจัดลำดับ"
      >
        ☰
      </button>

      <Link
        href={`/artworks/${art.id}`}
        className="h-20 w-20 overflow-hidden rounded-xl bg-black/5 lg:h-16 lg:w-16"
      >
        {art.coverImageUrl ? (
          <img
            src={art.coverImageUrl}
            alt={art.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-black/30">
            No image
          </div>
        )}
      </Link>

      <Link href={`/artworks/${art.id}`} className="block">
        <p className="font-serif text-2xl">{art.title}</p>
        <p className="mt-1 text-sm text-black/45">
          {art.year} · {art.medium}
        </p>
      </Link>

      <div className="text-sm text-black/60">{art.category}</div>

      <div>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
          {art.status}
        </span>
      </div>

      <div className="text-sm text-black/60">{art.viewCount}</div>
      <div className="text-sm text-black/60">{art.likeCount}</div>

      <Link
        href={`/artworks/${art.id}`}
        className="rounded-full border border-black/10 px-4 py-2 text-center text-xs uppercase tracking-[0.16em] hover:bg-black hover:text-white"
      >
        Edit
      </Link>
    </div>
  );
}
