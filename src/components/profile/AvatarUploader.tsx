"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { updateOwnAvatar, removeOwnAvatar } from "@/app/actions/profile";

const MAX_DIMENSION = 256;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB upload cap before resizing

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process this image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = objectUrl;
  });
}

export function AvatarUploader({ name, avatarDataUrl }: { name: string; avatarDataUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarDataUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That image is too large (max 8MB).");
      return;
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const previousPreview = preview;
      setPreview(dataUrl);
      startTransition(async () => {
        const result = await updateOwnAvatar({ avatarDataUrl: dataUrl });
        if (!result.ok) {
          setPreview(previousPreview);
          setError(result.error);
          return;
        }
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
    }
  }

  function handleRemove() {
    const previousPreview = preview;
    setPreview(null);
    setError(null);
    startTransition(async () => {
      const result = await removeOwnAvatar();
      if (!result.ok) {
        setPreview(previousPreview);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} avatarDataUrl={preview} size="xl" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          aria-label="Change profile picture"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="btn-secondary"
        >
          <Camera className="h-3.5 w-3.5" /> Change photo
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" /> Remove photo
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
