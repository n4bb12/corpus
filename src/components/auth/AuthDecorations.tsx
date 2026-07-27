import { useEffect, useRef, useState } from "react"
import { cn } from "src/lib/utils"

/**
 * Dark backdrop: Masaaki Komori — mossy forest, Nagano
 * https://unsplash.com/photos/hFH1bK2CYSE
 *
 * Light backdrop: mist forest (white fog over green canopy)
 * https://images.unsplash.com/photo-1542273917363-3b1817f69a2d
 */
const AUTH_BACKDROP_DARK = "/images/auth-backdrop-dark.jpg"
const AUTH_BACKDROP_LIGHT = "/images/auth-backdrop-light.jpg"

type AuthBackdropPhotoProps = {
  src: string
  width: number
  height: number
  className?: string
}

function AuthBackdropPhoto({
  src,
  width,
  height,
  className,
}: AuthBackdropPhotoProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = imgRef.current

    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [])

  return (
    <img
      ref={imgRef}
      src={src}
      alt=""
      width={width}
      height={height}
      decoding="async"
      fetchPriority="low"
      onLoad={() => setLoaded(true)}
      className={cn(
        "auth-backdrop-photo absolute inset-0 size-full scale-105 object-cover transition-opacity duration-500 ease-spring motion-reduce:transition-none",
        loaded ? className : cn(className, "opacity-0"),
      )}
    />
  )
}

export function AuthDecorations() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <AuthBackdropPhoto
        src={AUTH_BACKDROP_LIGHT}
        width={2400}
        height={1594}
        className="opacity-60 blur-[2px] dark:hidden"
      />
      <AuthBackdropPhoto
        src={AUTH_BACKDROP_DARK}
        width={2400}
        height={1602}
        className="hidden opacity-50 blur-md dark:block"
      />
      <div className="absolute inset-0 bg-background/40 dark:bg-background/55" />
      <div className="absolute -top-40 -left-24 size-152 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute top-[42%] -right-36 size-128 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl" />
      <div className="absolute -bottom-48 left-[28%] size-112 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-24 right-[18%] size-40 rounded-full bg-primary/4 blur-2xl" />
    </div>
  )
}
