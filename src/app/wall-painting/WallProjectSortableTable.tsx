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

type WallProject = {
  id: number;
  title: string;
  location: string;
  year: string;
  spaceType: string;
  status: string;
  coverImageUrl: string;
  views?: number;
  likes?: number;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700";
    case "in_progress":
      return "bg-yellow-50 text-yellow-700";
    case "concept":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-black/5 text-black/60";
  }
}

export default function WallProjectSortableTable({
  projects,
}: {
  projects: WallProject[];
}) {
  const isClient = useIsClient();
  const [items, setItems] = useState(projects);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  if (!isClient) return null;

  const saveOrder = async (newItems: WallProject[]) => {
    await apiFetch(`/wall-projects/reorder`, {
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
      <div className="hidden gap-4 border-b border-black/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-black/40 lg:grid lg:grid-cols-[56px_80px_1fr_160px_130px_100px_100px_90px]">
        <div>Sort</div>
        <div>Image</div>
        <div>Project</div>
        <div>Type</div>
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
          {items.map((project) => (
            <SortableWallProjectRow key={project.id} project={project} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableWallProjectRow({ project }: { project: WallProject }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid gap-4 border-b border-black/10 px-5 py-4 transition lg:grid-cols-[56px_80px_1fr_160px_130px_100px_100px_90px] lg:items-center ${
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

      <Link
        href={`/wall-painting/${project.id}`}
        className="h-20 w-20 overflow-hidden rounded-xl bg-black/5 lg:h-16 lg:w-16"
      >
        <img
          src={project.coverImageUrl}
          alt={project.title}
          className="h-full w-full object-cover"
        />
      </Link>

      <Link href={`/wall-painting/${project.id}`} className="block">
        <p className="font-serif text-2xl">{project.title}</p>
        <p className="mt-1 text-sm text-black/45">
          {project.year} · {project.location}
        </p>
      </Link>

      <div className="text-sm text-black/60">{project.spaceType}</div>

      <div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${getStatusClass(
            project.status,
          )}`}
        >
          {project.status}
        </span>
      </div>

      <div className="text-sm text-black/60">{project.views ?? 0}</div>
      <div className="text-sm text-black/60">{project.likes ?? 0}</div>

      <Link
        href={`/wall-painting/${project.id}`}
        className="rounded-full border border-black/10 px-4 py-2 text-center text-xs uppercase tracking-[0.16em] hover:bg-black hover:text-white"
      >
        Edit
      </Link>
    </div>
  );
}
