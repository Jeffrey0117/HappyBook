import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Check, Loader2 } from 'lucide-react'

interface SwapPhotoUploadProps {
  existingUrl: string | null
  onUpload: (file: File) => Promise<void>
  label?: string
}

const SwapPhotoUpload = ({ existingUrl, onUpload, label = '上傳交換照片' }: SwapPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  if (existingUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <Check className="h-4 w-4" />
          已上傳
        </div>
        <img
          src={existingUrl}
          alt="交換照片"
          className="w-full max-w-xs rounded-lg border"
        />
      </div>
    )
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />上傳中...</>
        ) : (
          <><Camera className="mr-2 h-4 w-4" />{label}</>
        )}
      </Button>
    </div>
  )
}

export default SwapPhotoUpload
