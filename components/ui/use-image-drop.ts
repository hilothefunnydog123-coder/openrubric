"use client";

import { useCallback, useState, type DragEvent } from "react";

/**
 * Drag-and-drop image upload helper. Spread `dropProps` onto any element to make it a
 * drop zone; `dragging` toggles a highlight while a file hovers. Only image files are
 * accepted; the first one is passed to `onFile`.
 */
export function useImageDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
      if (file) onFile(file);
    },
    [onFile],
  );

  return { dragging, dropProps: { onDragOver, onDragLeave, onDrop } };
}
