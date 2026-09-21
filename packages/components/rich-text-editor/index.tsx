'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Quill touches `document` on import, so it must not render on the server
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  label,
  placeholder = 'Write something...',
  error,
}: RichTextEditorProps) => {
  // Memoized so Quill doesn't re-initialize on every render
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  return (
    <div className="w-full">
      {label && <label className="block mb-1">{label}</label>}
      <div className="[&_.ql-toolbar]:bg-gray-200 [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-container]:text-white [&_.ql-editor]:min-h-[200px] [&_.ql-toolbar]:border-gray-700 [&_.ql-container]:border-gray-700">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default RichTextEditor;