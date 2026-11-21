import blueHouseSprite from '../assets/craftpix-house-blue.png'
import greenHouseSprite from '../assets/craftpix-house-green.png'
import plumHouseSprite from '../assets/craftpix-house-plum.png'
import redHouseSprite from '../assets/craftpix-house.png'

export const houseColors = [
  { name: 'Red', color: '#d98676', sprite: redHouseSprite },
  { name: 'Blue', color: '#85a9d8', sprite: blueHouseSprite },
  { name: 'Green', color: '#81ad8c', sprite: greenHouseSprite },
  { name: 'Plum', color: '#b192c2', sprite: plumHouseSprite },
]

export function houseSprite(color, plotIndex) {
  return houseColors.find((option) => option.color === color)?.sprite ?? houseColors[plotIndex].sprite
}

export const houseLinkMaxLength = 2048

export function houseLink(value, kind) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\s\\]/.test(value)) return null

  try {
    const url = new URL(value)
    if (url.username || url.password || url.href.length > houseLinkMaxLength) return null
    if (kind === 'github') {
      const githubHost = url.hostname === 'github.com' || url.hostname === 'www.github.com'
      if (!githubHost || url.protocol !== 'https:' || url.port || !/^\/[^/]/.test(url.pathname)) return null
    }
    return url.href
  } catch {
    return null
  }
}
