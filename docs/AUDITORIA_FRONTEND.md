# Auditoria técnica — Frontend Angular

**Sistema:** Gestão Direta

**Data de referência:** 24/10/2026
**Escopo:** código Angular deste repositório, contratos consumidos e verificações automatizadas disponíveis. O relatório descreve a auditoria já realizada; os testes de aplicação não foram repetidos durante a geração desta documentação.

## 1. Resumo executivo

A auditoria cobriu autenticação e navegação protegida, serviços HTTP, formulários financeiros, estado de sessão e fazenda, dashboard, movimentações, pendências de IA e o Relatório Financeiro que já existe no código. Nesta etapa também foram adaptados os contratos de recuperação de senha e as ações financeiras de reabertura/cancelamento. Não foi reproduzida vulnerabilidade de acesso a dados de outra conta pelo frontend; essa garantia é responsabilidade e foi testada no backend.

As pendências FE-DEP-002 e FE-SEC-001 foram corrigidas e validadas. A auditoria de produção e a auditoria completa de dependências agora reportam zero alertas. O frontend continua usando cookie de sessão HttpOnly, sem persistência de JWT no navegador. A suíte Angular passou com 952 testes, o lint passou e o build passou com aviso de orçamento do bundle inicial.

| Situação frontend | Quantidade | Observação |
|---|---:|---|
| Achado corrigido | 1 | Atualização de dependências de produção Angular/Tailwind/PostCSS. |
| Achados pendentes | 0 | As pendências de dependências e tratamento global de 401 foram corrigidas. |
| Vulnerabilidade XSS confirmada | 0 | Não foram encontrados sinks explícitos de HTML confiável nas superfícies pesquisadas; isso não equivale a prova de ausência de XSS em toda entrada possível. |
| Divergência financeira confirmada na interface | 0 | A interface consome os novos estados de reabertura/cancelamento e passou nos testes; não houve reconciliação com base de produção. |

## 2. Arquitetura e módulos analisados

Aplicação Angular standalone com rotas lazy-loaded, HttpClient, serviços por domínio, Reactive Forms e estado local/compartilhado com signals. As áreas verificadas foram:

| Área | Implementação observada |
|---|---|
| Inicialização e rotas | Configuração em [app.config.ts](../src/app/app.config.ts) e rotas em [app.routes.ts](../src/app/routes/app.routes.ts). |
| Autenticação | Login, sessão, logout, recuperação e redefinição de senha em pages/auth e [AuthService](../src/app/core/services/auth.service.ts). |
| Estado e autorização de interface | [SessionStore](../src/app/core/stores/session.store.ts), guards de sessão e gestão de pessoas, seletor/contexto de fazenda. |
| Operações de negócio | Usuários, fazendas, vínculos de fazenda, safras/atividades, categorias, movimentações, agenda/contas a vencer e transações pendentes. |
| Dashboard e relatório | Cards, fluxo de caixa e página de relatório em pages/dashboard e pages/reports/financial-report. O relatório é funcionalidade existente; esta auditoria não a criou. |
| Dependências e build | package.json, package-lock.json, testes, lint, build e auditoria npm. |

## 3. Segurança no Angular

### Autenticação, sessão e guards

- O cliente usa cookie de sessão HttpOnly gerenciado pela API; não recebe nem persiste JWT no localStorage/sessionStorage. O estado de usuário do [SessionStore](../src/app/core/stores/session.store.ts) permanece em memória. A preferência de tema é persistida separadamente e não contém credenciais.
- O [credentialsInterceptor](../src/app/core/interceptors/credentials.interceptor.ts) adiciona withCredentials: true a cada requisição. O teste [credentials.interceptor.spec.ts](../src/app/core/interceptors/credentials.interceptor.spec.ts) verifica esse contrato.
- O authGuard consulta /auth/session quando o estado ainda não foi inicializado e limpa o store/redireciona em falha. Os guards melhoram a navegação, mas não são controles de autorização: o servidor precisa validar cada recurso.
- O interceptor de autenticação agora trata 401 posteriores ao bootstrap em um único fluxo, limpa o estado de sessão e o contexto de fazenda em memória, exibe uma notificação única e redireciona para login. Login, recuperação de senha, consulta inicial de sessão e logout permanecem fora desse redirecionamento global.
- Logout chama o endpoint da API e limpa o estado local. A invalidação/revogação do token é uma responsabilidade do backend, descrita no relatório backend.

### XSS, erros e autorização visual

Angular interpola conteúdo como texto por padrão; a busca nas superfícies examinadas não encontrou uso explícito de innerHTML ou DomSanitizer.bypassSecurityTrust*. Respostas de IA/Telegram devem continuar sendo exibidas como texto, sem conversão em HTML confiável.

Mensagens 400/401/403/404 e falhas genéricas continuam sendo tratadas por página/feature quando necessário; o interceptor global encerra a sessão somente para 401 de endpoints autenticados. A resposta 403 não é confundida com sessão expirada e guards de perfil administrativo só ocultam/protegem rotas no cliente, sem substituir @PreAuthorize/controle contextual no backend.

Não foi feito teste de penetração contra domínio implantado. A segurança efetiva de cookie, CORS e SameSite depende também da topologia e dos domínios de produção.

## 4. Integração com endpoints do backend

Os serviços Angular e modelos TypeScript foram comparados com os fluxos e contratos observados. A base da API vem do ambiente Angular; os serviços incluem:

| Fluxo | Endpoints usados pelo cliente (famílias) | Serviço principal |
|---|---|---|
| Login/sessão/senha | /auth/login, /auth/session, /auth/logout, /auth/change-password, /auth/password-recovery/* | [auth.service.ts](../src/app/core/services/auth.service.ts) |
| Resumo e movimentações | /financial/summary, /financial/alerts, /financial/cash-flow, /financial/transactions, /financial/upcoming-bills | [financial.service.ts](../src/app/core/services/financial.service.ts) e serviços de movimentação/agenda |
| Relatórios | /financial/reports, /financial/reports/commitment-status, /financial/reports/transactions e exportação | [financial.service.ts](../src/app/core/services/financial.service.ts) |
| Pendências assistidas por IA | /pending-financial-transactions e ações de aprovação/rejeição; /ai/transactions/parse quando usado | Serviços de pendências e [ai-transaction.service.ts](../src/app/core/services/ai-transaction.service.ts) |
| Safras | /harvest/seasons, detalhes, dashboard, comparações, orçamento e exportação | [harvest-season.service.ts](../src/app/core/services/harvest-season.service.ts) |
| Administração e cadastros | Serviços de usuários, fazendas, usuários de fazenda e categorias | src/app/core/services/*service.ts por domínio |

Os modelos tipados cobrem paginação, enums, valores nullable, base do relatório (CASH/ACCRUAL) e granularidade mensal/trimestral. TypeScript não valida o JSON em runtime; testes de serviços e componentes usam respostas sintéticas. Não foi feita chamada a uma API de produção nem uma verificação integral de contrato contra ambiente compartilhado.

## 5. Validações de formulários

Login e recuperação validam formato de e-mail e campos obrigatórios; redefinição aplica regra de complexidade de senha no cliente. O formulário de movimentação sanitiza entrada em formato brasileiro, limita a entrada visual a duas casas decimais, rejeita valor vazio/não positivo e exige data de pagamento quando o status é PAID ([transaction-form.ts](../src/app/pages/transactions/components/transaction-form/transaction-form.ts#L155), [money.utils.ts](../src/app/shared/utils/money.utils.ts)). Categoria é conferida no conjunto de opções compatíveis carregado para o contexto atual.

Essas validações melhoram a experiência, mas não são fronteira de segurança. O backend acrescentou @Digits(integer=13, fraction=2) aos quatro DTOs financeiros relevantes; assim, requisições fora de escala também são rejeitadas no servidor. Não se identificou uma validação frontend equivalente para todas as regras e todos os campos de negócio, portanto invariantes devem permanecer aplicadas pela API.

## 6. Estado, reatividade e concorrência de requisições

Signals são usados no estado de sessão, contexto de fazenda e estado visual; computed deriva valores. Formulários são reativos e subscriptions de longa duração examinadas usam takeUntilDestroyed em pontos relevantes. As páginas mantêm estados de loading/erro e atualizam dados após alterações.

Os testes cobrem troca de filtros, fazenda e respostas de erro em fluxos importantes. Não foi executado teste de estresse concorrente no navegador. Requisições simultâneas de gravação podem ser repetidas por clique/rede; proteção contra operações financeiras duplicadas, locking e idempotência é responsabilidade da API e não deve ser inferida a partir de botões desabilitados.

## 7. Regras financeiras implementadas no frontend

- Valores são apresentados em formato monetário brasileiro e convertidos a número somente para compor requests; decisões financeiras de persistência e agregação são feitas no backend com BigDecimal.
- Movimentações enviam tipo, status, data da movimentação, vencimento, liquidação, categoria, fazenda e safra conforme a ação/formulário. Sem safra é representado como vínculo nulo e mantido no modelo de relatório.
- A interface não deve ser tratada como fonte autoritativa de status ou propriedade da fazenda. A correção de precisão monetária, isolamento entre fazendas e autorização está detalhada no relatório backend.
- Não foi reproduzido um cálculo frontend que altere saldo persistido ou cause dupla contagem; os indicadores principais são consumidos dos endpoints de resumo/relatório.

## 8. Relatório Financeiro e consistência de gráficos/indicadores

Foi inspecionada a página de relatório existente e seus componentes de evolução financeira, fluxo de caixa, resumo por categoria/safra, participação por safra e situação dos compromissos. Os testes de componentes verificam filtros, respostas vazias/erro, séries e tooltips, inclusão de itens sem safra e alternância de granularidade. Não se encontrou divergência reproduzível entre totais exibidos e o modelo de resposta nos cenários cobertos.

A regra do indicador de cumprimento observada no contrato/backend é liquidadosNoPrazo / (liquidadosNoPrazo + liquidadosEmAtraso + vencidosEmAberto) * 100; o relatório de backend referencia sua implementação. A janela Próximos 7 dias deve refletir hoje, não o intervalo histórico selecionado; isso foi verificado nos fluxos de relatório cobertos. A auditoria não recalculou indicadores a partir de dados reais de produção nem valida visualmente cada dataset em todos os browsers.

Participação por safra preserva os valores não alocados, separa receitas/despesas e usa os totais correspondentes ao resumo recebido. Resultado negativo não deve ser reinterpretado como uma parcela positiva de receita. Alterações de filtro disparam atualização dos dados; não foi reportada inconsistência reproduzível mensal/trimestral.

## 9. Dependências vulneráveis e atualizações

As dependências Angular de produção foram atualizadas dentro da linha major 21; Tailwind/PostCSS também receberam versões corrigidas. Alterações em [package.json](../package.json) e package-lock.json fazem parte da auditoria. Na validação desta implementação, `npm audit --omit=dev` e `npm audit` retornaram zero alertas.

| Dependência | Versão anterior declarada | Versão declarada após auditoria |
|---|---:|---:|
| Angular common/core/compiler/forms/platform-browser/router | ^21.0.0 | ^21.2.25 |
| Angular CDK | ^21.2.9 | ^21.2.14 |
| Angular build/CLI | ^21.0.5 | ^21.2.27 |
| Angular compiler-cli | ^21.0.0 | ^21.2.25 |
| Tailwind e @tailwindcss/postcss | ^4.3.1 | ^4.3.3 |
| PostCSS | ^8.5.15 | ^8.5.31 |

| Pacote reportado pelo npm audit | Severidade upstream | Contexto |
|---|---|---|
| @vitest/mocker | Moderada | Transitiva de desenvolvimento. |
| baseline-browser-mapping | Moderada | Transitiva de desenvolvimento. |
| brace-expansion | Alta | Transitiva de desenvolvimento. |
| browserslist | Alta | Ferramenta de build/desenvolvimento. |
| esbuild | Baixa | Ferramenta de build/desenvolvimento. |
| fast-uri | Alta | Transitiva de desenvolvimento. |
| http-cache-semantics | Alta | Transitiva de desenvolvimento. |
| immutable | Alta | Transitiva de desenvolvimento. |
| ip-address | Alta | Transitiva de desenvolvimento. |
| js-yaml | Alta | Transitiva de desenvolvimento. |
| tar | Crítica | Transitiva de desenvolvimento; não prova exposição no bundle de produção. |
| undici | Alta | Transitiva de desenvolvimento. |
| vitest | Moderada | Dependência direta de desenvolvimento. |

Na validação de 24/10/2026, `npm audit --omit=dev` e `npm audit` retornaram zero alertas. As atualizações não-forçadas mantiveram Angular na linha 21, incluindo `@angular/build`/CLI 21.2.28, Vitest 4.1.12 e os pacotes transitivos corrigidos. O pacote `undici` usado pelo build permanecia fixado em 7.29.1 pelo pacote pai; foi aplicado override explícito para 7.30.1. O `node-gyp` recebeu override separado para `undici` 6.29.1, compatível com sua faixa 6.x. O override evita o `npm audit fix --force`, que sugeria downgrade incompatível para Angular 20.

As cadeias principais verificadas foram `@angular/build -> undici/vite`, `@angular/cli -> @modelcontextprotocol/sdk -> ip-address`, `@angular-devkit/core -> ajv -> fast-uri`, `@angular/build -> sass -> immutable`, `@angular/cli -> pacote -> node-gyp -> tar/undici` e `eslint -> js-yaml/brace-expansion`. A severidade upstream não demonstra exploração no runtime do navegador; todo o grafo vulnerável era de desenvolvimento/build.

## 10. Bugs encontrados e correções aplicadas

| ID | Severidade | Módulo | Evidência e impacto | Correção/recomendação | Testes relacionados | Estado |
|---|---|---|---|---|---|---|
| FE-DEP-001 | Alto (cadeia de build) | Dependências Angular | O grafo de produção possuía advisories em componentes Angular/toolchain. | Atualizadas dependências Angular, CDK, build/CLI e Tailwind/PostCSS dentro das linhas compatíveis; produção agora retorna zero alertas no scan repetido. | 942 testes, lint, build e npm audit --omit=dev aprovados no registro da auditoria; o scan omitindo dev foi repetido nesta etapa. | Corrigido |
| FE-DEP-002 | Médio | Dependências de desenvolvimento | O grafo anterior possuía advisories em Vitest, Angular CLI/build e dependências transitivas, incluindo `tar` crítico e `undici` alto. | Atualizadas dependências compatíveis na linha Angular 21 e aplicados overrides justificados para `undici`, sem `--force`. | `npm audit`, `npm audit --omit=dev`, `npm ls`, suíte completa, lint e build aprovados. | Corrigido |
| FE-SEC-001 | Médio | Sessão e tratamento de erros | O interceptor de credenciais não centralizava 401 posteriores ao bootstrap. | Adicionados interceptor global, reset centralizado de sessão/contexto e proteção contra notificações/redirecionamentos concorrentes; endpoints públicos foram excluídos. | Testes dedicados para 401 concorrente, endpoints públicos, 403, 500, credenciais, logout e reconstrução após novo login. | Corrigido |

Nenhum bug financeiro exclusivo do frontend foi confirmado como causador de valor persistido incorreto. A falha de escala monetária observada na integração foi corrigida no backend, com validação da API mesmo que o cliente seja contornado.

## 10. Correções implementadas nesta etapa

- A recuperação de senha deixou de consultar ou exibir `telegramAvailable` e `phoneLastFour`. O Angular envia o e-mail, exibe apenas confirmação genérica e segue para a etapa de código; o Telegram continua sendo acionado internamente pela API.
- O serviço de movimentações agora consome `PATCH /financial/transactions/{id}/reopen`. A tela apresenta confirmação para reabrir uma movimentação paga, atualiza a listagem e trata conflitos `409`.
- O cancelamento de movimentações pagas continua disponível com confirmação explícita e mensagem de impacto nos totais. Erros 404 de categoria/safra são apresentados como recurso indisponível para a fazenda, sem mensagens técnicas.
- O contrato de movimentação passou a aceitar a versão retornada pela API para acompanhar concorrência otimista, sem transformar o cliente em autoridade de autorização.

Os testes de serviço Angular foram atualizados para o contrato genérico de recuperação e para a chamada de reabertura. A suíte de página/serviços continua cobrindo loading, erros, confirmações e atualização após operações.

## 11. Testes executados e resultados

Resultados abaixo foram executados após esta etapa.

| Verificação | Resultado | Observações |
|---|---|---|
| Testes Angular (npm test -- --watch=false) | Aprovado | 106 arquivos / 952 testes; avisos do JSDOM/Canvas/Chart.js sem falhas. |
| Lint (npm run lint) | Aprovado | ESLint. |
| Build (npm run build) | Aprovado com aviso | Bundle inicial 548,70 kB; 48,70 kB acima do orçamento de aviso de 500 kB, abaixo do limite de erro. As páginas continuam em chunks lazy-loaded; o orçamento não foi aumentado. |
| Auditoria de produção (npm audit --omit=dev) | Aprovado | 0 alertas; conferida novamente durante esta documentação. |
| Auditoria completa (npm audit) | Aprovado | 0 alertas após atualização transitiva e overrides compatíveis; nenhuma mudança major ou `--force` foi usada. |
| Testes de integração com backend real | Não executado | Sem ambiente de integração/produção utilizado para esta documentação. |
| Revisão de acessibilidade | Parcialmente validada | Revisão estática das telas principais, mensagens de erro, gráficos, overlays e foco; não houve execução AXE em navegador real. |

## 12. Problemas pendentes

- Não há pendências de código confirmadas nesta auditoria. Ainda não houve auditoria visual automatizada AXE completa em navegadores/dispositivos nem teste E2E contra backend implantado; os testes unitários não substituem essas verificações.
- Confirmação de origem CORS, SameSite e Secure depende de configuração de produção e domínio implantado, não acessível nesta etapa.

## Plano de ação recomendado

### Próximas validações recomendadas

- Executar AXE/E2E em viewport móvel e desktop nas áreas autenticadas e revisar foco/contraste com a aplicação implantada.
- Testar em staging com a API para confirmar cookies, CORS, SameSite, Secure e expiração de sessão nos domínios reais.
- Monitorar o bundle inicial; o warning atual permanece abaixo do limite de erro e não foi mascarado aumentando o orçamento.

## 13. Limitações da auditoria

Não foram usados dados financeiros reais, credenciais, serviços Telegram/Gemini externos, domínio de produção ou API em produção. A validação local foi executada em 24/10/2026; os avisos do JSDOM/Canvas/Chart.js não causaram falhas. O relatório não declara ausência total de vulnerabilidades ou bugs e não substitui validação AXE/E2E em navegador e ambiente implantado.
