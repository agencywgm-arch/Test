import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function LoginPage({ params }: { params: { slug: string } }) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: params.slug } });
  if (!restaurant) notFound();

  const isLoggedIn = await getAdminSession(params.slug);
  if (isLoggedIn) redirect(`/admin/${params.slug}`);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">{restaurant.logoEmoji}</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">{restaurant.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Administration</p>
        </div>
        <LoginForm slug={params.slug} primaryColor={restaurant.primaryColor} />
      </div>
    </div>
  );
}
