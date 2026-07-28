import Link from "next/link"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { Button } from "src/components/ui/shadcn/button"

export default function NotFoundPage() {
  return (
    <div className="atmosphere atmosphere-noise flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandLockup />

      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Page not found
        </h1>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          That route does not exist, or the notebook may have been removed.
        </p>
      </div>

      <Button asChild className="rounded-full">
        <Link href="/">Back to notebooks</Link>
      </Button>
    </div>
  )
}
