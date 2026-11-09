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

## O que ele é, em uma frase

> **O Atlas Pré-Data é a ponte do chão da Marina para o escritório. Só isso.**

Frase do Marcos, 10/09/2026, depois de duas horas de conversa em que a ideia
inchou três vezes. É **critério de corte**, não slogan: ponte não sela, não
analisa, não vira relatório. Se algo não ajuda a travessia do píer até a mesa de
quem revisa, está fora.

O nome do app é **Atlas Pré-Data**, batizado em 11/09/2026. Antes disso foram
sete tentativas — Campo, Pátio, Oficina, Operações, Dock, Garage, Service.

O critério que derrubou os seis primeiros: **nome de lugar exclui lugares**. O
serviço acontece no berço com o barco na água, no pátio no seco, na oficina e no
galpão; quem está no píer olha um ícone "Oficina" e pensa que não é para ele.

O que "Pré-Data" acrescenta e os outros não tinham: ele nomeia **o que o app
produz**, não o que se faz nem onde. O que sai daqui é pré-dado — matéria-prima
crua que o escritório trata e sela. É a mesma ideia da ponte, agora no nome.

CUIDADO: cada renome trocou o nome do IndexedDB e da chave de sessão, e as duas
primeiras vezes apagaram o aparelho de quem já usava, sem erro na tela. Existe
migração em `db.ts` (BANCOS_ANTIGOS) e em `sessao.ts` (CHAVES_ANTIGAS). Se houver
um oitavo nome, acrescente o antigo nas duas listas ANTES de commitar.

---

## O que mudou em 09/11/2026

**A segunda tentativa de envio deixou de duplicar** (PRD 12.4). Duas causas: a
foto entregue nunca era marcada, e a tela gravava um rascunho de antes do envio
por cima do guardado, apagando o id do Atlas. A mensagem de sem sinal parou de
prometer "sobe sozinho" — a fila automática segue por fazer.

**A lição:** estado do React é cópia, e cópia envelhece. Campo que só o envio
escreve (`remotoId`, `enviadoEm`) não pode depender de a tela estar em dia — por
isso `salvarRascunho` o preserva, em vez de confiar em quem chama.

---

## Estado em 11/09/2026

**E1, E2-b, E3 e E4 feitas — e a E4 foi provada em uso**, com o Marcos
registrando um serviço de verdade no Aurora Austral e o pré-dado chegando ao
banco com a foto amarrada pelo `client_id`. As quatro decisões da seção 3 do PRD
estão fechadas.

**A 3.3 se resolveu olhando o código, não debatendo:** o
`POST /documentos/upload` do Atlas calcula o SHA-256 no servidor, sobre os bytes
recebidos. Logo, a prova é o byte que sobe — e a foto sobe sem compressão, o que
faz a prova ser o que a câmera produziu.

**A E4 não precisou de backend novo.** Os dois endpoints já existiam. Essa
descoberta encurtou a entrega em dias, e veio de ler o código do Atlas antes de
propor qualquer coisa — vale repetir o hábito.

**O QUE FALTA E É CRÍTICO: a aba de revisão no painel (E6).** O pré-dado chega
incompleto de propósito, contando que o escritório complete — mas a tela onde
ele completa não existe. Hoje o dado cai em `registros_rascunho` e fica
invisível. Enquanto a aba não existir, a Marina tem um app que engole
informação, e o recorte da E3 não se justifica.

**Pendência da E3:** nove das treze categorias não passaram pelo verificador
adversarial e estão infladas (elétrica 25 campos, sinistros 22). Marcadas
`verificado: false` no `recorte.json`, seguem no formulário curto.

**Pendência da E4:** a fila automática. O envio hoje é por toque; Background
Sync e retentativa continuam por fazer.

---

## O que o uso real revelou em 11/09/2026

Quatro defeitos que nenhuma revisão de código tinha pegado, todos encontrados
com o Marcos usando o app:

**Sair apagava tudo em silêncio.** O botão é um ícone no canto onde o polegar
passa, não perguntava nada, e `encerrarSessao` limpa frota E rascunhos — um
toque errado custava a manhã de quem estava no píer. Agora pergunta e conta
quantos registros morreriam.

**A tela não retomava o registro aberto.** O rascunho é gravado a cada tecla,
mas a tela vivia só na memória: celular bloqueou ou a página recarregou, e o
colaborador voltava à escolha de categoria achando que perdeu tudo, com o texto
inteiro guardado e invisível.

**Token vencido deixava o app de pé com sessão morta.** Toda chamada voltava
401, a frota aparecia vazia, e a pessoa lia "nenhum ativo no aparelho" sem pista
do motivo. Agora cai no login explicando — e o aviso sobrevive ao F5.

**Os dois botões de foto faziam a mesma coisa no desktop.** `capture` só vale em
celular; no Windows o navegador ignora o atributo. Não era bug de código: a tela
prometia o que o aparelho não tem.

A lição das quatro: **nenhuma aparece em teste automatizado nem em leitura de
código.** Aparecem quando alguém usa. Priorize colocar na mão do Marcos cedo.

---

## Estado em 10/09/2026 (histórico)

**E1 feita** — esqueleto do PWA instalável, e o visual das três telas de pé com
dados de exemplo. Vite 5 + React 18 + TypeScript nas mesmas versões do Atlas,
Tailwind com o tema **medido**, service worker gerado (16 arquivos de shell em
precache) e manifest com os ícones tirados do `favicon-v2.png` do Atlas — que,
apesar do nome, é um **JPEG por dentro** (assinatura ffd8).

Servidor de desenvolvimento na **porta 6002**, pedido do Marcos.

Conferido no navegador com `getComputedStyle`, não lido do CSS: fundo
`rgb(1,12,32)`, Inter no corpo, serifada do sistema nos títulos, botão ouro de
10px com tracking 3px e raio 2px, campo em 16px. Alvos de toque em 51px e 54px,
acima dos 48 exigidos. Sem rolagem horizontal em 375px nem em 1024px.

**O que ainda não foi provado:** o registro do service worker de produção falha
dentro do navegador embutido do Claude Code com erro genérico, embora o script
seja servido com status 200 e content-type certo — e o service worker de
desenvolvimento registre e ative normalmente no mesmo ambiente. O teste que
vale é o do PRD: instalar na tela de início e abrir em modo avião, no celular.

A frota passou por dois estágios no mesmo dia: primeiro os dois ativos reais da
conta do Marcos copiados à mão (Aurora Austral, Sunseeker Predator 74; e o
YA-IATE-2015-3A38, Marlin Sea Focus, sem nome registrado), depois o download de
verdade na E2-b. **A cópia à mão saiu do código** — quem manda agora é o
`GET /ativos`.

**Marina Axos Hub não existe como Marina no banco** — AXOS HUB é a empresa, e a
conta que tem esses barcos chama-se "Yachts Atlas". O nome na tela é o que o
Marcos pediu ver; o cadastro é outra coisa.

**As fichas ja saem do Atlas sozinhas.** `npm run fichas` compila o
`servicosCategorias.ts` do app principal com esbuild e grava
`src/fichas/servicos.json`: **13 fichas, 292 campos (134 obrigatorios), 56
slots de evidencia com 26 travas**. E o primeiro pedaco da E3, e existe para
que campo nunca seja copiado a mao — app, painel e papel divergiriam com o
tempo. O caminho do Atlas pode vir em ATLAS_DIR.

**E2-b feita.** O app fala com o backend do Atlas de verdade: `src/nucleo/api.ts`
(cliente do `/api/v1`, com prazo em toda chamada), `src/nucleo/db.ts` (IndexedDB
sem biblioteca), sessão com token real e frota baixada do `GET /ativos` e
guardada no aparelho. Os barcos copiados à mão saíram. Proxy do `/api` para a
8080 no `vite.config.ts`.

Testado no navegador a 375px: credencial errada devolve "Matrícula ou senha
incorreta", o botão volta ao normal e os campos liberam. Fundo `rgb(1,12,32)`,
serifada do sistema, campo em 16px, raio 2px, botão de 51px, sem rolagem
lateral. **O caminho de sucesso do login não foi testado** — o assistente não
digita senha, então isso é teste do Marcos.

**A E2 não coube só neste repo, e isso foi a descoberta do dia.** Ver PRD, seção
E2-a: `GET /ativos` filtra por dono do barco, então colaborador com conta
própria recebe lista vazia; não existe vínculo colaborador↔Marina no banco (o
`authz.py` espera `profiles.marina_id`, que nunca foi criada); e não há rota de
refresh — o `/auth/login` devolve `refresh_token` e ninguém o consome, porque no
Atlas quem renova é o `supabase-js`, que este app não carrega.

**Dívida assumida:** sem a rota de refresh, o token vence em ~1h e derruba para
o login. Os 7 dias da 3.1 só valem de fato depois da E2-a. A frota fica guardada,
então voltar custa a senha, não o download.

**Enquanto a E2-a não existe**, o campo de matrícula também aceita e-mail (basta
conter "@") — é assim que dá para testar o caminho inteiro hoje, entrando com a
conta da própria Marina.

A v1 da especificação chegou em PDF e foi reescrita como `PRD.md` depois de
levantamento no código real.

Das quatro decisões que travam o início (seção 3 do PRD), **três fecharam** em
10/09/2026: sessão offline, inadimplência offline e quem é o funcionário.
**Falta a 3.3** — se o SHA-256 é do arquivo original da câmera ou do comprimido
que sobe. Ela não bloqueia E1 nem E2; só aparece na E3, quando a foto entra.

---

## Duas armadilhas de ferramenta, não de código

Custaram uma rodada inteira de "nada mudou" e "isso não é mobile" em
10/09/2026. Nenhuma das duas é defeito do app.

**1. O service worker em desenvolvimento servia a versão antiga.** Com
`devOptions.enabled: true` no `vite.config.ts`, o vite-plugin-pwa registra um
service worker em desenvolvimento que guarda o shell em cache. Resultado: a
alteração entra no código, o build passa, a medição do arquivo confirma — e a
tela continua mostrando a versão de antes. Ficou **desligado de propósito**.

O teste de offline que vale é o do build de produção (`npm run build` +
`vite preview`), nunca o de desenvolvimento. Ligue `devOptions` de volta só
para mexer no próprio service worker — e lembre que desligar não remove o que
já está instalado no navegador: é preciso desregistrar e limpar os caches.

**2. Emular o celular do lado do assistente não encolhe a janela do Marcos.**
O `resize_window` do navegador embutido muda o viewport que o assistente mede
e captura; a janela dele continua em ~950px. Ele via desktop enquanto o
assistente via 375px, e os dois insistindo que estavam certos.

A saída foi `public/telas.html`: uma página de conferência que embute o app em
um iframe do tamanho real do aparelho — celular em pé, tablet em pé, tablet
deitado — e encolhe só quando não cabe, dizendo em quantos por cento está
exibindo. Ferramenta de conferência, **não faz parte do app**: mora em
`public/` e não entra em rota nenhuma.

---

## Quem é o usuário de verdade

Não é "o funcionário". É o **colaborador de chão**: o cara com graxa na mão, sol
na cara, celular molhado de maresia, segurando o aparelho com uma mão porque a
outra segura a peça. Não é a secretária, não é o escritório.

O Marcos corrigiu isso na conversa de 10/09/2026, e a correção derrubou uma
premissa inteira: **a ficha de 43 campos é formulário de escritório.** Ninguém
preenche aquilo em pé. Quem tenta ou abandona o app, ou preenche mentindo — que
é pior, porque entra dado falso no dossiê com aparência de verdadeiro.

Daí a divisão por **quem tem a informação** (PRD, seção 6): o barco fica com o
que só existe lá e some se ninguém capturar na hora (fotos, horímetro, qual
barco, quem, quando); a gaveta fica com o que nunca esteve no píer (valor, nota
fiscal, OS, código da peça).

**A trava de evidência não caiu — mudou de mão.** Nota fiscal continua
obrigatória para selar, só que a cobrança é de quem sela. Isso não é
afrouxamento: é parar de exigir de alguém um dado que ele não tem.

---

## A decisão do login foi e voltou — e o motivo importa

Em 10/09/2026 a 3.4 foi decidida três vezes:

1. **Login de verdade** (primeira resposta do Marcos).
2. **Sem login**, aparelho vinculado à Marina e nome escolhido numa lista —
   proposta do CLAUDE, com o argumento de que **a assinatura que vale é a de
   quem sela**: como nada entra selado, o valor probatório vem da revisão, não
   do login de quem capturou.
3. **Login de verdade outra vez**, com o Marcos puxando de volta.

O argumento do item 2 **continua correto** — e é por isso que ele quase passou.
Só que resolve apenas o lado jurídico. O que ele não resolve é a **segunda-feira
de manhã**: sem login o aparelho vira chave mestra, qualquer um registra como
qualquer um, e quando chega um horímetro impossível no escritório não há com
quem conversar — há só um nome que alguém tocou numa tela.

**Responsabilidade não é só para a seguradora.** É para a conversa difícil.

O PIN da v1 segue condenado, e a lista de nomes cai junto: os dois identificam
por honra.

E o jeito de ter login sem matar o app: **o atrito não é existir senha, é
digitar senha com a mão suja, em pé, toda vez.** Login uma vez, sessão de 7
dias, app sempre aberto — o modelo do WhatsApp, que tem login e ninguém lembra
de ter feito.

**A matrícula resolveu o login.** O pessoal do chão não tem e-mail, mas todo
mundo sabe a própria matrícula — então a tela pede matrícula e senha, e o
endereço que o Supabase exige é montado por baixo, invisível.

**E uma tela de "código da Marina" foi tentada e cortada no mesmo dia.** A
matrícula repete entre Marinas, então o aparelho precisa mesmo saber de qual
ele é — mas resolver isso com uma tela na frente do login põe um passo a mais
no caminho de quem só quer registrar um serviço, e o Marcos esbarrou nela no
primeiro teste. O vínculo volta na E2, pelo cadastro. Vale como regra:
**o Atlas Pré-Data é ponte, e ponte não cobra pedágio na entrada.**

**E o cabeçalho do fichário vem preenchido** — quem fez, matrícula, dia, hora,
barco. Nada disso é digitado: o app já sabe, e é justamente o que ninguém
consegue reconstituir depois. Ele só confere. Ver seção 6 do PRD.

Ainda em aberto: **o aparelho é da pessoa ou da Marina.** Se for compartilhado,
sessão longa não basta sozinha — o dia inteiro sairia no nome de quem entrou de
manhã.

---

## O offline é a borda do wi-fi, não o alto-mar

Descoberta do Marcos, 10/09/2026, e ela reduziu o problema pela metade: **a
marina tem wi-fi, ele só não alcança o fim do píer.**

Então o cenário real não é "três dias no mar". É sair do sinal, trabalhar
quarenta minutos no barco e voltar para a área coberta — o aparelho sincroniza
sozinho, no bolso, sem ninguém apertar nada. Minutos, não dias. Os 7 dias de
sessão são folga, não rotina.

**A armadilha é o wi-fi, não a falta dele.** Sinal fraco é pior que sinal
nenhum: na borda do alcance o celular fica agarrado a uma barra teimosa e não
troca para o 4G. A requisição não volta nem dá erro, e o app trava com a
bolinha girando enquanto o cara segura a peça. **É o momento exato em que ele
desiste do app.** Por isso a regra: nunca esperar pela rede — poucos segundos
sem resposta e vai para a fila, sem alarde, sem tela de erro.

**Custo assumido do offline:** desligar alguém no painel não alcança um aparelho
sem rede. O corte só vale quando ele tenta sincronizar. Com wi-fi na marina a
janela é de horas.

---

## O mar foi cortado de propósito

Chegou a existir um "modo mar" na conversa de 10/09/2026 — uma foto e uma
observação ditada em áudio, para registro em navegação. Durou dez minutos: o
Marcos cortou, e estava certo.

O motivo de estar no PRD como fora de escopo, e não simplesmente esquecido:
**dois modos de uso dobram o app para atender a exceção, e o modo mais fácil
vira o incompleto.** Em três meses ninguém faria mais registro completo — todo
mundo mandaria bilhete. A exceção comeria a regra.

Volta a ser conversa quando as Marinas estiverem usando o app todo dia e
pedirem.

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

## Como os dados de cada Marina não se misturam

Conferido no banco em 10/09/2026, porque a pergunta é natural e a resposta some
do lugar onde é óbvia.

Não existe pasta por Marina. **Existe um carimbo em cada linha: `usuario_id`**,
presente e obrigatório em `ativos`, `registros` e `registros_rascunho`. Cada
barco pertence a uma Marina, e cada registro aponta para um barco — então o
registro já nasce carimbado, ninguém precisa marcar à mão.

E **nada é procurado por nome**. Duas marinas podem ter um barco chamado "Maria
Bonita"; o sistema trabalha com o `id`, que é único. Nome é só para humano ler.

Três muros, e o terceiro é mais fraco do que parece:

1. **No celular** — conveniência, não segurança. Ele só baixou o que é dele.
2. **No backend (`authz.py`)** — **este é o muro que vale** para tudo que vem do
   app.
3. **No banco (RLS)** — a política literal é `usuario_id = auth.uid()`, ligada
   nas quatro tabelas. **Mas o backend conecta com `service_role`**
   (`core/supabase.py`), e essa chave passa por cima do RLS por natureza. O RLS
   protege o caminho do navegador direto, não o caminho do backend.

É exatamente por isso que existe a regra **uma porta só**: com uma porta, a
regra vive num lugar só e dá para auditar. Com duas, um dia elas discordam.

**Achado de brinde:** `registros` tem política de INSERT e SELECT e **nenhuma de
UPDATE ou DELETE** — a imutabilidade não é promessa de documento, está gravada
no banco. `registros_rascunho` tem as quatro. "Rascunho é livre, selo é eterno"
é literal.

E as tabelas já separam `usuario_id` (o dono — a Marina) de `created_by` (quem
fez). A estrutura para a 3.4 já existe, sem migration.

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

---

## Deploy

**Domínio: `pre-data.yachtsatlas.online`** (EasyPanel, projeto `bbbb`, serviço
`atlas-pre`). Decidido em 12/09/2026.

O repo nasceu **sem Dockerfile** e o primeiro deploy falhou com
`failed to read dockerfile`. O Dockerfile e o `nginx.conf` entraram em
12/09/2026: build do Vite e nginx servindo o estático.

**O EasyPanel precisa de uma variável: `ATLAS_API`**, apontando para o backend
do Atlas. Aceita o nome interno do serviço (`http://nome-do-servico:8080`) ou a
URL pública (`https://yachtsatlas.online`) — o `nginx.conf` manda `Host` do
destino e liga SNI, então serve para as duas.

**O primeiro contêiner subiu e morreu em loop:** `host not found in upstream
"atlas-backend"`. Com o endereço escrito direto no `proxy_pass`, o nginx resolve
o DNS **na subida** e recusa iniciar se não encontrar — um PWA offline-first que
não abre porque a API sumiu é o oposto do que ele promete. Agora o endereço passa
por uma variável (`set $atlas`), o que adia a resolução para cada requisição: o
app sobe, serve o shell, e só as chamadas de API falham enquanto o backend
estiver fora. O `resolver` vem do `${NGINX_LOCAL_RESOLVERS}` que o próprio
entrypoint da imagem define — sem chumbar `127.0.0.11`, que só vale em rede
Docker padrão.

Três coisas do `nginx.conf` que parecem detalhe e não são:

- **`/sw.js` e `/index.html` com `no-cache`.** É o service worker que decide o
  que o app mostra offline; servido com cache, o navegador segue usando o shell
  antigo por dias e a correção não chega ao píer. É a mesma armadilha que
  custou uma rodada de "nada mudou" em desenvolvimento.
- **`client_max_body_size 25m` e timeouts de 120s.** O padrão do nginx é 1 MB —
  foto de celular tem 2-5 MB e falharia com 413 justamente nas fotos grandes,
  que são as tiradas de perto. E wi-fi de marina é lento: sem o prazo maior o
  nginx corta o upload no meio e o colaborador lê "erro ao enviar".
- **`/api` por proxy, e não URL no bundle.** Mantém app e backend na mesma
  origem para o navegador: sem CORS, e sem o endereço do servidor escrito no
  código que roda no celular de terceiros.

`public/telas.html` responde 404 em produção — é ferramenta de conferência.

**Não foi possível provar o build:** Docker não está instalado na máquina do
Marcos. O `npm run build` passa; o empacotamento só é validado no EasyPanel.
