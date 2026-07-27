import type EntityDecoderDefault from "@nodable/entities"

declare module "@nodable/entities" {
  // Package runtime exports `export { default as EntityDecoder }`, but the
  // bundled .d.ts only exposes a default export. Align types with runtime.
  export const EntityDecoder: typeof EntityDecoderDefault
}
