import { downloadData } from 'aws-amplify/storage'

interface DownloadFileInput {
  path: string
  fileName: string
}

export async function downloadFile({ path, fileName }: DownloadFileInput) {
  const { body } = await downloadData({
    path,
    options: { onProgress: undefined },
  }).result

  const blob = await body.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  link.style.display = 'none'

  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}