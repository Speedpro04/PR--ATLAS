# PRD — Facilitador Operacional Atlas

**Produto:** Yachts Atlas
**Módulo:** PWA de captação em campo (doca, pátio, oficina)
**Nome do app:** Atlas Pré-Data
**Público:** colaborador de chão da Marina — píer, área seca, galpão
**Status:** E1, E2-b, E3 e E4 implementadas e provadas em uso · as 4 decisões fechadas
**Repositório:** módulo separado, não mistura com `YACTHS-ATLAS-OFICIAL`

---

## 1. O problema, em uma frase

O funcionário está no barco, com a informação na mão, e o painel está no
escritório. Quando ele chega no computador, metade do que sabia virou memória —
e o que não é registrado não existe no dossiê.

## 2. O que este módulo é

> **O Atlas Pré-Data é a ponte do chão da Marina para o escritório. Só isso.**

Ponte não sela, não analisa, não vira relatório. Ponte leva. Se uma ideia não
ajuda a travessia do píer até a mesa de quem revisa, ela está fora — e essa
frase é o critério de corte deste documento inteiro.

Um PWA instalável no celular que deixa o funcionário **registrar serviço no
momento em que o serviço acontece**, offline, e sincronizar depois. O que ele
captura entra como **rascunho**, nunca como registro selado. O escritório revisa
e sela.

**Ele é a matéria-prima do escritório, não o sistema.** O app captura só o que
existe no barco e some se ninguém registrar na hora: fotos, horímetro, qual
barco, quando, quem estava lá. O que mora na gaveta — valor, nota fiscal, número
da OS, código da peça — é preenchido na revisão. O rascunho chega **incompleto
de propósito**.

O escritório deixa de **caçar informação** e passa a **conferir e completar**.

### O que este módulo NÃO é

Não é um app de cadastrar embarcação. A Marina cadastra o barco **uma vez** e
registra serviços nele **por anos**. O objeto de trabalho diário é o
**registro de serviço** (`registros`), não o cadastro do barco (`ativos`).

Essa distinção é a correção mais importante em relação à v1 da especificação, e
muda o fluxo, o modelo de dados e a checagem de duplicidade.

---

## 3. Decisões que travam a implementação

São do Marcos. **Três fechadas em 10/09/2026; a 3.3 segue aberta.**

### 3.1 Sessão offline · DECIDIDA 10/09/2026

**Sessão longa: 7 dias.** O app não pede login de novo enquanto durar.

O que destravou a decisão: **offline o app não fala com o backend**. A fila mora
no IndexedDB, e a autenticação só importa na hora de sincronizar — que é online
por definição. Não é preciso validar JWT sem rede, e `security.py` não muda.

**O offline aqui é a borda do wi-fi, não o alto-mar.** A Marina tem wi-fi; ele
não alcança o fim do píer. O colaborador sai do sinal, trabalha quarenta
minutos, volta para a área coberta e o aparelho sincroniza sozinho, no bolso.
Minutos, não dias. Os 7 dias são folga, não a rotina.

**O primeiro login sempre tem rede** — acontece no pátio, no dia em que o
aparelho é preparado. Depois disso o celular já sabe quem é a pessoa.

Na sincronização faz refresh normal do token. Se o refresh falhar, pede acesso
de novo — **e a fila continua guardada**. Nenhum registro se perde por sessão
vencida.

**Sinal fraco é pior que sinal nenhum.** Na borda do alcance o celular fica
agarrado a um wi-fi de uma barra e não troca para o 4G: a requisição não volta
nem dá erro, e o app trava com a bolinha girando. É o momento em que o
colaborador desiste. Regra: **nunca esperar pela rede** — poucos segundos sem
resposta e o registro vai para a fila, sem alarde. Ver E4.

**O que o offline custa, e é assumido:** desligar alguém no painel não alcança
um aparelho sem rede. O corte só vale quando ele tenta sincronizar. Com wi-fi na
marina essa janela é de horas, não de dias.

### 3.2 Inadimplência durante o offline · DECIDIDA 10/09/2026

**Os registros entram assim mesmo.** A rota de sincronização fica isenta do 402
de `_barrar_se_devendo` (`backend/app/core/security.py`).

O trabalho foi feito; cobrança é outra conversa. Perder registro por causa de
boleto destrói a confiança no app — e o colaborador veria "erro ao enviar" sem
ter como entender o motivo, porque a dívida não é da conta dele.

### 3.3 Qual byte é a prova · RESOLVIDA 11/09/2026

**O hash é do arquivo original da câmera.** A foto sobe sem compressão.

A decisão se resolveu ao olhar o código em vez de debater: o
`POST /documentos/upload/{ativo}` do Atlas **calcula o SHA-256 no servidor**,
sobre os bytes que chegam (`s3_service.calculate_hash`). Quem define qual byte
é a prova, portanto, é quem envia — e não mexer no arquivo faz a prova ser o
que a câmera produziu.

O custo é dado móvel: foto de celular tem 2-5 MB. É aceitável porque a
sincronização acontece no wi-fi da Marina (3.1), não no 4G do píer.

**Se um dia a compressão entrar**, ela muda a prova sem avisar ninguém — e aí
tem de ser decisão escrita, não otimização. Está registrado em
`nucleo/api.ts`, na função que envia.

### 3.4 Quem é o funcionário · DECIDIDA 10/09/2026

**O colaborador tem login de verdade — e digita a senha uma vez, não todo dia.**

- A Marina o cadastra no painel: **nome, matrícula e telefone**. Não e-mail
  corporativo, que o pessoal do chão não tem.
- **Ele entra por matrícula e senha.** Todo mundo sabe a própria matrícula;
  ninguém ali sabe um e-mail de trabalho. Por baixo o Supabase continua
  exigindo um endereço, montado pelo app a partir da matrícula — o colaborador
  nunca o vê. Na tela dele são dois campos e o logo.
- **Uma Marina por aparelho, e o vínculo não é tela.** Matrícula 001 existe em
  duas Marinas, então o aparelho precisa saber de qual ele é. Isso é assunto da
  E2 e resolve-se no cadastro, **não com uma tela de código na frente do
  login** — foi tentado em 10/09/2026 e cortado no mesmo dia: era um passo a
  mais no caminho de quem só quer registrar um serviço.
- Ele entra uma vez, com rede, e o app fica aberto (3.1).
- O `created_by` do que ele captura é **dele**, não da Marina.
- Saiu da empresa: a Marina desliga no painel.

A decisão foi e voltou na conversa de 10/09/2026, e o motivo do retorno vale
mais do que ela. O argumento para tirar o login era que **a assinatura que vale
é a de quem sela** — como nada entra selado, o valor probatório do dossiê vem da
revisão, não do login de quem capturou. Isso continua verdade, mas resolve só o
lado jurídico.

O que ele não resolve é a **segunda-feira de manhã**: sem login, o aparelho vira
chave mestra, qualquer um registra como qualquer um, e quando chega ao
escritório um horímetro impossível não há com quem conversar — há só um nome que
alguém tocou numa lista. **Responsabilidade não é só para a seguradora.**

Por isso o PIN da v1 continua condenado, e a lista de nomes cai junto: os dois
identificam por honra.

**O atrito real não é existir senha — é digitar senha com a mão suja, em pé,
toda vez.** Login uma vez e sessão longa é o que o WhatsApp faz: tem login, e
ninguém lembra de ter feito.

**Falta decidir, quando aparecer:** o aparelho é da pessoa ou da Marina. Se for
compartilhado, sessão longa não serve sozinha — o dia inteiro sairia no nome de
quem entrou de manhã, e é preciso troca rápida de pessoa. Offline, só troca para
quem **já entrou naquele aparelho** alguma vez com rede.

E o revisor **não é cargo novo**: é quem já entra no Atlas hoje — dono,
administrativo, quem toma conta. Marina pequena não tem encarregado, e o app não
pode exigir que ela arrume um.

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

## 6. Fluxo do colaborador

Três telas, nessa ordem. Decidido em 10/09/2026.

**Tela 1 — Login.** Logo do Atlas, o nome da Marina, matrícula e senha. Só
isso — nenhuma tela antes dela. Acontece uma vez; depois a sessão dura 7 dias
(3.1) e ele não vê mais esta tela.

**Tela 2 — Escolher o barco.** É o único momento em que ele precisa *procurar*
alguma coisa, e por isso tem uma tela inteira só para ela: lista grande, busca
por nome, funciona offline. Ele não digita e não cadastra — o barco vem do
painel.

**Tela 3 — O fichário.** Abre já sabendo de quem está falando.

O cabeçalho **vem preenchido, e ele não digita nada disso**:

| Campo | De onde vem |
|---|---|
| quem fez | quem entrou no app |
| matrícula | do cadastro |
| dia e hora | relógio do aparelho, ao abrir a ficha |
| barco | a escolha da tela 2 |

Ele só **confere**. Se estiver errado, é porque entrou como outra pessoa — e aí
é bom mesmo que apareça grande. Isso é exatamente o que o escritório precisa
saber, ninguém consegue reconstituir depois, e sai de graça: o app já sabe.

Digitado por ele fica só o que o app não tem como saber:

1. **O que fez** — troca de óleo, docagem, inspeção. É a categoria, escolhida
   numa lista, sem digitar.
2. **Fotografa primeiro.** A peça sai do barco e some; a foto é a única prova
   que não dá para refazer no escritório.
3. **Horímetro** — fotografado no painel, não datilografado.
4. Confirma. Salva local e entra na fila.
5. Sincroniza sozinho quando houver sinal. Sem tela de espera.

O registro chega ao escritório como **rascunho**, nunca selado.

### Campos mínimos

Saem do `servicosCategorias.ts` — fonte única, os mesmos da tela do painel. Não
transcrever à mão: o PWA lê a mesma configuração, senão papel, painel e app
divergem.

### Quem preenche o quê

A ficha de manutenção tem **43 campos, 11 obrigatórios**. É formulário de
escritório: ninguém preenche em pé, no sol, com uma mão. Quem tenta ou abandona
o app, ou preenche mentindo — que é pior. A ficha se divide por **quem tem a
informação**:

| No barco — o app | Na gaveta — a revisão |
|---|---|
| qual barco, categoria do serviço | valor |
| foto da peça velha ao lado da nova | nota fiscal |
| foto do horímetro | número da OS |
| o que foi feito (lista, sem digitar) | código da peça |
| quem estava lá e quando (o app sabe) | conferência e selo |

**A trava de evidência não cai — muda de mão.** Nota fiscal continua obrigatória
para selar, só que a exigência passa a ser de quem sela. A foto da peça velha ao
lado da nova continua obrigatória no campo, porque é lá que ela existe: a peça
sai do barco e some.

Obrigatórios que a v1 esqueceu:

- **Horímetro.** É a leitura que dá sentido ao histórico inteiro.
- **Travas de evidência.** Foto da peça nova e da velha na troca; nota fiscal
  quando há valor. É o que faz a seguradora aceitar o histórico — não pode cair
  em nome de facilitar.

---

## 7. Requisitos do PWA

### Instalável
`manifest.json` com ícone, nome curto ("Atlas Pré-Data"), `display: standalone`,
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
- **O mar.** O Atlas Pré-Data é o chão da Marina: píer, área seca, galpão, barco no
  berço. Registro em navegação — uma foto e uma observação ditada, longe de
  qualquer rede — foi levantado em 10/09/2026 e **cortado de propósito**. Dois
  modos de uso dobram o app para atender a exceção, e o modo mais fácil vira o
  incompleto: em três meses ninguém faria mais registro completo. Volta a ser
  conversa quando as Marinas estiverem usando o app todo dia e pedirem.

---

## 12. O serviço a ser feito

Sete entregas, em ordem. Cada uma fecha sozinha e pode ser vista funcionando —
nada de "só dá pra testar no fim".

**Duas delas não são neste repo.** A E0 é decisão do Marcos, e a E6 é código do
app principal. Ver "Onde cada coisa mora", no fim desta seção.

---

### E0 — Destravar as decisões · *do Marcos, não de quem implementa*

As quatro da seção 3. **Três fechadas em 10/09/2026** — sessão offline (7 dias),
inadimplência offline (entram assim mesmo) e quem é o funcionário (tem login,
com sessão longa). **Falta a 3.3**, o byte da prova, que não bloqueia E1 nem E2
e só aparece na E3.

**Bloqueava tudo.** A 3.4 (quem é o funcionário) decide a E2 inteira: se for
usuário Supabase de verdade, é login normal; se for rótulo dentro da sessão da
Marina, muda o `created_by`, muda o RLS e muda o valor probatório do registro.

**Pronto quando:** as quatro respondidas por escrito no PRD. **Três de quatro.**

---

### E1 — Esqueleto do PWA instalável

- Projeto Vite + React 18 + TypeScript (mesma base do Atlas, sem Next).
- `manifest.json`: nome "Atlas Pré-Data", `display: standalone`, `theme_color`
  `#010c20`, ícones 192/512 a partir do `favicon-v2.png`.
- Service worker cacheando o shell (HTML/CSS/JS/fontes). Estratégia: shell em
  cache-first, dados nunca.
- Tema medido da seção 7.1 — cores, `rounded-sm`, Inter, `font-serif` nos
  títulos. **Sem Playfair, sem Outfit.**
- Layout responsivo base: 360–430 / 600–900 / 1024–1280, em pé e deitado.
- `viewport-fit=cover` + `safe-area-inset`.

**Pronto quando:** instala na tela de início em Android e iPhone, abre **em modo
avião** mostrando o shell, e lado a lado com o painel do Atlas é o mesmo produto.

---

### E2 — Sessão e lista de barcos, offline

**A E2 não cabe só neste repo.** Levantado no código do Atlas em 10/09/2026,
depois que a 3.4 fechou por login de verdade. Ver "E2-a", logo abaixo.

- **Tela de login** (3.4): logo, nome da Marina, matrícula e senha. Nada antes
  dela. O vínculo do aparelho com a Marina vem do cadastro, não de uma tela.
- Entra uma vez com rede e o app fica aberto. O `created_by` é dele.
- **Tela de escolha do barco** separada da ficha — lista grande, busca por nome,
  offline.
- Ao entrar com rede: baixa os ativos da Marina e guarda no IndexedDB
  (id, nome, marca, modelo, ano — o suficiente para escolher).
- Sessão sobrevive a fechar o app, pelo prazo decidido na 3.1.

**Pronto quando:** abre em modo avião, mostra a frota e deixa escolher um barco.

---

### E2-a — O que falta no backend do Atlas · *repo `YACTHS-ATLAS-OFICIAL`*

Três buracos. Os dois primeiros impedem o colaborador de ver qualquer barco; o
terceiro torna a sessão de 7 dias impossível.

**1. O colaborador não enxerga a frota da Marina.**

`GET /api/v1/ativos` filtra por dono:

```python
if role != "admin":
    q = q.or_(f"usuario_id.eq.{user_id},proprietario_email.eq.{email}")
```

Os barcos têm `usuario_id` = a Marina. O colaborador entra com conta própria
(3.4), então `user_id` ≠ Marina e **a lista volta vazia**. Não há contorno pelo
lado do PWA.

Marcar o colaborador como `admin` faria ele ver a frota de **todas as Marinas**
do banco — está fora de questão.

**2. Não existe vínculo colaborador ↔ Marina.**

O `authz.py` já tolera `ativos.marina_id` e `profiles.marina_id`, mas **nenhuma
das duas colunas existe** no banco: `ativos` tem `usuario_id` e
`proprietario_email`; `profiles` tem `user_role` e nada de Marina. O código é
defensivo para um schema que nunca foi criado.

**3. Não existe endpoint de refresh.**

`POST /auth/login` devolve `refresh_token`, mas nenhuma rota o consome — no
Atlas quem renova é o `supabase-js` dentro do navegador. O access_token do
Supabase dura ~1 hora. **Sem uma rota de refresh, a sessão de 7 dias da 3.1 não
existe:** o colaborador seria devolvido ao login toda hora, que é exatamente o
atrito que a decisão queria evitar.

#### Como o colaborador vai existir — decisão de 10/09/2026

**Conta Supabase de verdade, com e-mail sintético montado a partir da
matrícula.** O colaborador nunca vê o endereço; na tela dele são matrícula e
senha.

A alternativa era uma tabela `colaboradores` própria, com o backend emitindo o
próprio token. Foi descartada: significa reimplementar hash de senha, emissão,
expiração, refresh e revogação — autenticação caseira ao lado de uma que já
funciona. O `get_current_user` também passaria a aceitar dois tipos de token, e
todo endpoint do Atlas herdaria esse risco.

Com conta real: o `created_by` vira uuid de verdade em `auth.users`, o rate
limit e a auditoria do `/auth/login` valem de graça, e o `security.py` não muda.

**Cuidado herdado:** o porteiro de inadimplência (`_barrar_se_devendo`) lê o
`user_metadata`. O colaborador não paga nada — quem paga é a Marina. Ele precisa
herdar o estado de acesso dela, ou vai ser barrado por uma dívida que não é dele.

**Pronto quando:** o colaborador entra com matrícula e senha, `GET /ativos`
devolve a frota da Marina dele — e só dela — e o token renova sem pedir senha.

---

### E3 — Captura do registro · FEITA 11/09/2026

**Como o recorte foi feito, e por que ele é o coração da entrega.** As 13 fichas
do Atlas somam 292 campos e 134 obrigatórios. Cada campo foi classificado pelo
critério da seção 2 (fica no barco só o que some se ninguém registrar na hora) e
depois **atacado por um verificador adversarial** com uma tarefa só: derrubar o
que conseguisse. Onde ele passou, cortou fundo:

| ficha | classificado | depois do cético |
|---|---|---|
| motor | 10 | **3** |
| manutenção | 23 | **13** |
| ida ao mar | 17 | **11** |
| seguro | 2 | **0** — apólice e vigência moram todas na gaveta |

**Nove das treze não chegaram a ser verificadas** (a sessão acabou no meio) e o
número delas está inflado — elétrica com 25, sinistros com 22. Estão marcadas
`verificado: false` em `src/fichas/recorte.json` e seguem no formulário curto:
usá-las como estão colocaria no píer justamente o formulário que este recorte
existe para evitar. **Rodar esses nove verificadores é trabalho pendente.**

- Campos vindos do `servicosCategorias.ts` do Atlas. Extração no **build**
  (esbuild → JSON), não cópia manual. As 13 fichas.
- **Só os campos do barco** — ver "Quem preenche o quê", seção 6. Os da gaveta
  ficam para a revisão, e o rascunho sobe incompleto de propósito.
- Fluxo da seção 6: barco → categoria → **fotos primeiro** → campos → confirmar.
- Câmera com `capture="environment"`, várias fotos, comprimidas no cliente,
  guardadas como **Blob**.
- Travas de evidência valendo offline: sem a foto obrigatória, não fecha.
- Horímetro obrigatório e em destaque.
- Rótulo 10px / valor 16px; alvo de toque 44px.

**Feito, com estas decisões de tela:** `select` virou botão (roleta de
`<select>` no celular exige mirar, rolar e confirmar — três gestos com a mão
suja para responder "sim"); campo com `showIf` só aparece quando o pai responde,
o que faz treze campos caberem no píer; horímetro e observação genéricos somem
quando a categoria traz os seus.

**Foto:** dois botões, e a tela lê o aparelho. `capture="environment"` só vale
em celular — no desktop o navegador ignora o atributo e os dois botões abriam a
mesma janela. Com toque e ponteiro grosso: câmera em primeiro, "já tenho a foto"
embaixo. No computador: um botão só, e uma linha dizendo que no celular ele abre
a câmera.

**Falta provar em modo avião, no celular de verdade.**

---

### E4 — Envio · FEITO 11/09/2026 (a fila automática ainda não)

**Não precisou de backend novo** — a descoberta que mudou o tamanho da entrega.
Os dois endpoints já existiam no Atlas: `POST /registros/rascunho` recebe o
texto num `dados` jsonb livre, e `POST /documentos/upload/{ativo}` recebe a foto
e calcula o hash.

**Provado em uso em 11/09/2026**, com o Marcos registrando de verdade:

```
registros_rascunho   YA-IATE-2022-A7F3 · manutencao
                     "Troca de mandueiras de arreficimento"
                     dados: troca_arrefecimento "Sim" · condicao "concluido"
                            origem "atlas-pre-data" · client_id · capturado_em
documentos           MOTOR-04.jfif · 51 KB · tipo "foto" · status verified
                     hash 79dcb332… (SHA-256 do servidor)
                     descricao "Atlas Pré-Data · Manutenção · e2e02363…"
```

O `client_id` na descrição da foto é o que amarra imagem e pré-dado, já que o
upload de documento não conhece rascunho.

**Quem fez vai junto, e são dois nomes:** `registrado_por` (quem estava com o
aparelho, vindo do `/auth/me`) e `executado_por` (quem meteu a mão). Na marina o
mecânico faz e às vezes outra pessoa lança — e para o escritório essas duas
respostas não são intercambiáveis.

**O que ainda falta desta entrega:** a fila automática. Hoje o envio é por toque
no botão; Background Sync, retentativa com espera crescente e subida sozinha ao
voltar o sinal continuam por fazer.

- IndexedDB com os pendentes: registro + Blobs das fotos.
- `client_id` (UUID do aparelho) em cada registro, para reenvio não duplicar.
- Envio: `POST /registros/rascunho` no backend do Atlas — **nunca** Supabase
  direto. Fotos pelo mesmo caminho de upload que o painel já usa.
- Background Sync onde houver; fallback ao reabrir o app.
- Estado visível por registro: `salvo no aparelho` × `enviando` × `enviado`.
- Retentativa com espera crescente; falha permanente não some da tela.

**Pronto quando:** três registros feitos offline sobem sozinhos ao voltar o
sinal; desligar o Wi-Fi no meio do envio e religar **não** cria duplicata.

---

### E5 — Aviso de duplicidade

- Ao escolher barco + categoria, consulta (só online): já existe rascunho ou
  registro selado desta categoria, neste barco, nesta data, com horímetro
  próximo?
- Aviso **não bloqueante** — dois motores no mesmo dia é legítimo.
- Marca o rascunho para o revisor.
- Offline: pula a checagem, sem travar. O backend refaz na chegada.

**Pronto quando:** o segundo registro igual avisa e deixa passar; o rascunho
chega marcado.

---

### E6 — Painel de revisão · *no repo do Atlas* · **É O QUE FALTA AGORA**

**Sem ela, metade do sistema não existe.** O pré-dado chega incompleto DE
PROPÓSITO, contando que o escritório complete — mas a tela onde ele completa
ainda não foi feita. Hoje o dado cai em `registros_rascunho` e fica invisível:
ninguém no painel vê, ninguém completa, ninguém sela.

O recorte da E3 só se justifica depois que esta aba existir. Enquanto não
existir, o que a Marina tem é um app que engole informação.

Esta aba é também onde os ~30 campos da gaveta aparecem para preencher: valor,
nota fiscal, CNPJ do prestador, part number, marca e viscosidade do óleo. Quem
tem o papel na mão é quem os preenche.

- Lista de rascunhos pendentes, mais antigos primeiro, com destaque para os
  marcados como possível duplicata.
- Todos os campos e as fotos.
- **Aprovar** → chama o `selar` que já existe.
- **Devolver** com motivo → volta para o funcionário.
- **Descartar** → apaga o rascunho.

**Única alteração de schema do projeto inteiro:** campo de motivo em
`registros_rascunho`, para o "devolver". Migration no repo do Atlas.

**Pronto quando:** aprovar no painel faz o registro virar append-only em
`registros`, e o funcionário vê a devolução no celular.

---

### Onde cada coisa mora

| Entrega | Repo | Observação |
|---|---|---|
| E0 | — | decisão, não código |
| E1, E2-b, E3, E4, E5 | **Facilitador** | este repo |
| **E2-a** | **YACTHS-ATLAS-OFICIAL** | vínculo colaborador, login por matrícula, refresh |
| E6 + migration do "devolver" | **YACTHS-ATLAS-OFICIAL** | painel de revisão |

Nada daqui entra lá, e nada de lá entra aqui. Para E2-a e E6, abrir sessão em
`C:\YACTHS-ATLAS-OFICIAL` e tratar como tarefa daquele repo.

**Correção:** este PRD dizia que a migration do "devolver" (E6) era a única
alteração de schema do projeto. Não é — a da E2-a vem antes e é maior.

### O que não fazer em nenhuma entrega

- Escrever direto no Supabase pelo navegador. Tudo passa pelo backend.
- Inserir em `registros`. O app só cria **rascunho**; quem sela é o painel.
- Copiar campo de ficha à mão.
- Afrouxar trava de evidência para "facilitar".
- Importar Playfair Display ou Outfit.
- Encolher a base tipográfica em telas pequenas como o app principal faz.

---

## 12.1 A foto subia como conferida — 12/09/2026

Teste do fundador no Android: enviou o serviço com fotos e disse *"as imagens não
foram"*. Metade disso era verdade, e a outra metade era pior.

**O que realmente acontecia com a foto que SUBIU:** ela ia sem
`pendente_revisao=true`, então o Atlas a gravava como `status: verified` —
documento conferido. Duas consequências: a aba Pré-Data, que lista só o que está
**pendente**, não mostrava a foto (daí "não foram"); e o dossiê passava a
incluí-la sem ninguém ter olhado, que é exatamente o que o conserto do dia
anterior no Atlas (`bc19cec`) existia para impedir. O parâmetro estava pronto no
backend, com a docstring dizendo "existe para o Atlas Pré-Data", e este app nunca
o enviou: **a trava estava instalada e desligada**.

O conserto é uma linha em `enviarFoto` (`src/nucleo/api.ts`): o upload passa a
mandar `pendente_revisao=true` sempre. Não há caso em que foto de píer deva
entrar conferida — quem confere é o escritório, depois.

**O que ficou em aberto, e é outro defeito:** no envio das 20:39 (embarcação
`YA-IATE-2015-3A38`, "troca do mouse"), o rascunho chegou declarando
`fotos_no_aparelho: 1` e **nenhuma foto chegou**. Os logs do Supabase mostram
`POST registros_rascunho 201` e nada depois — nenhuma chamada de upload atingiu o
backend. Como `fotos_no_aparelho` vem de `fotos.length`, havia uma foto na loja
do IndexedDB e o laço deveria tê-la enviado; a requisição morreu antes de sair do
aparelho. No teste da manhã o padrão foi o mesmo em escala: 5 fotos na loja, **1**
enviada, três tentativas seguidas subindo sempre a mesma primeira foto. Falta o
que o app mostrou na tela para fechar a causa.

**Dois efeitos colaterais já visíveis no banco**, que saem junto quando isso for
consertado: o retry cria rascunho novo a cada tentativa (3 duplicados hoje), e a
foto enviada com sucesso nunca é marcada — `f.enviada` é lido em `envio.ts` e
**não é escrito em lugar nenhum do código**, então toda tentativa reenvia tudo.

## 13. Histórico

- **10/09/2026** — v3. O usuário deixa de ser "o funcionário" genérico e vira o
  **colaborador de chão**. Fixa a definição do produto (**ponte** do chão para o
  escritório) e o nome (**Atlas Pré-Data**). Fecha 3.1, 3.2 e 3.4. Divide a ficha
  entre o barco e a gaveta. Descobre que o offline é a borda do wi-fi da marina,
  não o alto-mar — e corta o mar do escopo.
- **10/09/2026** — v2. Reescrita sobre o sistema real depois de levantamento no
  código e no banco. Corrige: stack (não é Next.js), staging (usa
  `registros_rascunho`, não tabela nova), objeto de trabalho (serviço, não
  cadastro de barco), duplicidade (mesmo serviço, não mesmo barco), identidade
  (PIN quebra o valor probatório) e status (dois eixos). Acrescenta sessão
  offline, inadimplência offline, byte-da-prova, horímetro, travas de evidência
  e idempotência de fila.
- **v1** — especificação inicial, recebida em PDF.
