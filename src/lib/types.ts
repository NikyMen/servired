/** Los dos lados de la app: cliente busca (azul), pro ofrece (verde). */
export type Mode = "cliente" | "pro";

export type ProCard = {
  id: string;
  name: string;
  headline: string;
  category: { slug: string; name: string; icon: string };
  avatarColor: string;
  /** Foto de perfil, si subió una. */
  avatarUrl?: string | null;
  rating: number;
  reviewsCount: number;
  bio: string | null;
  zone: string;
  completedJobs: number;
  externalJobs: number;
  providerType: "profesional" | "oficio";
  verified: boolean;
  featured: boolean;
  yearsExperience: number;
};
