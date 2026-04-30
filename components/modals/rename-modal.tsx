"use client";

import { FormEventHandler, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogClose,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRenameModal } from "@/store/use-rename-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { api } from "@/convex/_generated/api";

export const RenameModal = () => {
  const { 
    mutate, 
    pending
  } = useApiMutation(api.board.update);

  const {
    isOpen,
    onClose,
    initialValues,
  } = useRenameModal();

  const [title, setTitle] = useState(initialValues.title);

  useEffect(() => {
    setTitle(initialValues.title);
  }, [initialValues.title]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    e,
  ) => {
    e.preventDefault();

    mutate({
      id: initialValues.id,
      title,
    })
      .then(() => {
        toast.success("Board renamed");
        onClose();
      })
      .catch(() => toast.error("Failed to rename board"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md [&>button]:text-white/40 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-lg [&>button]:p-1">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-white font-semibold text-lg">
            Edit board title
          </DialogTitle>
          <DialogDescription className="text-white/50 text-sm mt-1">
            Enter a new title for this board
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <Input
            disabled={pending}
            required
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Board title"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-0 focus-visible:outline-none w-full text-sm"
          />
          <DialogFooter className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 rounded-xl px-4 py-2 text-sm font-medium">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={pending} type="submit" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
