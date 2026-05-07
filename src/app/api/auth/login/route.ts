import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.phanatchanuch.com";

export async function POST(req: Request) {
  const body = await req.json();

  const backendRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json().catch(() => null);

  const res = NextResponse.json(data, {
    status: backendRes.status,
  });

  const setCookie = backendRes.headers.get("set-cookie");

  if (setCookie) {
    res.headers.set("set-cookie", setCookie);
  }

  return res;
}