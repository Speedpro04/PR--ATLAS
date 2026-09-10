# CLAUDE.md — Facilitador Operacional Atlas

Leia `PRD.md` antes de propor qualquer coisa, e `memory.md` para o contexto que
não está no código.

## O que é

PWA de captação em campo para o funcionário da Marina registrar **serviço** no
barco, offline, e sincronizar depois. Módulo **separado** do Yachts Atlas.

**Estado: nada implementado.** Só documentação. Quatro decisões do Marcos travam
o início — seção 3 do PRD. Não comece a implementar antes que ele feche pelo
menos a 3.4 (quem é o funcionário): ela decide se o `created_by` vale alguma
coisa.

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

**Identidade visual idêntica ao Atlas.** Cores, raio, tipografia e logo, sem
variação "para mobile". Valores exatos na seção 7.1 do PRD. O essencial:
fundo `#010c20`, ouro `#c5a059`, títulos em **Playfair Display**, corpo em
**Inter**, `rounded-sm` (2px) em tudo, rótulos de 10px em caixa alta com
`tracking-[0.3em]`. Para caber no dedo, aumente o padding — nunca a fonte.

Tema copia-se do `frontend/src/index.css`, **nunca** do `tailwind.config.js`:
esse último declara Outfit e `#0F172A`, que não são usados em lugar nenhum.

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
