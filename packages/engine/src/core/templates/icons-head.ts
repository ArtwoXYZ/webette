type BuildIconsHeadOptions = {
  publicBase: string
  appleGeneratedSizes: number[]
  androidGeneratedSizes: number[]
  faviconGeneratedSizes: number[]
  faviconLightSizes: number[]
  faviconDarkSizes: number[]
  hasManifest: boolean
  hasMsTile144: boolean
  tileColor: string
  themeColor: string
  themeColorLight?: string
  themeColorDark?: string
  colorScheme?: string
}

export function buildIconsHead(options: BuildIconsHeadOptions): string {
  const {
    publicBase,
    appleGeneratedSizes,
    androidGeneratedSizes,
    faviconGeneratedSizes,
    faviconLightSizes,
    faviconDarkSizes,
    hasManifest,
    hasMsTile144,
    tileColor,
    themeColor,
    themeColorLight,
    themeColorDark,
    colorScheme,
  } = options

  const tags: string[] = []

  if (appleGeneratedSizes.length) {
    for (const size of appleGeneratedSizes) {
      tags.push(
        `<link rel="apple-touch-icon" sizes="${size}x${size}" href="${publicBase}/apple-icon-${size}x${size}.png">`,
      )
    }
  }

  if (androidGeneratedSizes.includes(192)) {
    tags.push(
      `<link rel="icon" type="image/png" sizes="192x192" href="${publicBase}/android-icon-192x192.png">`,
    )
  }

  if (faviconLightSizes.length) {
    for (const size of faviconLightSizes) {
      tags.push(
        `<link rel="icon" type="image/png" sizes="${size}x${size}" media="(prefers-color-scheme: light)" href="${publicBase}/favicon-${size}x${size}-light.png">`,
      )
    }
  }

  if (faviconDarkSizes.length) {
    for (const size of faviconDarkSizes) {
      tags.push(
        `<link rel="icon" type="image/png" sizes="${size}x${size}" media="(prefers-color-scheme: dark)" href="${publicBase}/favicon-${size}x${size}-dark.png">`,
      )
    }
  }

  if (faviconGeneratedSizes.length) {
    for (const size of faviconGeneratedSizes) {
      tags.push(
        `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${publicBase}/favicon-${size}x${size}.png">`,
      )
    }
  }

  if (hasManifest) {
    tags.push(`<link rel="manifest" href="${publicBase}/manifest.json">`)
  }

  if (hasMsTile144) {
    tags.push(`<meta name="msapplication-TileColor" content="${tileColor}">`)
    tags.push(`<meta name="msapplication-TileImage" content="${publicBase}/ms-icon-144x144.png">`)
  }

  if (themeColorLight) {
    tags.push(
      `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${themeColorLight}">`,
    )
  }

  if (themeColorDark) {
    tags.push(
      `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${themeColorDark}">`,
    )
  }

  if (!themeColorLight && !themeColorDark) {
    tags.push(`<meta name="theme-color" content="${themeColor}">`)
  } else if (!(themeColorLight && themeColorDark)) {
    tags.push(`<meta name="theme-color" content="${themeColor}">`)
  }

  if (colorScheme) {
    tags.push(`<meta name="color-scheme" content="${colorScheme}">`)
  }

  if (!tags.length) return ''
  return ['<!-- Icons -->', ...tags].join('\n    ')
}
