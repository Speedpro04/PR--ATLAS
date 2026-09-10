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

## Estado em 10/09/2026

**Nada implementado.** Só os dois documentos. A v1 da especificação chegou em
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
