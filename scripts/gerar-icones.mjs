/**
 * Gera os icones do PWA a partir do icone do Atlas.
 *
 * O arquivo do app principal chama-se `favicon-v2.png` mas e um JPEG por
 * dentro (assinatura ffd8). O sharp le assim mesmo; o que sai daqui e PNG
 * de verdade.
 *
 * Nao recriar, nao vetorizar, nao "limpar" — o icone e o do Atlas (PRD 7.1).
 *
 *   npm run icones
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const ORIGEM = 'public/favicon-v2.png'
const DESTINO = 'public/icons'
const NAVY = { r: 1, g: 12, b: 32, alpha: 1 } // #010c20

await mkdir(DESTINO, { recursive: true })

for (const lado of [192, 512]) {
  await sharp(ORIGEM)
    .resize(lado, lado, { fit: 'cover' })
    .png()
    .toFile(`${DESTINO}/icon-${lado}.png`)
  console.log(`icon-${lado}.png`)
}

// Maskable: o Android recorta em circulo e come ate 20% de cada borda.
// O icone entra a 60% do quadro, sobre o navy do app.
const miolo = Math.round(512 * 0.6)
await sharp({
  create: { width: 512, height: 512, channels: 4, background: NAVY },
})
  .composite([
    {
      input: await sharp(ORIGEM).resize(miolo, miolo, { fit: 'contain' }).png().toBuffer(),
      gravity: 'center',
    },
  ])
  .png()
  .toFile(`${DESTINO}/icon-maskable-512.png`)
console.log('icon-maskable-512.png')
