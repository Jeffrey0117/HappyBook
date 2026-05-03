const MAX_WIDTH = 1200
const JPEG_QUALITY = 0.8

export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export async function uploadToUpimg(blob: Blob, filename?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', blob, filename ?? 'cover.jpg')

  const res = await fetch('https://duk.tw/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`)
  }

  const data = await res.json()
  return data.shortUrl || data.url
}

export async function uploadCoverPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  return uploadToUpimg(compressed, file.name)
}
