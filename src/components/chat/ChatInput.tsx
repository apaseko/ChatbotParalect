'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
} from 'lucide-react';
import { authHeaders } from '@/hooks/useAuth';
import type { LLMModel } from '@/types';

interface ChatInputProps {
  onSend: (content: string, imageUrls: string[], model: LLMModel) => void;
  isStreaming: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  chatId: string | null;
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
}

export default function ChatInput({
  onSend,
  isStreaming,
  disabled,
  disabledMessage,
  chatId,
  selectedModel,
  onModelChange,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if ((!trimmed && attachedImages.length === 0) || isStreaming || disabled) return;

    onSend(trimmed, attachedImages, selectedModel);
    setMessage('');
    setAttachedImages([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          // Convert to base64 Data URL
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            setAttachedImages((prev) => [...prev, dataUrl]);
          };
          reader.readAsDataURL(file);
        }
      }
    },
    []
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setAttachedImages((prev) => [...prev, dataUrl]);
        };
        reader.readAsDataURL(file);
      }
    });

    e.target.value = '';
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !chatId) return;

    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', chatId);
        formData.append('type', 'document');

        await fetch('/api/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        });
      }
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-xl">
      {/* Attached images preview */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {attachedImages.map((img, i) => (
            <div
              key={i}
              className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-muted/50"
            >
              <img src={img} alt={`Attached ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Disabled message */}
      {disabled && disabledMessage && (
        <div className="mb-3 p-3 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg text-center animate-in fade-in">
          {disabledMessage}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? 'Sign up to continue...' : 'Type a message...'}
            disabled={isStreaming || disabled}
            className="min-h-[44px] max-h-[200px] resize-none bg-background/50 border-border/50 rounded-xl pr-12 text-sm focus-visible:ring-blue-500/50 transition-all"
            rows={1}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <Select value={selectedModel} onValueChange={(v) => onModelChange(v as LLMModel)}>
            <SelectTrigger className="w-[130px] h-9 bg-background/50 border-border/50 text-xs font-medium">
              {selectedModel === 'gpt-4o' ? 'Llama 3.2 Vision' : 'Gemini 2.0'}
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <SelectItem value="gpt-4o">Llama 3.2 Vision</SelectItem>
              <SelectItem value="gemini-2.0-flash">Gemini 2.0</SelectItem>
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || disabled}
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Attach image</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => docInputRef.current?.click()}
              disabled={isStreaming || disabled || !chatId}
            >
              {uploadingFile ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
            </TooltipTrigger>
            <TooltipContent>Upload document</TooltipContent>
          </Tooltip>

          <Button
            size="icon"
            className="h-9 w-9 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300"
            onClick={handleSubmit}
            disabled={isStreaming || disabled || (!message.trim() && attachedImages.length === 0)}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={handleDocUpload}
      />
    </div>
  );
}
