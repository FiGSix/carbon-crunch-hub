import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Minimal dependency-free rich text editor. Produces inline-safe HTML suitable
 * for email bodies; merge tags are typed as plain text ({{name}}, {{projects_list}}).
 * Images are uploaded to Supabase Storage first — email clients cannot render
 * blob: or data: URLs, so only absolute public HTTPS URLs are embedded.
 */
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // Only sync when the external value changes identity (load / reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "" : undefined]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Link URL", "https://crunchcarbon.com/");
    if (url) exec("createLink", url);
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files can be inserted");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    const alt = window.prompt("Alt text (shown when images are blocked)", file.name) || "";

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("broadcast-assets")
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from("broadcast-assets").getPublicUrl(path);
      const escAlt = alt.replace(/"/g, "&quot;");
      exec(
        "insertHTML",
        `<img src="${data.publicUrl}" alt="${escAlt}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;margin:12px 0" />`,
      );
      toast.success("Image uploaded and inserted");
    } catch (e: any) {
      toast.error(e?.message ?? "Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const tools = [
    { icon: Bold, label: "Bold", action: () => exec("bold") },
    { icon: Italic, label: "Italic", action: () => exec("italic") },
    { icon: Heading2, label: "Heading", action: () => exec("formatBlock", "<h2>") },
    { icon: List, label: "Bullet list", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", action: () => exec("insertOrderedList") },
    { icon: Link2, label: "Link", action: addLink },
    {
      icon: uploading ? Loader2 : ImagePlus,
      label: "Insert image",
      action: () => fileRef.current?.click(),
    },
    { icon: Undo2, label: "Undo", action: () => exec("undo") },
  ];

  const insertTag = (tag: string) => {
    ref.current?.focus();
    document.execCommand("insertText", false, tag);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1">
        {tools.map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="sm"
            title={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={action}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {["{{name}}", "{{projects}}", "{{project_count}}"].map((tag) => (
          <Button
            key={tag}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertTag(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        className="min-h-[240px] w-full px-3 py-2 text-sm outline-none [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
      />
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {"{{projects}}"} renders the first 5 project titles then “and N more” — never the full list.
      </p>
    </div>
  );
}
