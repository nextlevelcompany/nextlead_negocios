"use client";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    window.location.href = "/applications/chatbox";
  }, []);
  return (
    <div className="p-8 text-center text-muted-foreground">
      Cargando WhatsApp & Chat en Vivo...
    </div>
  );
}
