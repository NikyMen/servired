import { redirect } from "next/navigation";

// El panel del profesional ahora vive en /pro.
export default function PanelPage() {
  redirect("/pro");
}
