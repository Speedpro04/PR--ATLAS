# PRD — Facilitador Operacional Atlas

**Produto:** Yachts Atlas
**Módulo:** PWA de captação em campo (doca, pátio, oficina)
**Público:** funcionário operacional da Marina
**Status:** especificação — nada implementado
**Repositório:** módulo separado, não mistura com `YACTHS-ATLAS-OFICIAL`

---

## 1. O problema, em uma frase

O funcionário está no barco, com a informação na mão, e o painel está no
escritório. Quando ele chega no computador, metade do que sabia virou memória —
e o que não é registrado não existe no dossiê.

## 2. O que este módulo é

Um PWA instalável no celular que deixa o funcionário **registrar serviço no
momento em que o serviço acontece**, offline, e sincronizar depois. O que ele
captura entra como **rascunho**, nunca como registro selado. O escritório revisa
e sela.

### O que este módulo NÃO é

Não é um app de cadastrar embarcação. A Marina cadastra o barco **uma vez** e
registra serviços nele **por anos**. O objeto de trabalho diário é o
**registro de serviço** (`registros`), não o cadastro do barco (`ativos`).

Essa distinção é a correção mais importante em relação à v1 da especificação, e
muda o fluxo, o modelo de dados e a checagem de duplicidade.

---

## 3. Decisões que travam a implementação

São do Marcos. Enquanto não fecharem, o resto é desenho no papel.

### 3.1 Sessão offline

Hoje `get_current_user` (backend/app/core/security.py) chama
`auth.get_user(token)` **no Supabase a cada requisição** — é rede. Sem sinal, o
backend não consegue dizer quem é o usuário.

- Validar o JWT localmente (assinatura) ou confiar no token guardado até expirar?
- Quanto tempo a sessão dura offline — um dia, uma semana?

### 3.2 Inadimplência durante o offline

O mesmo `get_current_user` roda `_barrar_se_devendo`, que devolve **402** para
marina em atraso. Se a Marina ficar inadimplente enquanto o funcionário está três
dias offline:

- Os registros da fila entram assim mesmo, ou ficam retidos?
- (Recomendação: entram. O trabalho foi feito; cobrança é outra conversa, e
  perder registro por causa de boleto destrói a confiança no app.)

### 3.3 Qual byte é a prova

O PWA precisa comprimir foto no celular (dados e espaço). Mas o produto usa
**SHA-256 como prova de integridade**.

- O hash é do arquivo **original da câmera** ou do **comprimido que sobe**?

Precisa estar escrito. Se ficar implícito, alguém ajusta a compressão um dia e
quebra a cadeia de custódia sem ninguém perceber.

### 3.4 Quem é o funcionário

A entidade **não existe** hoje. O sistema conhece Marina (usuário), armador
(reconhecido por e-mail no barco) e admin da plataforma.

Todo registro selado carrega `created_by`. O dossiê vale para seguradora porque
diz **quem** registrou. Identificação por PIN ou lista suspensa faz qualquer um
assinar como qualquer um — e esvazia o registro justamente onde ele deveria
provar mais.

- Funcionário é usuário Supabase de verdade (com login), vinculado à Marina?
- Ou é um rótulo dentro da sessão da Marina, e o `created_by` continua sendo a
  Marina?

---

## 4. O que já existe e vai ser reaproveitado

Levantado no código em 10/09/2026. A v1 da spec propunha reconstruir tudo isto.

| Peça | Onde | Situação |
|---|---|---|
| Camada de staging | `public.registros_rascunho` | pronta, **0 linhas — nunca usada** |
| Endpoints do rascunho | `backend/app/api/v1/registros.py` | criar, editar, listar, descartar, selar |
| Cliente da API | `frontend/src/services/api.ts` | `registros.rascunho.*` já exposto |
| Captura por câmera | `SecureCameraUpload.tsx` | `capture="environment"`, abre a traseira |
| Autorização por ativo | `backend/app/core/authz.py` | 4 caminhos de acesso |
| Definição das fichas | `frontend/src/config/servicosCategorias.ts` | 13 fichas, fonte única dos campos |

### Stack real (a v1 errou)

**React 18 + Vite 5 + react-router-dom** no frontend, **FastAPI (Python)** no
backend, Supabase como banco e storage. **Não há Next.js no projeto.**

Não existe PWA hoje: sem `manifest`, sem service worker, sem cache. Offline é
construção nova — é o coração deste módulo.

### `registros_rascunho` já é o staging pedido

Colunas idênticas às de `registros`, mais `updated_at`. Selar é literalmente:

> INSERT em `registros` → **só então** DELETE do rascunho.
> *"só remove o rascunho depois que o selo existe — nunca perde dado"*

Promoção sem mapeamento de campos. Criar uma tabela `rascunhos_atlas` paralela
seria refazer o que já está pronto e testado.

---

## 5. Arquitetura

```
[PWA no celular]  offline-first, IndexedDB + fila
       │
       │  HTTPS — backend FastAPI (/api/v1), NUNCA Supabase direto
       ▼
[POST /registros/rascunho]  →  public.registros_rascunho
       │
       ▼
[Painel de revisão — dentro do próprio Atlas]
       │  aprova → POST /registros/rascunho/{id}/selar
       ▼
public.registros  (append-only, SHA-256/WORM)
       │
       ▼
[pipeline de dossiê existente — não alterar]
```

**Uma porta só.** O app fala com o backend, como o resto do sistema. Escrever
direto no Supabase pelo navegador criaria um segundo caminho de escrita no mesmo
banco, com regras de autorização diferentes das que já existem.

---

## 6. Fluxo do funcionário

1. Abre o app (instalado na tela de início).
2. **Escolhe o barco** de uma lista já baixada (não digita, não cadastra).
3. **Escolhe o que fez** — troca de óleo, docagem, inspeção. É a categoria.
4. **Fotografa primeiro.** A peça sai do barco e some; a foto é a única prova
   que não dá para refazer no escritório.
5. Preenche o essencial: horímetro, quem executou, o que foi feito.
6. Confirma. Salva local e entra na fila.
7. Sincroniza sozinho quando houver sinal. Sem tela de espera.

O registro chega ao escritório como **rascunho**, nunca selado.

### Campos mínimos

Saem do `servicosCategorias.ts` — fonte única, os mesmos da tela do painel. Não
transcrever à mão: o PWA lê a mesma configuração, senão papel, painel e app
divergem.

Obrigatórios que a v1 esqueceu:

- **Horímetro.** É a leitura que dá sentido ao histórico inteiro.
- **Travas de evidência.** Foto da peça nova e da velha na troca; nota fiscal
  quando há valor. É o que faz a seguradora aceitar o histórico — não pode cair
  em nome de facilitar.

---

## 7. Requisitos do PWA

### Instalável
`manifest.json` com ícone, nome curto ("Atlas Campo"), `display: standalone`,
cor da marca. Android (Chrome) e iOS (Safari — Adicionar à Tela de Início).

### Offline-first
- Service worker cacheando o shell do app.
- IndexedDB para registros pendentes; fotos como **Blob**, não base64 (base64
  infla ~33%).
- Estado visível por registro: `salvo no aparelho` × `enviado`.
- Sincronização automática ao voltar o sinal (Background Sync, com fallback ao
  reabrir).
- **Nada se perde se o app fechar antes de sincronizar.**

### Interface
Tela única, botão grande, contraste alto para sol na doca. Sem menu, sem
navegação secundária.

---

## 7.1 Identidade visual — idêntica ao Atlas

O funcionário tem que abrir o app e reconhecer o Atlas na hora. Mesmas cores,
mesmo raio, mesma tipografia, mesmo logo. Nada de "variação para mobile".

### Cores

Valores do `frontend/src/index.css` do app principal — **são estes que aparecem
na tela**, não os do `tailwind.config.js` (ver aviso no fim desta seção).

| Token | Valor | Uso |
|---|---|---|
| `--navy-deep` | `#010c20` | fundo do body, texto sobre ouro |
| `--navy-main` | `#021431` | superfície |
| `--navy-light` | `#051b3d` | superfície elevada |
| `--gold-primary` | `#c5a059` | botão primário, títulos de seção, foco |
| `--gold-hover` | `#b38f4d` | hover do botão |
| `--gold-text` | `#e5d5b7` | texto dourado claro |
| `--glass-bg` | `rgba(255,255,255,0.02)` | fundo de campo |
| `--glass-border` | `rgba(255,255,255,0.05)` | borda de cartão |

Seleção de texto: fundo `#c5a059`, texto `#010c20`.

### Tipografia

Medido no navegador com `getComputedStyle`, não lido do CSS. O que o CSS
declara e o que a tela mostra **não são a mesma coisa** neste projeto — ver o
aviso no fim desta seção.

- **Corpo, botões e rótulos:** `Inter`.
- **Títulos (h1–h6):** a serifada do sistema —
  `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`.
  É o que a utility `font-serif` do Tailwind entrega, e é o que aparece em
  "Marina Axos Hub" e em toda headline do produto.

Para o PWA ficar idêntico basta carregar **Inter** e usar `font-serif` nos
títulos. **Não** importar Playfair Display achando que é ela — não é.

```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

### Raio

`rounded-sm` (2px) — 296 usos no app contra 3 de `rounded-lg`. Cantos quase
retos são decisão de marca, não descuido. `rounded-full` só em pílula, avatar e
indicador.

**Nunca arredondar mais "porque é mobile".**

### Assinatura dos componentes

Botão primário:
```
bg-[#c5a059] text-[#010c20] px-12 py-4 rounded-sm
text-[10px] font-black uppercase tracking-[0.3em]
hover:bg-[#b38f4d]
```

Rótulo de campo:
```
text-[10px] uppercase tracking-[0.3em] text-white/30 font-black
group-focus-within:text-[#c5a059]
```

Campo de entrada:
```
bg-white/[0.03] border border-white/10 rounded-sm px-5 py-4
focus:border-[#c5a059] outline-none
```

O tamanho minúsculo com `tracking-[0.3em]` em caixa alta é a marca registrada da
interface.

### Celular e tablet — onde "idêntico" precisa ceder

O painel do Atlas é desktop, visto sentado. Este app é usado **em pé, no sol,
com uma mão**. Duas coisas não sobrevivem à cópia literal:

**1. Separe rótulo de conteúdo.**

| | Tamanho | Por quê |
|---|---|---|
| Rótulo (`HORÍMETRO`, `RESPONSÁVEL`) | 10px, caixa alta, `tracking-[0.3em]` | é a marca — mantém |
| Valor que o funcionário lê e digita | **16px no mínimo** | é o que ele precisa enxergar |

**16px em `input` não é escolha estética: abaixo disso o Safari do iOS dá zoom
automático ao focar o campo**, e o formulário salta na cara do usuário a cada
toque. É o defeito nº 1 de formulário em PWA.

**2. Alvo de toque de 44px (iOS) / 48dp (Android), no mínimo.**

O botão do Atlas tem `py-4` (16px) com fonte de 10px — dá cerca de 42px de
altura, no limite. Aqui, cresça o **padding vertical**, mantendo fonte, peso e
tracking. A caixa fica maior; a tipografia, idêntica.

Regra geral: **o dedo ganha padding, a marca mantém a fonte.**

### Responsivo nos dois, de verdade

Celular **e** tablet são de primeira classe. Tablet não é "celular esticado" —
numa faixa de 1024px, uma coluna única fica com linhas longas demais e o polegar
não alcança o meio da tela.

| Faixa | Alvo | Layout |
|---|---|---|
| 360–430px | celular em pé | coluna única, ação fixa no rodapé, ao alcance do polegar |
| 600–900px | tablet em pé / celular deitado | coluna única mais larga, com limite de leitura |
| 1024–1280px | tablet deitado | duas colunas — campos à esquerda, fotos à direita |

Regras que valem em toda a faixa:

- Nada de rolagem horizontal, em nenhuma largura.
- Ação principal sempre alcançável sem trocar a mão de posição.
- Foto em grade que muda de 2 para 3 ou 4 colunas conforme a largura, sem
  distorcer proporção.
- Testar **deitado** também: no barco o tablet vive na horizontal, e é onde a
  altura útil some.
- `viewport-fit=cover` mais `safe-area-inset` — iPhone com entalhe e barra
  inferior comem a área da ação fixa.

O app principal já é responsivo e reduz a base tipográfica em telas pequenas
(`html { font-size: 14px }` até 768px, `13px` até 480px, no `index.css`).
**Não repetir isso aqui:** encolher a raiz derruba junto o valor dos campos e
reabre o zoom do iOS. Ajuste ponto a ponto.

### Logo

`frontend/public/` do app principal: `logo-official.png`,
`logo-transparent.png` (sobre fundo escuro), `logo-with-bg.png`,
`favicon-v2.png` (ícone do PWA).

Copiar os arquivos para este repo. Não recriar, não vetorizar de novo, não
"limpar".

### Aviso: o CSS do app principal declara três coisas que não acontecem

Medido em `localhost:5200` em 10/09/2026:

| O CSS declara | O que a tela faz |
|---|---|
| `index.css`: `h1–h6 { font-family: 'Playfair Display' }` | **Georgia / ui-serif.** `document.fonts.check('16px "Playfair Display"')` → `false` |
| `tailwind.config.js`: `fontFamily.sans = ['Outfit', ...]` | **Inter.** Outfit é baixada e nunca usada (`check` → `false`) |
| `tailwind.config.js`: paleta navy em `#0F172A` | **`#010c20`**, que vem do `index.css` |

**Por que o Playfair não pega:** o `index.css` aplica a fonte dentro de
`@layer base`, e a página usa a utility `font-serif` nos títulos
(`<h1 class="... font-serif ...">`, 16 vezes só na home). Utility vence base no
Tailwind. Como o `tailwind.config.js` não define `serif`, a utility cai no
default do framework — Georgia.

**Consequência para este módulo:** o padrão a copiar é o **medido**, não o
declarado. Importar Playfair Display aqui faria o Facilitador ficar *parecido,
porém diferente* do Atlas — a pior categoria de erro visual, porque ninguém
identifica de onde vem o estranhamento.

Duas fontes (Playfair e Outfit) são baixadas em produção sem serem usadas. Isso
é do app principal, não deste módulo, mas vale arrumar lá um dia — junto com o
`tailwind.config.js`, antes que alguém use a paleta errada de boa-fé.

---

## 8. Duplicidade — revisada

A v1 checava nome de barco repetido. Isso resolve um problema que quase não
acontece (barco novo é raro) e ignora o que acontece toda semana: **o mesmo
serviço registrado duas vezes**, por dois funcionários ou por sincronização
repetida.

A checagem certa é: *já existe rascunho ou registro selado desta **categoria**,
neste **barco**, nesta **data**, com horímetro próximo?*

Aviso não bloqueante — pode ser legítimo (dois motores, dois serviços no mesmo
dia). Marca o rascunho para o revisor olhar.

### Idempotência da fila

Cada registro nasce com um `client_id` (UUID gerado no aparelho). Reenvio com o
mesmo `client_id` não cria linha nova. Sem isso, sinal instável duplica registro
— e o problema não é o barco repetido, é a fila repetindo.

---

## 9. Painel de revisão

Vive **dentro do Atlas**, junto do dado. Não em outro sistema.

- Lista de rascunhos pendentes, mais antigos primeiro.
- Destaque para os marcados como possível duplicata.
- Todos os campos e as fotos.
- Ações: **Aprovar** (chama `selar`), **Devolver** (com motivo, volta ao
  funcionário), **Descartar** (apaga o rascunho — permitido, rascunho é livre).

### Dois eixos de status, não um

A v1 tratou como campo único. São coisas diferentes e coexistem:

| Eixo | Valores | Significa |
|---|---|---|
| Estado do **serviço** (já existe, com CHECK no banco) | `registrado` `pendente` `atencao` `concluido` | o motor está bom ou com ressalva |
| Estado da **revisão** (novo) | `pendente_revisao` `devolvido` `selado` | o escritório já conferiu |

Um registro pode estar `concluido` e `pendente_revisao` ao mesmo tempo.

**"Devolver" não existe hoje** — exige campo de motivo no rascunho. É a única
alteração de schema que este módulo pede.

---

## 10. Critérios de aceite

- [ ] Instala na tela de início em Android e iOS.
- [ ] Formulário funciona 100% offline, incluindo foto.
- [ ] Nada se perde ao fechar o app antes de sincronizar.
- [ ] Sincroniza sozinho ao reconectar, sem ação do funcionário.
- [ ] Reenvio não duplica registro (`client_id`).
- [ ] Aviso de duplicidade aparece e **não** bloqueia.
- [ ] Registro chega em `registros_rascunho`, nunca direto em `registros`.
- [ ] Aprovar no painel chama `selar` e o registro vira append-only.
- [ ] Funcionário de uma Marina não vê nem toca rascunho de outra.
- [ ] Campos do app saem do `servicosCategorias.ts`, não de cópia manual.
- [ ] Cores, raio, tipografia e logo idênticos ao Atlas (seção 7.1) — aberto lado
      a lado com o painel, é o mesmo produto.
- [ ] Responsivo de 360px a 1280px, em pé e deitado, sem rolagem horizontal em
      nenhuma largura.
- [ ] Nenhum campo de digitação abaixo de 16px — focar um input no iPhone não
      pode dar zoom.
- [ ] Alvo de toque de 44px/48dp na ação principal, alcançável com uma mão.

---

## 11. Fora de escopo

- Alterar o pipeline de dossiê. Ele já existe e só é **alimentado** depois do selo.
- Editar registro já selado. Segue o fluxo de retificação do Atlas (motivo
  obrigatório, mínimo 10 caracteres).
- Unificar com o fluxo de fotos por WhatsApp/Evolution. Fase futura.
- Cadastro de embarcação nova pelo celular. O barco vem do painel.

---

## 12. Histórico

- **10/09/2026** — v2. Reescrita sobre o sistema real depois de levantamento no
  código e no banco. Corrige: stack (não é Next.js), staging (usa
  `registros_rascunho`, não tabela nova), objeto de trabalho (serviço, não
  cadastro de barco), duplicidade (mesmo serviço, não mesmo barco), identidade
  (PIN quebra o valor probatório) e status (dois eixos). Acrescenta sessão
  offline, inadimplência offline, byte-da-prova, horímetro, travas de evidência
  e idempotência de fila.
- **v1** — especificação inicial, recebida em PDF.
