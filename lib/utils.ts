import { createCn } from "cn/config";

// The DESIGN.md type scale (app/globals.css `--text-*`). Registered as font
// sizes so merging `text-body-sm` with a colour like `text-primary-soft`
// keeps both instead of treating them as conflicting colours.
const TYPE_SCALE = [
  "display-xl",
  "display-lg",
  "display-md",
  "display-sm",
  "eyebrow",
  "body-lg",
  "body-md",
  "body-sm",
  "caption",
  "code",
];

export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: TYPE_SCALE }] } },
});
