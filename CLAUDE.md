# CLAUDE.md — Facilitador Operacional Atlas

Leia `PRD.md` antes de propor qualquer coisa, e `memory.md` para o contexto que
não está no código.

## O que é

PWA de captação em campo para o funcionário da Marina registrar **serviço** no
barco, offline, e sincronizar depois. Módulo **separado** do Yachts Atlas.

**Estado: E1 feita, E2-b em andamento.** Detalhe em `memory.md`.

O serviço está detalhado na **seção 12 do PRD**: as entregas em ordem, cada uma
com o que inclui e como se sabe que terminou. Siga aquela ordem.

Das quatro decisões da seção 3, **três fecharam**; falta a 3.3 (qual byte é a
prova do SHA-256), que só bloqueia a E3.

**Este repo faz E1, E2-b, E3, E4, E5.** No repo do Atlas ficam a **E2-a**
(vínculo colaborador↔Marina, login por matrícula e endpoint de refresh — sem
isso o colaborador loga e vê frota vazia) e a **E6** (painel de revisão). Para
qualquer uma delas, abrir sessão em `C:\YACTHS-ATLAS-OFICIAL`.

## Regras duras

**Não commitar cruzado.** Este repo é `Speedpro04/Facilitador-Operacional-Atlas`,
pasta `C:\FACILITADOR-ATLAS`. O app principal é `YACTHS-ATLAS-OFICIAL`, pasta
`C:\YACTHS-ATLAS-OFICIAL` (YACTHS, com o T antes do H). Nada deste módulo entra
lá, e nada de lá entra aqui.

**PRD e memory antes do commit.** Regra da AXOS HUB: documenta primeiro,
commita depois. Nunca o contrário.

**Ao pushar, mostrar URL + branch + commit.** Sempre.

**Uma porta só.** O app fala com o backend FastAPI em `/api/v1`. O navegador
nunca escreve direto no Supabase — seria um segundo caminho de escrita no mesmo
banco, com outra regra de autorização.

**Imutabilidade.** `registros` é append-only: nem UPDATE nem DELETE, nem com
service_role. Selar é INSERT. Correção só por retificação com motivo (mín. 10
caracteres). Rascunho é livre; selo, nunca. Se for mexer em imutabilidade, RLS ou
segredo, aponte **tudo** que estiver aberto no mesmo momento, não guarde para
depois.

**As travas de evidência não caem.** Foto da peça nova ao lado da velha, nota
fiscal quando há valor. É o que faz a seguradora aceitar o histórico. Afrouxar
para facilitar o preenchimento esvazia o produto.

**Fonte única dos campos.** As fichas vivem em
`C:\YACTHS-ATLAS-OFICIAL\frontend\src\config\servicosCategorias.ts` (13 fichas).
O PWA lê de lá. Nunca copiar campo à mão — app, painel e papel divergem com o
tempo.

**Identidade visual idêntica ao Atlas.** Valores exatos na seção 7.1 do PRD.
O essencial, **medido no navegador** (não lido do CSS): fundo `#010c20`, ouro
`#c5a059`, títulos com a utility `font-serif` (= Georgia/ui-serif), corpo e
botões em **Inter**, `rounded-sm` (2px) em tudo, rótulos de 10px em caixa alta
com `tracking-[0.3em]`.

**Não importe Playfair Display nem Outfit.** O CSS do app principal declara as
duas, e nenhuma é usada na tela — detalhes e medição no PRD 7.1. Copiar o
declarado faz este módulo ficar *parecido porém diferente*, que é o pior
resultado possível.

**Celular e tablet, ambos responsivos.** O app é usado em pé, no sol, com uma
mão. Onde "idêntico" cede: valor de campo a 16px no mínimo (abaixo disso o
Safari do iOS dá zoom sozinho ao focar), alvo de toque de 44px/48dp, e layout
que funciona de 360px a 1280px — celular em pé, tablet deitado, e o meio do
caminho. Rótulo mantém os 10px. **O dedo ganha padding, a marca mantém a
fonte.**

## Onde olhar no app principal

Este módulo depende do código do Atlas. Consulte, não duplique:

| O quê | Caminho em `C:\YACTHS-ATLAS-OFICIAL` |
|---|---|
| Rascunho: modelo em 2 estágios e os 5 endpoints | `backend/app/api/v1/registros.py` |
| Autenticação e o porteiro de inadimplência (402) | `backend/app/core/security.py` |
| Autorização por ativo (4 caminhos) | `backend/app/core/authz.py` |
| Campos das fichas | `frontend/src/config/servicosCategorias.ts` |
| Captura por câmera já pronta | `frontend/src/components/SecureCameraUpload.tsx` |
| Cliente da API (`registros.rascunho.*`) | `frontend/src/services/api.ts` |

Banco Supabase do Atlas (BR): projeto `owzelkiyorumnlaycral`. Tabelas que
importam aqui: `registros_rascunho`, `registros`, `ativos`, `documentos`.

## Stack

**React 18 + Vite 5** no frontend, **FastAPI (Python)** no backend, Supabase
(banco + storage). **Não há Next.js no projeto** — a v1 da spec errou isso.

Não existe PWA hoje no Atlas: sem manifest, sem service worker, sem cache.
Offline é construção nova.

## Como o Marcos trabalha

- Resposta curta e no foco. Termine o que foi pedido antes de abrir frente nova;
  achado fora do escopo cabe em uma frase.
- Comece pelo mais fácil: ordene plano por esforço crescente, não por gravidade.
- Ele trabalha com pausas. Pausa é método — ele volta com achado, ouça primeiro.
- Ele é o Marcos e chama o assistente de CLAUDE.
- Sem plano pago antes de ter receita: nada de serviço cobrado sem as Marinas
  pagantes: procure alternativa grátis.

## Vocabulário

**Índice de Custódia** (completude) ≠ **Conformidade** (estado) ≠ **Perfil de
Manutenção**. "Saúde" está aposentada — a plataforma não inspeciona barco, ela
guarda o que a Marina registrou.

"Marina" é nome próprio no texto que o cliente lê; minúsculo só em código,
e-mail e comentário.
