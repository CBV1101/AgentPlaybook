import { cookies } from "next/headers";
import type { AppUser } from "@/lib/auth-user";
import { readMockDatabase } from "@/lib/data/mock/store";

export const MOCK_SESSION_COOKIE = "firsthand_mock_user";

export async function getMockUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(MOCK_SESSION_COOKIE)?.value;
  if (!userId) {
    return null;
  }

  const database = readMockDatabase();
  const account = database.accounts.find((item) => item.id === userId);
  if (!account) {
    return null;
  }

  return { id: account.id, email: account.email };
}

export async function setMockUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearMockUser() {
  const cookieStore = await cookies();
  cookieStore.delete(MOCK_SESSION_COOKIE);
}
