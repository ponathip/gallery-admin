"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import LogoutButton from "./logout";

export default function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-black">
      {/* MOBILE HEADER */}
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="text-sm uppercase tracking-[0.18em]"
        >
          ☰ Menu
        </button>

        <p className="font-serif text-lg">{title}</p>

        <LogoutButton />
      </div>

      <div className="flex">
        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* MOBILE SIDEBAR */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* overlay */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />

            {/* drawer */}
            <div className="relative z-10 h-full w-[280px] bg-[#f7f7f4] shadow-xl">
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <p className="font-serif text-xl">Menu</p>
                <button type="button" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>

              <Sidebar mobile />
            </div>
          </div>
        )}

        {/* CONTENT */}
        <main className="flex-1 px-4 py-5 lg:px-10">
          {/* DESKTOP HEADER */}
          <header className="mb-6 hidden items-center justify-between border-b border-black/10 pb-6 lg:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-black/40">
                Admin
              </p>
              <h1 className="mt-2 font-serif text-4xl">{title}</h1>
            </div>

            <LogoutButton />
          </header>

          {/* CONTENT WRAP */}
          <div className="overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}