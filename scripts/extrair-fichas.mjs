/**
 * Extrai as fichas de servico do Atlas para JSON.
 *
 * FONTE UNICA: as fichas vivem em
 *   <ATLAS>/frontend/src/config/servicosCategorias.ts
 * e sao lidas de la no build. Nunca copiar campo a mao — app, painel e papel
 * divergem com o tempo, e o dossie passa a dizer coisas diferentes conforme
 * quem preencheu.
 *
 * O arquivo do Atlas importa `../utils/arquivos`, entao nao da para ler como
 * texto: o esbuild resolve o import, compila para um modulo ESM temporario, e
 * daqui sai o JSON.
 *
 *   npm run fichas
 *
 * O caminho do Atlas pode vir em ATLAS_DIR; o padrao e a pasta irma.
 */
import { build } from 'esbuild'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const ATLAS = process.env.ATLAS_DIR ?? 'C:\\YACTHS-ATLAS-OFICIAL'
const ORIGEM = path.join(ATLAS, 'frontend', 'src', 'config', 'servicosCategorias.ts')
const DESTINO = 'src/fichas/servicos.json'
const TEMP = 'node_modules/.cache/fichas.mjs'

if (!existsSync(ORIGEM)) {
  console.error(`\nNao achei as fichas do Atlas em:\n  ${ORIGEM}\n`)
  console.error('Aponte com ATLAS_DIR se o app principal estiver em outro lugar.\n')
  process.exit(1)
}

await mkdir(path.dirname(TEMP), { recursive: true })
await build({
  entryPoints: [ORIGEM],
  outfile: TEMP,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
})

const { SERVICOS } = await import(pathToFileURL(path.resolve(TEMP)).href)

const fichas = Object.entries(SERVICOS).map(([chave, config]) => ({
  chave,
  ctaNovo: config.ctaNovo,
  fields: config.fields,
  uploads: config.uploads,
}))

await mkdir(path.dirname(DESTINO), { recursive: true })
await writeFile(
  DESTINO,
  JSON.stringify(
    {
      _origem: 'gerado por scripts/extrair-fichas.mjs — nao editar a mao',
      _fonte: 'YACTHS-ATLAS-OFICIAL/frontend/src/config/servicosCategorias.ts',
      _extraidoEm: new Date().toISOString(),
      fichas,
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

await rm(TEMP, { force: true })

const obrigatorios = fichas.reduce(
  (n, f) => n + f.fields.filter((c) => c.required).length,
  0,
)
const travas = fichas.reduce(
  (n, f) => n + f.uploads.filter((u) => u.required || u.requiredIf).length,
  0,
)

console.log(`${fichas.length} fichas -> ${DESTINO}`)
console.log(`  ${fichas.reduce((n, f) => n + f.fields.length, 0)} campos, ${obrigatorios} obrigatorios`)
console.log(`  ${fichas.reduce((n, f) => n + f.uploads.length, 0)} slots de evidencia, ${travas} com trava`)
