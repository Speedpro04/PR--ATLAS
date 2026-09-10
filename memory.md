# memory.md — Facilitador Operacional Atlas

Contexto que não se deduz lendo o código. Para quem (ou o que) abrir este repo
sem ter participado das conversas.

---

## O que é este repo

Módulo **separado** do Yachts Atlas: PWA de captação em campo para o funcionário
da Marina. Repo e pasta próprios, como o `DOSSIE-MODEL-ATLAS`.

- Pasta local: `C:\FACILITADOR-ATLAS`
- Remoto: `Speedpro04/Facilitador-Operacional-Atlas`
- **Não commitar nada deste módulo no `YACTHS-ATLAS-OFICIAL`**, e vice-versa.

O app principal fica em `C:\YACTHS-ATLAS-OFICIAL` (YACTHS, com o T antes do H).

---

## Alvo de uso

**Celular e tablet, os dois responsivos** — decisão do Marcos em 10/09/2026.
Tablet não é celular esticado: no barco ele vive deitado, e é aí que a altura
útil some. Faixa de 360px a 1280px, em pé e deitado. Detalhe na seção 7.1 do
PRD.

O app principal é desktop, visto sentado. Este é usado em pé, no sol, com uma
mão — é a única dimensão em que "idêntico ao Atlas" cede, e cede de forma
controlada: o dedo ganha padding, a marca mantém a fonte.

## Estado em 10/09/2026

**Nada implementado, e não deve começar ainda** — o Marcos pediu para segurar.
Só os três documentos. A v1 da especificação chegou em
PDF e foi reescrita como `PRD.md` depois de levantamento no código real.

Três decisões do Marcos travam o início (seção 3 do PRD): sessão offline,
inadimplência durante o offline, e qual byte é a prova do SHA-256. Uma quarta —
quem é o funcionário — decide se dá para confiar no `created_by`.

---

## Por que a v1 foi reescrita

O documento original era bem estruturado, mas descrevia outro sistema:

- Dizia "mesma stack do Yachts Atlas" e nomeava **Next.js**. O Atlas é
  **React 18 + Vite 5** com backend **FastAPI**.
- Propunha criar `rascunhos_atlas`. Já existe `registros_rascunho`, com forma
  idêntica a `registros` e cinco endpoints prontos — nunca usada, 0 linhas.
- Fazia um app de **cadastrar embarcação**. A Marina cadastra o barco uma vez e
  registra serviço nele por anos. O objeto diário é o serviço.
- Identificava o funcionário por PIN ou lista. Todo registro selado carrega
  `created_by`, e é isso que faz o dossiê valer para seguradora.

---

## Coisas do Atlas que este módulo precisa respeitar

**Imutabilidade.** `registros` é append-only: nem UPDATE nem DELETE, nem com
service_role. Selar é INSERT. Correção só por retificação, com motivo de no
mínimo 10 caracteres. O rascunho é livre; o selo, nunca.

**Uma porta só.** Todo o app fala com o backend FastAPI em `/api/v1`. O
navegador não escreve direto no Supabase. Abrir um segundo caminho de escrita
significa duas regras de autorização para o mesmo dado.

**Autorização não é `marina_id` simples.** `get_ativo_autorizado` aceita quatro
caminhos: `usuario_id` (legado), `owner_id`, `marina_id` via profile, e armador
reconhecido pelo e-mail gravado no barco. Ignorar os outros três quebra acesso de
quem já usa.

**As travas de evidência não caem.** Foto da peça nova ao lado da velha, nota
fiscal quando há valor. É o que faz a seguradora aceitar o histórico. Afrouxar
isso facilita o preenchimento e esvazia o produto — o oposto do objetivo.

**Fonte única dos campos.** As fichas vivem em
`frontend/src/config/servicosCategorias.ts` (13 fichas). O PWA lê de lá. Copiar
campo à mão faz app, painel e papel divergirem com o tempo.

**Identidade visual idêntica, sem exceção.** Decisão do Marcos em 10/09/2026:
mesmas cores, mesmo raio de botão, mesma tipografia, mesmo logo. Os valores
estão na seção 7.1 do PRD.

O motivo não é estética. O funcionário abre o app no píer e o dono da Marina
abre o painel no escritório — se parecerem produtos diferentes, é porque são
dois produtos, e o Atlas deixa de ser *a* plataforma da Marina para virar *um
app* que a Marina também usa.

Armadilhas que se esquecem fácil:

- **A serifada dos títulos é a do sistema, não a Playfair.** Ver abaixo.
- **`rounded-sm` (2px), não mais.** São 296 usos contra 3 de `rounded-lg` no app.
  Canto quase reto é marca, não descuido. A tentação de arredondar mais em mobile
  é forte e está proibida.
- **Fonte de 10px com `tracking-[0.3em]`** é a assinatura da interface, e vale
  para os **rótulos**. O valor que o funcionário digita vai a 16px — abaixo
  disso o Safari do iOS dá zoom sozinho ao focar o campo.

### O CSS do app principal declara o que não acontece

Medido no navegador em 10/09/2026, com `getComputedStyle` e
`document.fonts.check` — não lido do CSS:

- `index.css` manda `h1–h6` em **Playfair Display**. A tela mostra
  **Georgia/ui-serif**, e a Playfair nem chega a ser ativada. Motivo: o CSS
  aplica a fonte em `@layer base`, mas as páginas usam a utility `font-serif`
  nos títulos (16 vezes só na home), e utility vence base no Tailwind. Como o
  `tailwind.config.js` não define `serif`, a utility cai no default do
  framework — Georgia.
- `tailwind.config.js` declara `fontFamily.sans = ['Outfit', ...]` e paleta navy
  em `#0F172A`. A tela usa **Inter** e **`#010c20`**. Outfit é baixada em
  produção e nunca usada.

**Consequência:** o padrão a copiar é o **medido**, não o declarado. Se este
módulo importar Playfair Display "seguindo o CSS", nasce *parecido porém
diferente* do Atlas — a pior categoria de erro visual, porque ninguém consegue
apontar de onde vem o estranhamento. Ver [[uma-fonte-por-fato]].

---

## Onde este módulo nasceu

Da conversa sobre **como facilitar o preenchimento do painel operacional**. Três
caminhos foram levantados, por esforço crescente:

1. **Repetir último serviço** — a ficha de manutenção tem 43 campos, 11
   obrigatórios. A troca de óleo das 400h repete quase tudo da troca das 300h.
   Clonar o anterior derruba de ~40 campos para ~6. Uma tela, sem banco.
   **Nunca clonar** data, horímetro, valor, nota fiscal, fotos e número de série:
   dois registros com o mesmo horímetro são lidos como manutenção fabricada.
2. **Ligar o rascunho** — pronto no backend, desligado na interface.
3. **PWA offline** — este repo. O mais caro dos três.

Existe também uma **ficha de campo impressa** (gerada a partir do mesmo
`servicosCategorias.ts`, via esbuild) como plano B: para quem não tem celular e
para o dia em que o app falhar. Três folhas A4 hoje; encolhe para meia folha
depois do item 1.

---

## Vocabulário

Vale o mesmo do Atlas: **Índice de Custódia** (completude) ≠ **Conformidade**
(estado) ≠ **Perfil de Manutenção**. "Saúde" está aposentada — a plataforma não
inspeciona barco, ela guarda o que a Marina registrou.

"Marina" é nome próprio no texto que o cliente lê; minúsculo só em código,
e-mail e comentário.
