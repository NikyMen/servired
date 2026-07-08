import { redirect } from "next/navigation";

// La búsqueda ahora vive en la portada.
export default function BuscarPage() {
  redirect("/");
}
