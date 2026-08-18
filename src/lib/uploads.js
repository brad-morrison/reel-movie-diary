const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const CLOUDINARY_CLOUD = 'svkiqpst'
const CLOUDINARY_PRESET = 'reel-uploads'

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')) }
    image.src = url
  })
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare that image')),
    'image/jpeg',
    quality,
  ))
}

async function cropImage(file, width, height) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 15 MB')
  const image = await loadImage(file)
  const targetRatio = width / height
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth
  const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
  return canvasBlob(canvas, .86)
}

async function uploadToCloudinary(blob, tags) {
  const body = new FormData()
  body.append('file', blob, 'reel-upload.jpg')
  body.append('upload_preset', CLOUDINARY_PRESET)
  body.append('tags', tags)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body,
      signal: controller.signal,
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary rejected that image')
    return result.secure_url
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('The image upload timed out. Please try again.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function uploadProfileImage(userId, file) {
  const blob = await cropImage(file, 512, 512)
  return uploadToCloudinary(blob, `reel,avatar,user-${userId}`)
}

export async function uploadPosterImage(userId, itemId, file) {
  const blob = await cropImage(file, 1000, 1500)
  const safeUser = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeId = String(itemId || 'custom').replace(/[^a-zA-Z0-9_-]/g, '_')
  return uploadToCloudinary(blob, `reel,poster,user-${safeUser},item-${safeId}`)
}
