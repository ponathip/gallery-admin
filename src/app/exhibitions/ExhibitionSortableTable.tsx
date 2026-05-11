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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "@/lib/api";
import Swal from "sweetalert2";

type Exhibition = {
  id: number;
  slug: string;
  title: string;
  year: string | null;
  type: string | null;
  venue: string | null;
  exhibitionDate: string | null;
  coverImageUrl: string | null;
  coverThumbUrl: string | null;
  isPublished: boolean;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ExhibitionSortableTable({
  exhibitions,
}: {
  exhibitions: Exhibition[];
}) {
  const isClient = useIsClient();
  const [items, setItems] = useState(exhibitions);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  if (!isClient) return null;

  const saveOrder = async (newItems: Exhibition[]) => {
    await apiFetch(`/exhibitions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: newItems.map((item, index) => ({
          id: item.id,
          sort_order: index + 1,
        })),
      }),
    });

    Swal.fire({
      icon: "success",
      title: "Sequence saved successfully!",
      showConfirmButton: false,
      timer: 1500,
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="hidden gap-5 border-b border-black/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-black/40 lg:grid lg:grid-cols-[56px_180px_1fr_160px_130px_90px]">
        <div>Sort</div>
        <div>Image</div>
        <div>Title</div>
        <div>Type / Year</div>
        <div>Status</div>
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
            await saveOrder(newItems);
          } catch (error) {
            console.error(error);
            Swal.fire({
              icon: "error",
              title: "Failed to save sequence!",
              showConfirmButton: false,
              timer: 1500,
            });
            setItems(items);
          }
        }}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableExhibitionRow key={item.id} item={item} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableExhibitionRow({ item }: { item: Exhibition }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid gap-5 border-b border-black/10 p-5 transition lg:grid-cols-[56px_180px_1fr_160px_130px_90px] lg:items-center ${
        isDragging ? "bg-black/5 shadow-lg" : "hover:bg-black/[0.03]"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="w-fit cursor-grab rounded-xl border border-black/10 px-4 py-3 text-black/40 hover:bg-black/5 active:cursor-grabbing"
        title="ลากเพื่อจัดลำดับ"
      >
        ☰
      </button>

      <Link href={`/exhibitions/${item.id}`}>
        <img
          src={
            item.coverThumbUrl ??
            item.coverImageUrl ??
            "/images/placeholder.jpg"
          }
          alt={item.title}
          className="h-40 w-full rounded-xl object-cover lg:h-28"
        />
      </Link>

      <Link href={`/exhibitions/${item.id}`} className="block">
        <p className="font-serif text-3xl">{item.title}</p>
        <p className="mt-2 text-sm text-black/50">
          {item.exhibitionDate} · {item.venue}
        </p>
      </Link>

      <div className="text-sm text-black/60">
        {item.type}
        <br />
        {item.year}
      </div>

      <div>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
          {item.isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <Link
        href={`/exhibitions/${item.id}`}
        className="rounded-full border border-black/10 px-4 py-2 text-center text-xs uppercase tracking-[0.16em] hover:bg-black hover:text-white"
      >
        Edit
      </Link>
    </div>
  );
}
