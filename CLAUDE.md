# Coffy ($COFFY) — Wallet Autopsy by Coffy

Contexto completo do projeto, decidido antes de começar o código. Leia tudo antes de propor arquitetura.

## O que é

Memecoin "tech" na Solana, lançada na pump.fun. Meta: chegar a ~30k de market cap e completar o bonding curve. O marketing vai ser só pelo X (sem KOLs pagos, sem comunidade grande), então **o próprio produto precisa gerar divulgação orgânica**.

A coin é sobre a **tech**. O mascote (Coffy, um caixão cartoon) é a cara da tech: ele é o "agente" que faz a autópsia na tela.

**Pitch:** "Cole sua wallet e o Coffy faz a autópsia da sua carteira."

## O produto (a tech)

1. O usuário cola o endereço de uma wallet Solana. Não há conexão de wallet nem assinatura: é **só leitura**.
2. O backend busca o histórico on-chain da wallet (Helius) e calcula métricas de trading.
3. Um LLM recebe essas métricas e escreve um **laudo de autópsia** humorístico e debochado, com causa da morte, pior trade, padrões ruins e uma nota final.
4. O site mostra o resultado com o Coffy "enterrando" a wallet, e gera um **card compartilhável em formato de lápide**, com o epitáfio da wallet.
5. Um botão "postar no X" usa o link de intent do X (`https://x.com/intent/post?text=...&url=...`), que é **grátis e não usa a API do X**. O link da página de resultado tem uma OG image (o card), então o card aparece no post.

### Métricas sugeridas (o código calcula, o LLM só narra)

- PnL estimado em SOL (entradas vs saídas por token)
- Pior trade (maior perda) e melhor trade
- Paperhand: vendeu e o token subiu depois (opcional, custa mais chamadas, pode ficar pra v2)
- Tempo médio de hold
- Quantidade de tokens que foram a ~zero
- Número de trades e tokens diferentes
- "Causa da morte" (categoria derivada das métricas: overtrading, paperhand, segurou rug, etc.)
- Nota final de 0–100

Os números vêm do código. O LLM **nunca inventa números**: recebe as métricas em JSON e só escreve o texto.

### Regras de produto

- Sem fees, sem tesouraria, sem mexer em dinheiro de ninguém. Nada de pedir conexão de wallet.
- O site só promete o que funciona de verdade. Nada de recurso fake ou "larp" anunciado como pronto. O que não existe ainda vai como "em breve" claramente marcado.
- O token pode dar algum benefício leve aos holders (ex.: laudo completo ou card exclusivo), mas isso é v2 e opcional.

## Stack decidida

- **Next.js (App Router) + TypeScript**, deploy na **Vercel**, com o GitHub conectado (push faz deploy).
- **API routes serverless** pro backend: `/api/autopsy?wallet=...`.
- **Helius**, plano grátis: 1M créditos/mês, 10 req/s e 1 sendTransaction/s (não usamos). Chamadas de histórico custam mais créditos, então:
  - limitar a análise (ex.: últimos 90 dias ou últimas N transações de swap);
  - cachear o resultado por wallet (Vercel KV/Upstash ou outro cache simples) pra não recalcular;
  - rate limit por IP no endpoint.
  - Confira a doc atual da Helius pra escolher os endpoints (transações parseadas, tipo SWAP, `tokenTransfers`/`nativeTransfers`).
- **LLM**: API da Anthropic, com um modelo pequeno e barato (família Haiku; confira o id atual na doc). Uma chamada por laudo, com saída estruturada (JSON com os campos do laudo).
- **Card**: gerado com `next/og` (ImageResponse) numa rota tipo `/api/card/[id]`, em 1200x630 pra OG image. Opcionalmente, uma versão 1080x1080 pra download.
- **Página de resultado compartilhável**: `/autopsy/[wallet]`, com metatags OG apontando pro card.

### Variáveis de ambiente

```
HELIUS_API_KEY=
ANTHROPIC_API_KEY=
```

Ficam em `.env.local` (no `.gitignore`) e nas Environment Variables da Vercel. Nunca no código, nunca no commit.

## Identidade visual

**Estética:** cartoon mortuário/Halloween. Fofo e engraçado, nunca sombrio de verdade. Traço grosso escuro, cores chapadas, clima "noite de Halloween".

**Mascote: Coffy** (no conteúdo em PT pode ser chamado de "Seu Caixão"). É um caixão de madeira com rosto: olhos grandes, sorriso com um dentinho, bochechas laranja, cruz clara na tampa, perninhas e uma pá na mão. A referência está em `coffy-mascote-ref.svg`. **É só direção**: a arte final cartoon vai ser gerada depois, então o código deve tratar o mascote como um asset trocável (ex.: `/public/coffy/*.png`), com o SVG como placeholder.

Expressões planejadas (uma por faixa de nota): rindo, chorando, desmaiado, cavando, piscando.

**Paleta:**

| Uso | Hex |
|---|---|
| Fundo noite (principal) | `#241733` |
| Painel/fundo secundário | `#3a2752` |
| Contorno/sombra | `#120b1a` |
| Texto osso/creme | `#f3ead6` |
| Laranja Halloween (acento principal) | `#f28c28` |
| Verde-gosma (acento secundário) | `#9be564` |
| Madeira do caixão | `#8a5a3c` / `#a06c48` / `#d9a877` |
| Cinza lápide | `#9aa0b4` / `#b2b8ca` / `#5d6378` |

**Tipografia** (Google Fonts):

- **Fredoka** (500/700): títulos, nome do mascote, números grandes.
- **Space Mono** (400/700): textos do laudo, labels, carimbos. Dá o ar de "ficha de necrotério".

**Elementos recorrentes:** lua crescente, estrelinhas, carimbos tortos em laranja ("DEFUNTO Nº 001", "REKT"), lápide, grama, pá.

## Card do epitáfio (peça mais importante)

É o que circula no X, então precisa ser legível em miniatura na timeline.

- Uma lápide cartoon grande no centro, com "R.I.P." gravado e o **endereço encurtado** da wallet (ex.: `7xKp…9fQa`).
- O epitáfio é uma frase curta e engraçada gerada pelo LLM.
- "Causa da morte" e a **nota** com destaque.
- O Coffy ao lado, com a expressão correspondente à nota.
- O rodapé leva a marca e a URL do site.
- Fundo noite com lua, na paleta acima.

## Estrutura do site (one-page + página de resultado)

1. **Hero**: Coffy, o pitch, o campo pra colar a wallet e o botão "Fazer autópsia".
2. **Loading animado**: o Coffy cavando, com mensagens engraçadas.
3. **Resultado**: o laudo completo, o card, e os botões "postar no X" e "baixar card".
4. **Como funciona** em 3 passos.
5. **Token**: CA da $COFFY (placeholder até o lançamento), links do X e da pump.fun.

Mobile primeiro: a maior parte do tráfego vem do X no celular.

**Idioma:** todo o site, o laudo, o card e os textos do X são **em inglês**. O objetivo do site é atrair novos holders pra $COFFY. (Comentários de código continuam em PT, sem acento e em minúsculas.)

## Lançamento (contexto, não é tarefa de código)

- Na pump.fun, na semana do Halloween (31/10). O site e o CA vão ao ar no mesmo minuto.
- Aquecimento no X de 5 a 7 dias antes, com clipes do build e cards de teste com wallets públicas famosas.
- No dia do lançamento, o site precisa aguentar pico: cache, rate limit e erro amigável quando a Helius limitar.

## Estilo de código

- **Comentários sem acentuação e em letras minúsculas**, sempre (ex.: `// busca historico da wallet`).
- Entregar exatamente o que foi pedido, sem adicionar features ou seções não solicitadas.
- O usuário (Lucas) se comunica de forma curta e direta: inferir o contexto e ajustar sem muita ida e volta.

## Status

**Feito:**

- Ideia, nome e ticker definidos.
- Direção visual e paleta definidas.
- Mascote escolhido (desenho de referência em SVG).
- Conta na Vercel e repositório no GitHub criados.

- Chave da Helius (em `.env.local`).
- Site com landing, página de resultado e card (passos 1 a 3).
- Métricas reais via Helius: `getTransactionsForAddress` (1 página de até 1000 tx, últimos 90 dias, filtro `tokenTransfer` pra cortar spam, ~100 créditos por autópsia) + preço atual via Jupiter (`lite-api.jup.ag/price/v3`). Transferências de token entre wallets ficam fora do PnL.

**Pendente:**

- LLM adiado de propósito pra não gastar dinheiro: o laudo usa frases prontas variadas (`lib/report.ts`), sorteadas de forma fixa por wallet e preenchidas só com as métricas reais. Frases não podem afirmar números que não vêm das métricas. Plugar a Anthropic só se o site ganhar tração.
- Cache compartilhado (Upstash) e rate limit por IP; hoje só há cache em memória por instância.
- @ no X.
- Domínio (opcional; dá pra começar em `*.vercel.app`).
- Arte final do mascote (gerada depois).

## Primeiro passo sugerido

1. Scaffold do Next.js com a paleta e as fontes configuradas.
2. Landing com o placeholder do mascote.
3. Endpoint `/api/autopsy` com dados mockados, pra validar o fluxo e o card de ponta a ponta.
4. Depois disso, plugar a Helius e o LLM.

@AGENTS.md
