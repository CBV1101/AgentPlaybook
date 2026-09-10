import Link from "next/link";
import { loginPath } from "@/lib/paths";

type AuthRequiredLinkProps = {
  href: string;
  isAuthenticated: boolean;
  className?: string;
  children: React.ReactNode;
};

export function AuthRequiredLink({
  href,
  isAuthenticated,
  className,
  children,
}: AuthRequiredLinkProps) {
  return (
    <Link href={isAuthenticated ? href : loginPath(href)} className={className}>
      {children}
    </Link>
  );
}
