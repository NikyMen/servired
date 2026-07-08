export type ProCard = {
  id: string;
  name: string;
  headline: string;
  category: { slug: string; name: string; icon: string };
  avatarColor: string;
  rating: number;
  reviewsCount: number;
  zone: string;
  priceFrom: number;
  verified: boolean;
  featured: boolean;
  yearsExperience: number;
};
