import React from "react";
import { Upload } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";

interface FileUploadButtonProps extends Omit<ButtonProps, "onChange"> {
  accept: string;
  onFileSelect: (file: File) => void;
  children?: React.ReactNode;
}

const FileUploadButton = ({ accept, onFileSelect, children = "Upload", ...props }: FileUploadButtonProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFileSelect(file);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleChange} />
      <Button type="button" onClick={() => inputRef.current?.click()} {...props}>
        <Upload /> {children}
      </Button>
    </>
  );
};

export default FileUploadButton;
