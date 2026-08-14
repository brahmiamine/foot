import { redirect } from "next/navigation";
import { getCurrentSellerSession } from "@/lib/session";

export default async function RootPage() {
  const session = await getCurrentSellerSession();
  redirect(session ? "/dashboard" : "/login");
}
