import type { Config } from "tailwindcss";

import base from "../tailwind.config";

/** The app's Tailwind config, plus the preview shell's own files. */
const config: Config = {
  ...base,
  content: [...(base.content as string[]), "./preview/**/*.{ts,tsx}"],
};

export default config;
