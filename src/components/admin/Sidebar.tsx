import Link from "next/link";

const menus = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Artworks", href: "/artworks" },
  { label: "Wall Painting", href: "/wall-painting" },
  { label: "Exhibitions", href: "/exhibitions" },
  { label: "Inquiries", href: "/inquiries" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  return (
    <aside
      className={`w-72 border-r border-black/10 bg-[#f7f7f4] p-6 ${
        mobile ? "block h-full" : "hidden min-h-screen lg:block"
      }`}
    >
      <div className="font-serif text-3xl first-letter:text-[1.45em] first-letter:mr-[1px]">PhanatchaNuch</div>

      <nav className="mt-12 space-y-2">
        {menus.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 text-sm text-black/60 transition hover:bg-black hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}