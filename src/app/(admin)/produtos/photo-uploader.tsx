"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addProductPhotos, updatePhotoOrder, removePhoto } from "@/lib/products/actions";

/**
 * Uploader de até 5 fotos por produto (D-11–D-13, PROD-03,
 * 03-UI-SPEC.md §Photo uploader). Compressão client-side via
 * `browser-image-compression` (Web Worker, correção EXIF automática —
 * Pitfall 4/A1 de 03-RESEARCH.md: NUNCA reprocessar orientação em outra
 * camada) e reordenação touch-friendly via `@dnd-kit/sortable`.
 *
 * Dois modos, mesma UI:
 * - **Criação** (sem `productId`): fotos comprimidas ficam como File[] em
 *   memória (slots "pending"); `onPendingFilesChange` notifica
 *   product-form.tsx a cada mudança, para anexar ao mesmo FormData de
 *   `saveProduct` no submit (nunca upload antes do produto existir).
 * - **Edição** (`productId` presente, Plan 03-05): cada ação
 *   (adicionar/remover/reordenar) chama imediatamente a Server Action
 *   dedicada (`addProductPhotos`/`removePhoto`/`updatePhotoOrder`) — os
 *   slots são sempre "saved" (id real + URL pública).
 */
const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

export type SavedPhoto = { id: string; url: string };

type Slot =
  | { kind: "saved"; id: string; url: string }
  | { kind: "pending"; localId: string; file: File; previewUrl: string };

export type PhotoUploaderProps = {
  productId?: string;
  initialPhotos?: SavedPhoto[];
  onPendingFilesChange?: (files: File[]) => void;
};

function slotKey(slot: Slot): string {
  return slot.kind === "saved" ? slot.id : slot.localId;
}

function pendingFilesOf(slots: Slot[]): File[] {
  return slots
    .filter((slot): slot is Extract<Slot, { kind: "pending" }> => slot.kind === "pending")
    .map((slot) => slot.file);
}

/**
 * Modo edição: após adicionar uma foto via `addProductPhotos`, a Server
 * Action não retorna os dados da foto criada (só `{success, id: productId}`)
 * — recarregar via o client de browser (RLS já garante escopo por dono) é
 * mais simples do que estender o retorno da action só para isso.
 */
async function refreshSavedPhotos(productId: string): Promise<SavedPhoto[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("product_photos")
    .select("id, storage_path")
    .eq("product_id", productId)
    .order("position", { ascending: true });

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    url: supabase.storage.from("product-images").getPublicUrl(row.storage_path).data.publicUrl,
  }));
}

export function PhotoUploader({ productId, initialPhotos, onPendingFilesChange }: PhotoUploaderProps) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    (initialPhotos ?? []).map((photo) => ({ kind: "saved" as const, id: photo.id, url: photo.url }))
  );
  const [processingCount, setProcessingCount] = useState(0);
  const [, startBackgroundTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const emptySlotCount = Math.max(0, MAX_PHOTOS - slots.length - processingCount);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    // Permite escolher o mesmo arquivo de novo no futuro (ex.: depois de remover).
    event.target.value = "";
    if (!fileList || fileList.length === 0) {
      return;
    }

    const incoming = Array.from(fileList);
    const roomLeft = MAX_PHOTOS - slots.length;
    if (roomLeft <= 0) {
      toast.error("Você já atingiu o limite de 5 fotos por produto.");
      return;
    }
    if (incoming.length > roomLeft) {
      toast.error("Você já atingiu o limite de 5 fotos por produto.");
    }
    const toProcess = incoming.slice(0, roomLeft);

    for (const file of toProcess) {
      setProcessingCount((count) => count + 1);
      try {
        // Compressão + correção EXIF automática (Pitfall 4/A1) — único lugar
        // do pipeline onde isso acontece, nunca refeito em outra camada.
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        if (productId) {
          const formData = new FormData();
          formData.append("photos", compressed);
          const result = await addProductPhotos(productId, formData);
          if ("error" in result) {
            toast.error(result.error);
          } else {
            const refreshed = await refreshSavedPhotos(productId);
            setSlots(refreshed.map((photo) => ({ kind: "saved" as const, id: photo.id, url: photo.url })));
          }
        } else {
          const previewUrl = URL.createObjectURL(compressed);
          setSlots((prev) => {
            const next: Slot[] = [
              ...prev,
              { kind: "pending" as const, localId: crypto.randomUUID(), file: compressed, previewUrl },
            ];
            onPendingFilesChange?.(pendingFilesOf(next));
            return next;
          });
        }
      } catch {
        toast.error("Não foi possível processar essa foto. Tente novamente.");
      } finally {
        setProcessingCount((count) => Math.max(0, count - 1));
      }
    }
  }

  function handleRemove(slot: Slot) {
    if (slot.kind === "pending") {
      URL.revokeObjectURL(slot.previewUrl);
      setSlots((prev) => {
        const next = prev.filter((item) => slotKey(item) !== slotKey(slot));
        onPendingFilesChange?.(pendingFilesOf(next));
        return next;
      });
      return;
    }

    const photoId = slot.id;
    // Otimista: esvazia o slot na hora (D-13), toast só se a remoção falhar.
    setSlots((prev) => prev.filter((item) => slotKey(item) !== photoId));
    startBackgroundTransition(async () => {
      const result = await removePhoto(photoId);
      if ("error" in result) {
        toast.error(result.error);
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setSlots((prev) => {
      const oldIndex = prev.findIndex((slot) => slotKey(slot) === active.id);
      const newIndex = prev.findIndex((slot) => slotKey(slot) === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      const reordered = arrayMove(prev, oldIndex, newIndex);

      if (productId) {
        const order = reordered
          .filter((slot): slot is Extract<Slot, { kind: "saved" }> => slot.kind === "saved")
          .map((slot, index) => ({ id: slot.id, position: index }));

        // Otimista (D-12): reordena na hora, persiste em background, toast só em falha.
        startBackgroundTransition(async () => {
          const result = await updatePhotoOrder(order);
          if ("error" in result) {
            toast.error(result.error);
          }
        });
      } else {
        onPendingFilesChange?.(pendingFilesOf(reordered));
      }

      return reordered;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-medium text-[#111111]">Fotos</h2>
      <p className="text-xs text-[#6B6B6B]">Até 5 fotos. A primeira é a capa da sua vitrine.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map(slotKey)} strategy={horizontalListSortingStrategy}>
          <div className="grid grid-cols-5 gap-2">
            {slots.map((slot, index) => (
              <PhotoSlotItem key={slotKey(slot)} slot={slot} isCover={index === 0} onRemove={() => handleRemove(slot)} />
            ))}

            {Array.from({ length: processingCount }).map((_, index) => (
              <div
                key={`processing-${index}`}
                className="flex aspect-square items-center justify-center rounded-lg border border-[#F5F5F3] bg-[#F5F5F3]"
              >
                <div className="flex flex-col items-center gap-1 text-[#6B6B6B]">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span className="text-xs">Enviando…</span>
                </div>
              </div>
            ))}

            {Array.from({ length: emptySlotCount }).map((_, index) => (
              <label
                key={`empty-${index}`}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#F5F5F3] text-[#6B6B6B]"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs">Adicionar foto</span>
                <input type="file" multiple accept={ACCEPTED_TYPES} className="sr-only" onChange={handleFilesSelected} />
              </label>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type PhotoSlotItemProps = {
  slot: Slot;
  isCover: boolean;
  onRemove: () => void;
};

/**
 * Slot preenchido (empty/uploading vêm de PhotoUploader diretamente).
 * `useSortable` só participa da grade quando o slot está preenchido — slots
 * vazios não são drop targets (03-UI-SPEC.md §Photo uploader).
 */
function PhotoSlotItem({ slot, isCover, onRemove }: PhotoSlotItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slotKey(slot) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square overflow-hidden rounded-lg border border-[#F5F5F3] ${isDragging ? "opacity-50" : ""}`}
    >
      {slot.kind === "saved" ? (
        <Image src={slot.url} alt="" fill sizes="20vw" className="object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- preview de object URL local (blob:), next/image não serve esse esquema
        <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
      )}

      {isCover && (
        <span className="absolute left-1 top-1 rounded-full bg-[#00C46A] px-2 py-0.5 text-xs text-white">Capa</span>
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar foto"
        className="absolute bottom-1 left-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 p-2 text-[#111111]"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover foto"
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-white p-2 text-[#FF4D4D]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
