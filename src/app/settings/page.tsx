import AdminLayout from "@/components/admin/AdminLayout";
import { apiData } from "@/lib/api";
import SettingsForm from "./SettingsForm";

type Settings = Record<string, string | null>;

async function getSettings() {
  return apiData<Settings>("/settings", {
    cache: "no-store",
  });
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <AdminLayout title="Settings">
      <SettingsForm initialSettings={settings} />
    </AdminLayout>
  );
}