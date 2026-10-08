# Coffy ($COFFY) — Pre-mortem & Wallet Autopsy

Contexto completo do projeto. Leia tudo antes de mexer na arquitetura. O site já existe e está no ar (https://coffy-ashen.vercel.app); este arquivo descreve a **v2**, que adiciona o Pré-mortem.

## O que é

Memecoin "tech" na Solana, lançada na pump.fun. Meta: ~30k de market cap e completar o bonding curve. O marketing é só pelo X, então **o próprio produto precisa gerar divulgação orgânica e uso recorrente**.

A coin é sobre a **tech**. O mascote Coffy (um caixão cartoon) é o "agente" que executa a tech na tela.

**Problema da v1:** a autópsia de wallet é usada uma vez só (a pessoa vê o card, posta e não volta). A v2 adiciona o **Pré-mortem**, uma ferramenta de uso diário: antes de comprar um token, o trader cola o CA e o Coffy diz se a coin "já nasceu morta".

**Pitch novo (hero):** "Paste a token or a wallet. Coffy tells you if it's already dead."

O site é em **inglês** (o público da pump.fun é gringo). Mantenha o idioma do site.

## Produto

### 1. Input único com detecção automática

A página tem **um campo só**. O backend descobre o tipo do endereço:

- `getAccountInfo` (jsonParsed): se o owner for o Token Program ou o Token-2022 e `parsed.type === "mint"`, é um **token** e vai pro Pré-mortem;
- qualquer outro caso é tratado como **wallet** e vai pra Autópsia.

Rota: `/api/inspect?address=...` retorna `{ kind: "token" | "wallet" }`. O front então chama a rota certa e navega pra página de resultado. Endereço inválido (não é base58 de 32 bytes) leva a um erro amigável antes de chamar qualquer API.

Abaixo do campo ficam dois chips de exemplo, "Try a token" e "Try a wallet", com endereços públicos pré-preenchidos.

### 2. Pré-mortem (token) — feature principal da v2

Rota: `/api/premortem?mint=...`. Página compartilhável: `/premortem/[mint]`, com OG image.

O que calcula (os números vêm **sempre** do código):

**a) Dev body count** (a métrica estrela)
- Descobrir o dev: é o fee payer da **primeira transação** do mint (a criação). Use o `getTransactionsForAddress` da Helius em ordem ascendente, limit 1 (confira na doc atual os parâmetros de ordenação e o custo em créditos). Se não der, use as Enhanced Transactions filtrando a criação.
- Listar os tokens que esse dev já criou: as transações do dev que são criação de token na pump.fun. Confira na doc da Helius o `type` parseado da criação da pump.fun e filtre por ele. Limite às últimas 100 criações.
- Status de cada token criado, via DexScreener API (grátis, sem chave: `https://api.dexscreener.com/tokens/v1/solana/{até 30 mints separados por vírgula}`; confira na doc atual). Regras (em `lib/premortem/rules.ts`, fáceis de ajustar):
  - `dead`: market cap < $5k, ou sem par no DexScreener e criado há mais de 24h;
  - `alive`: o resto.
  - `bonded`: o par migrou pra fora da pump.fun (dexId diferente de pumpfun). Ele conta à parte, como "survivors".
- Saída: `{ dev, launched, dead, alive, bonded, bodyCountPct }`.

**b) Holders**
- `getTokenLargestAccounts` (top 20) + `getTokenSupply`.
- Resolver o owner de cada token account (jsonParsed) e **excluir/rotular** o bonding curve da pump.fun e as contas de pool/LP. Se não excluir, o top 1 sempre parece "whale".
- Saída: `top10Pct` (sem curve/LP), `devHoldingPct` (saldo do dev no mint) e a lista dos top holders com rótulos.

**c) Autoridades**
- Do mint parseado: `mintAuthority` e `freezeAuthority` (null = revogada). Tokens da pump.fun normalmente já vêm revogados, mas mostre mesmo assim, com um check verde.

**d) Veredito**
- Score de 0 a 100 calculado em `lib/premortem/score.ts`, com pesos simples e documentados:
  - body count alto do dev pesa mais;
  - dev segurando muito;
  - top10 concentrado;
  - authority ativa.
- Três faixas:
  - `ALIVE` (Coffy piscando);
  - `IN THE ICU` (Coffy chorando);
  - `ALREADY IN THE COFFIN` (Coffy desmaiado ou cavando).
- Linha de diagnóstico: uma frase curta e debochada. Gere com o LLM (Haiku) a partir do JSON das métricas, com fallback pra templates fixos por faixa se o LLM falhar ou demorar mais de 3s. O pré-mortem precisa ser rápido.

**Disclaimer fixo** no resultado e no card: "Not financial advice. Coffy reads on-chain data, he doesn't predict the future." O veredito é um indicador de risco, não uma garantia. Não usar linguagem de certeza tipo "this is a rug".

### 3. Autópsia de wallet (já existe na v1)

Mantenha como está. Só ajuste o necessário pra entrar no input único e no layout novo. Rota: `/api/autopsy?wallet=...`. Página: `/autopsy/[wallet]`.

### 4. Bundle detection — NÃO fazer agora

É o sinal mais pedido pelos traders, mas é difícil de fazer direito. **Não implementar e não anunciar no site** nesta versão. Fica no roadmap interno (este arquivo), não no site.

### 5. Obituários automáticos no X — fase 3, opcional

Só depois do Pré-mortem estar estável. Um cron (Vercel Cron) pega os tokens que estavam em trending e caíram mais de 90%, e posta um "obituário" no X pela conta do Coffy, com o veredito e o body count do dev. Usa a X API pay-per-use (~US$0,015 por post sem link; post com link custa ~US$0,20, então evite link no post). **Não anunciar no site até estar rodando.**

## Stack

- Next.js (App Router) + TypeScript na Vercel (o deploy já está configurado via GitHub).
- **Helius** (free: 1M créditos/mês, 10 req/s). Chamadas de histórico custam mais créditos, então:
  - centralize todas as chamadas em `lib/helius.ts`, com retry/backoff em 429;
  - concorrência limitada (no máximo ~5 em paralelo);
  - limite o histórico (últimas 100 criações do dev; últimas N swaps na autópsia).
- **DexScreener** pro status/market cap dos tokens do dev, em lotes de 30.
- **Cache** com Upstash Redis (integração da Vercel Marketplace; o Vercel KV antigo foi migrado pra lá, confira a doc atual). TTLs:
  - body count por dev: 15 min;
  - pré-mortem por mint: 3 min (os dados mudam rápido; mostrar "checked X min ago");
  - autópsia por wallet: 30 min;
  - inspect por endereço: 24h.
- **Rate limit** por IP com `@upstash/ratelimit` (ex.: 10 req/min no pré-mortem, 5 req/min na autópsia).
- **Erro amigável** quando a Helius limitar: "Coffy is digging too many graves right now, try again in a minute", com o Coffy cavando.
- **LLM**: Anthropic, modelo da família Haiku (confira o id atual na doc), com timeout curto e fallback de template.
- **Cards**: `next/og` (ImageResponse), 1200x630 pra OG; versão 1080x1080 pra download.

### Variáveis de ambiente

```
HELIUS_API_KEY=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Ficam em `.env.local` (no `.gitignore`) e nas Environment Variables da Vercel. Nunca no código.

## Estrutura do site (v2)

1. **Hero**: Coffy, o pitch novo, o input único, os chips de exemplo e "Read-only, no wallet connect".
2. **Loading**: o Coffy cavando, com mensagens que mudam conforme o tipo:
   - token: "Checking the dev's graveyard…", "Counting the bodies…";
   - wallet: "Opening the coffin…".
3. **Resultado do Pré-mortem** (`/premortem/[mint]`):
   - carimbo grande do veredito (ALIVE / IN THE ICU / ALREADY IN THE COFFIN) e o Coffy com a expressão da faixa;
   - **Dev body count** em destaque: "This dev buried 14 of 17 coins", com uma fileira de mini lápides (uma por token morto) e mini caixões abertos (vivos);
   - holders (top10 %, dev %) e autoridades com checks;
   - a linha de diagnóstico;
   - botões "Post on X" (intent link, sem API), "Download card" e "Check another".
4. **Resultado da Autópsia** (`/autopsy/[wallet]`): como na v1.
5. **How it works**, atualizado pra 3 passos:
   - "Paste a token or wallet";
   - "Coffy digs through the chain";
   - "Get the verdict (and the tombstone)".
6. **$COFFY**: igual ao atual (CA "soon", links "soon").
7. **Footer**: igual ao atual, mais o disclaimer.

Mobile primeiro.

## Cards

**Card do Pré-mortem** (novo), no formato "prontuário de necrotério":
- carimbo torto do veredito em laranja;
- o CA encurtado (ex.: `7xKp…9fQa`) e o ticker/nome do token;
- **body count do dev** em número gigante ("14/17 BURIED");
- top10 % e dev %;
- a linha de diagnóstico;
- o Coffy com a expressão da faixa;
- rodapé com a marca e a URL.

Precisa ser legível em miniatura na timeline do X.

**Card da Autópsia**: a lápide da v1, sem mudanças.

**Texto do intent no X**, pré-preenchido:
- pré-mortem: `Coffy checked $TICKER: {VERDICT}. Dev buried {dead}/{launched} coins. 🪦` + o URL da página;
- autópsia: como na v1.

## Identidade visual (sem mudanças)

**Estética:** cartoon mortuário/Halloween. Fofo e engraçado, nunca sombrio. Traço grosso escuro, cores chapadas.

**Mascote:** Coffy, um caixão de madeira com rosto, perninhas e uma pá. A referência está em `coffy-mascote-ref.svg`. A arte final é um asset trocável em `/public/art/*.png` (a pasta mudou de nome pra invalidar o cache das versões antigas). Expressões: default, cavando, chorando, piscando, rindo e desmaiado.

**Paleta:**

| Uso | Hex |
|---|---|
| Fundo noite | `#241733` |
| Painel | `#3a2752` |
| Contorno | `#120b1a` |
| Texto osso | `#f3ead6` |
| Laranja (acento principal; veredito COFFIN) | `#f28c28` |
| Verde-gosma (acento secundário; veredito ALIVE e checks ok) | `#9be564` |
| Madeira | `#8a5a3c` / `#a06c48` / `#d9a877` |
| Lápide | `#9aa0b4` / `#b2b8ca` / `#5d6378` |

O veredito ICU usa um amarelo/âmbar dentro da paleta (ex.: `#ffd34d`). As cores dos vereditos também diferem em claridade, não só em matiz.

**Fontes:** Fredoka (títulos e números) e Space Mono (laudo, labels e carimbos).

## Regras de produto

- Só leitura: sem conexão de wallet, sem fees, sem tesouraria.
- O site só anuncia o que funciona. Nada de recurso fake. Bundle e obituários não aparecem no site até existirem.
- O veredito é risco, não certeza. O disclaimer é sempre visível.

## Estilo de código

- **Comentários sem acentuação e em letras minúsculas**, sempre (ex.: `// conta tokens mortos do dev`).
- Entregar exatamente o que foi pedido, sem features extras.
- O Lucas se comunica de forma curta: inferir o contexto e ajustar sem muita ida e volta.

## Ordem de implementação

1. `lib/helius.ts`: centralizar chamadas, retry e concorrência. Configurar o Upstash (cache e rate limit).
2. `/api/inspect` e o input único no hero (a autópsia continua funcionando).
3. `/api/premortem`: autoridades, depois holders (com exclusão de curve/LP), depois o dev body count.
4. Score e veredito, mais a linha do LLM com fallback.
5. A página `/premortem/[mint]` e o card OG.
6. Atualizar o How it works e o footer com o disclaimer.
7. Testar com tokens reais (um que bondou, um morto, um recém-lançado) e com o pico simulado (cache e rate limit).
8. (Fase 3, depois) Obituários automáticos no X.
