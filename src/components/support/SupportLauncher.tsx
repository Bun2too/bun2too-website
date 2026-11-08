"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
const SupportPanel = dynamic(() => import("./SupportPanel"), { ssr: false });
export default function SupportLauncher() {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [inquiry, setInquiry] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const show = (event: Event) => {
      setInquiry(Boolean((event as CustomEvent).detail?.inquiry));
      setLoaded(true);
      setOpen(true);
    };
    window.addEventListener("bun2too:open-support", show);
    return () => window.removeEventListener("bun2too:open-support", show);
  }, []);
  if (pathname === "/insights/signup") return null;
  return (
    <>
      <button
        type="button"
        className="support-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={loaded ? "bun2too-support" : undefined}
        onClick={() => {
          setInquiry(false);
          setLoaded(true);
          setOpen(true);
        }}
      >
        <img src="/bun2too/logo.png" width={27} height={27} alt="" />
        Ask Bun2Too <span aria-hidden="true">↗</span>
      </button>
      {loaded && (
        <SupportPanel
          open={open}
          initialInquiry={inquiry}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
