// Ambient types for @lobehub/icons deep "Mono" subpath imports.
//
// We import each AI brand mark via its self-contained Mono component
// (e.g. "@lobehub/icons/es/OpenAI/components/Mono") to avoid the antd-dependent
// barrel/index. Those internal files ship no .d.ts, so declare the shape here.
declare module "@lobehub/icons/es/*/components/Mono" {
  import type { FC, SVGProps } from "react";
  const Icon: FC<SVGProps<SVGSVGElement> & { size?: number | string }>;
  export default Icon;
}
