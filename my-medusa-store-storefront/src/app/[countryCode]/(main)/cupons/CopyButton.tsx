"use client";

import { useState } from "react";

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // This securely copies the text to the user's clipboard!
    navigator.clipboard.writeText(code);
    setCopied(true);
    
    // Reset the button text back to normal after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <button 
      className={`btn btn-sm fw-bold ${copied ? 'btn-success text-white' : 'btn-outline-success'}`} 
      onClick={handleCopy}
    >
      {copied ? "COPIED! ✓" : "COPY CODE"}
    </button>
  );
}