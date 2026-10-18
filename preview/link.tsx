"use client";

/** Stand-in for `next/link` in the single-file preview build. */

import * as React from "react";

import { hashFromPath, useRouter } from "./router";

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, prefetch: _prefetch, replace, scroll: _scroll, ...rest },
  ref,
) {
  const router = useRouter();

  return (
    <a
      ref={ref}
      href={hashFromPath(href)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Let modified clicks (new tab / window) use the hash link.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (replace) router.replace(href);
        else router.push(href);
      }}
      {...rest}
    />
  );
});

export default Link;
