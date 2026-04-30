"use client";

import { toast } from "sonner";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { DropdownMenuContentProps } from "@radix-ui/react-dropdown-menu";

import { ConfirmModal } from "@/components/confirm-modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Button } from "@/components/ui/button";
import { useRenameModal } from "@/store/use-rename-modal";

interface ActionsProps {
  children: React.ReactNode;
  side?: DropdownMenuContentProps["side"];
  sideOffset?: DropdownMenuContentProps["sideOffset"];
  id: string;
  title: string;
};

export const Actions = ({
  children,
  side,
  sideOffset,
  id,
  title,
}: ActionsProps) => {
  const { onOpen } = useRenameModal();
  const { mutate, pending } = useApiMutation(api.board.remove);

  const onCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/board/${id}`,
    )
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Failed to copy link"))
  };

  const onDelete = () => {
    mutate({ id })
      .then(() => toast.success("Board deleted"))
      .catch(() => toast.error("Failed to delete board"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onClick={(e) => e.stopPropagation()}
        side={side}
        sideOffset={sideOffset}
        className="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-1 min-w-[180px] w-60"
      >
        <DropdownMenuItem
          onClick={onCopyLink}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm flex items-center gap-2.5 cursor-pointer w-full"
        >
          <Link2 className="text-white/40 h-4 w-4" />
          Copy board link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onOpen(id, title)}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm flex items-center gap-2.5 cursor-pointer w-full"
        >
          <Pencil className="text-white/40 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <ConfirmModal
          header="Delete board?"
          description="This will delete the board and all of its contents."
          disabled={pending}
          onConfirm={onDelete}
        >
          <Button
            variant="ghost"
            className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2 text-sm flex items-center gap-2.5 cursor-pointer w-full justify-start font-normal"
          >
            <Trash2 className="text-white/40 h-4 w-4" />
            Delete
          </Button>
        </ConfirmModal>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
