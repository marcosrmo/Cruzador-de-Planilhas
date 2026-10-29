import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  description?: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

const SUPPORTED_SPREADSHEET_EXTENSIONS = [
  ".xlsx", ".xlsm", ".xlsb", ".xls", ".xltx", ".xltm", ".xlt", ".xlm", ".xla", ".xlam", ".xlw", ".xml",
  ".csv", ".tsv", ".txt", ".dif", ".slk", ".sylk", ".prn",
  ".numbers", ".ods", ".fods", ".uos", ".uos1", ".uos2", ".dbf",
  ".wk1", ".wk3", ".wks", ".wk2", ".wk4", ".123",
  ".wq1", ".wq2", ".wb1", ".wb2", ".wb3", ".qpw", ".xlr", ".eth",
  ".html", ".htm",
];

const SUPPORTED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.ms-excel.template.macroEnabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "text/tab-separated-values",
]);
const DEFAULT_ACCEPT = [
  ...SUPPORTED_SPREADSHEET_EXTENSIONS,
  ...Array.from(SUPPORTED_MIME_TYPES),
].join(",");

export function FileUpload({ label, description, onFileSelect, accept = DEFAULT_ACCEPT }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  }, []);

  const handleFile = (file: File) => {
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    const hasSupportedExtension = Boolean(extension && SUPPORTED_SPREADSHEET_EXTENSIONS.includes(extension));
    const hasSupportedMimeType = SUPPORTED_MIME_TYPES.has(file.type);

    // MIME types are inconsistent across browsers and file sources; accept either a known extension or MIME type.
    if (file && (hasSupportedExtension || hasSupportedMimeType)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert(`Formato não suportado. Use uma planilha Excel ou arquivo compatível: ${SUPPORTED_SPREADSHEET_EXTENSIONS.join(", ")}`);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-200 mb-2">
        {label}
      </label>
      
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center cursor-pointer group hover:border-primary/50 hover:bg-primary/5",
            isDragging ? "border-primary bg-primary/10" : "border-slate-700 bg-slate-800/50"
          )}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
            accept={accept}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-800 rounded-full shadow-sm ring-1 ring-slate-700 group-hover:scale-110 transition-transform duration-200 group-hover:bg-slate-700">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">
                Clique para selecionar ou arraste o arquivo
              </p>
              {description && (
                <p className="text-xs text-slate-400">
                  {description}
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                Compatível com XLS, XLSX, XLSM, XLSB, ODS, CSV e outros formatos de planilha.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative border rounded-xl p-4 bg-slate-800/80 shadow-sm ring-1 ring-white/10 flex items-center justify-between group">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
