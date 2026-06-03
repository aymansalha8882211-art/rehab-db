/**
 * AttachmentsTab.tsx
 * artifacts/rehab-db/src/components/AttachmentsTab.tsx
 *
 * تاب المرفقات في بروفايل المستفيد
 * يدعم: صور، PDF، مستندات — على مستوى الحالة أو الجلسة
 * التخزين: base64 في IndexedDB (Dexie)
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Attachment, AttachmentCategory } from '@/data/mockData';
import type { Session } from '@/data/mockData';
import {
  Paperclip, Upload, Trash2, Download, Image, FileText,
  File, Eye, X, Camera, Loader2,
} from 'lucide-react';

interface Props {
  beneficiaryId: string;
  sessions: Session[];
  language: string;
  canUpload: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function fileTypeFromMime(mime: string): Attachment['fileType'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'document';
}

function fileIcon(ft: Attachment['fileType']) {
  if (ft === 'image') return Image;
  if (ft === 'pdf') return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsTab({ beneficiaryId, sessions, language, canUpload }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAr = language === 'ar';

  const [attachments, setAttachments]   = useState<Attachment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [previewName, setPreviewName]   = useState('');
  const [filterCat, setFilterCat]       = useState<'all' | 'case' | 'session'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load attachments from Dexie
  const loadAttachments = async () => {
    setLoading(true);
    try {
      const rows = await db.attachments
        .where('beneficiaryId')
        .equals(beneficiaryId)
        .toArray();
      rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      setAttachments(rows);
    } catch (e) {
      console.error('Failed to load attachments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAttachments(); }, [beneficiaryId]);

  // Read file as base64
  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleUpload = async (files: FileList | null, category: AttachmentCategory = 'case') => {
    if (!files || files.length === 0 || !currentUser) return;
    setUploading(true);

    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: نوع الملف غير مدعوم`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name}: الحجم أكبر من ${MAX_FILE_SIZE_MB} MB`);
        continue;
      }

      // Check max 5 files per beneficiary
      const existing = await db.attachments.where('beneficiaryId').equals(beneficiaryId).count();
      if (existing >= 5) {
        errors.push(isAr ? 'وصلت للحد الأقصى (5 ملفات لكل حالة)' : 'Maximum 5 files per case');
        break;
      }

      try {
        const dataUrl = await readAsDataUrl(file);
        const attachment: Attachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          beneficiaryId,
          category,
          fileName: file.name,
          fileType: fileTypeFromMime(file.type),
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl,
          uploadedBy: currentUser.id,
          uploadedByName: currentUser.fullName,
          uploadedAt: new Date().toISOString(),
        };
        await db.attachments.add(attachment);
      } catch {
        errors.push(`${file.name}: فشل الرفع`);
      }
    }

    setUploading(false);
    await loadAttachments();

    if (errors.length > 0) {
      toast({ title: isAr ? 'تحذير' : 'Warning', description: errors.join('\n'), variant: 'destructive' });
    } else {
      toast({ title: isAr ? 'تم رفع الملف بنجاح ✓' : 'File uploaded ✓' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    await db.attachments.delete(id);
    await loadAttachments();
    toast({ title: isAr ? `تم حذف "${name}"` : `Deleted "${name}"` });
  };

  const handleDownload = (att: Attachment) => {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.fileName;
    a.click();
  };

  const handlePreview = (att: Attachment) => {
    setPreviewUrl(att.dataUrl);
    setPreviewName(att.fileName);
  };

  const filtered = attachments.filter(a =>
    filterCat === 'all' ? true : a.category === filterCat
  );

  const getSessionLabel = (sessionId?: string) => {
    if (!sessionId) return null;
    const s = sessions.find(s => s.id === sessionId);
    return s ? `${s.sessionNumber || s.serviceDate}` : sessionId;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? `${attachments.length} / 5 ملف مرفق`
              : `${attachments.length} / 5 files attached`}
          </p>
        </div>

        {canUpload && attachments.length < 5 && (
          <div className="flex gap-2">
            {/* Camera / Gallery (mobile) */}
            <Button
              size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.capture = 'environment';
                  fileInputRef.current.click();
                }
              }}
              disabled={uploading}
            >
              <Camera className="w-3.5 h-3.5" />
              {isAr ? 'كاميرا' : 'Camera'}
            </Button>
            {/* File picker */}
            <Button
              size="sm" className="gap-1.5 text-xs"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = ALLOWED_TYPES.join(',');
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isAr ? 'رفع ملف' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
            />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      {attachments.length > 0 && (
        <div className="flex gap-1.5">
          {(['all', 'case', 'session'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat === 'all'
                ? (isAr ? `الكل (${attachments.length})` : `All (${attachments.length})`)
                : cat === 'case'
                  ? (isAr ? 'مرفقات الحالة' : 'Case files')
                  : (isAr ? 'مرفقات الجلسات' : 'Session files')}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && attachments.length === 0 && (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Paperclip className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {isAr ? 'لا توجد مرفقات بعد' : 'No attachments yet'}
            </p>
            {canUpload && (
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? 'يمكنك رفع صور، PDF، أو مستندات (حتى 5 ملفات، 5 MB لكل ملف)'
                  : 'Upload images, PDFs, or documents (max 5 files, 5 MB each)'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(att => {
            const Icon = fileIcon(att.fileType);
            const sessionLabel = getSessionLabel(att.sessionId);
            const canDelete = currentUser?.role === 'admin' || att.uploadedBy === currentUser?.id;

            return (
              <Card key={att.id} className="overflow-hidden">
                {/* Image preview strip */}
                {att.fileType === 'image' && (
                  <div
                    className="h-32 bg-muted overflow-hidden cursor-pointer"
                    onClick={() => handlePreview(att)}
                  >
                    <img
                      src={att.dataUrl}
                      alt={att.fileName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      att.fileType === 'image' ? 'bg-blue-100 text-blue-600' :
                      att.fileType === 'pdf'   ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(att.sizeBytes)} · {att.uploadedByName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(att.uploadedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      att.category === 'case'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {att.category === 'case'
                        ? (isAr ? 'حالة' : 'Case')
                        : (isAr ? 'جلسة' : 'Session')}
                    </span>
                    {sessionLabel && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {sessionLabel}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    {att.fileType === 'image' && (
                      <button
                        onClick={() => handlePreview(att)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Eye className="w-3 h-3" />{isAr ? 'عرض' : 'View'}
                      </button>
                    )}
                    {att.fileType === 'pdf' && (
                      <button
                        onClick={() => handlePreview(att)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Eye className="w-3 h-3" />{isAr ? 'فتح' : 'Open'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(att)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Download className="w-3 h-3" />{isAr ? 'تحميل' : 'Download'}
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(att.id, att.fileName)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors ms-auto"
                      >
                        <Trash2 className="w-3 h-3" />{isAr ? 'حذف' : 'Delete'}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drag & Drop zone (desktop) */}
      {canUpload && attachments.length < 5 && !loading && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = ALLOWED_TYPES.join(',');
              fileInputRef.current.removeAttribute('capture');
              fileInputRef.current.click();
            }
          }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
          onDragLeave={e => { e.currentTarget.classList.remove('border-primary'); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-primary');
            void handleUpload(e.dataTransfer.files);
          }}
        >
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'اسحب وأفلت الملفات هنا أو انقر للاختيار'
              : 'Drag & drop files here or click to browse'}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {isAr ? 'صور، PDF، مستندات — حتى 5 MB' : 'Images, PDF, documents — up to 5 MB'}
          </p>
        </div>
      )}

      {/* Lightbox / Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 end-2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-white text-sm text-center mb-2 truncate">{previewName}</p>
            {previewUrl.startsWith('data:image') ? (
              <img
                src={previewUrl}
                alt={previewName}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <iframe
                src={previewUrl}
                title={previewName}
                className="w-full h-[80vh] rounded-lg bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
