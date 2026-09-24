import Link from "next/link";
import type { ComponentProps } from "react";
import { loginPath } from "@/lib/paths";

type AuthRequiredLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  isAuthenticated: boolean;
};

export function AuthRequiredLink({
  href,
  isAuthenticated,
  className,
  children,
  ...rest
}: AuthRequiredLinkProps) {
  return (
    <Link href={isAuthenticated ? href : loginPath(href)} className={className} {...rest}>
      {children}
    </Link>
  );
}
