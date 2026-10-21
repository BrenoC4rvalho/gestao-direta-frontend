# Auditoria técnica — Frontend Angular

**Sistema:** Gestão Direta

**Data de referência:** 18/10/2026
**Escopo:** código Angular deste repositório, contratos consumidos e verificações automatizadas disponíveis. O relatório descreve a auditoria já realizada; os testes de aplicação não foram repetidos durante a geração desta documentação.

## 1. Resumo executivo

A auditoria cobriu autenticação e navegação protegida, serviços HTTP, formulários financeiros, estado de sessão e fazenda, dashboard, movimentações, pendências de IA e o Relatório Financeiro que já existe no código. Não foi reproduzida vulnerabilidade de acesso a dados de outra conta pelo frontend; essa garantia é responsabilidade e foi testada no backend.

Foi atualizado o conjunto de dependências Angular de produção para versões corrigidas dentro da linha 21. A auditoria de produção reportou zero alertas. Permanecem 13 alertas no grafo completo, todos associados a dependências de desenvolvimento, incluindo um alerta crítico atribuído a tar; isso não demonstra exposição do pacote em produção, mas mantém risco para o ambiente de build/CI. Os resultados de teste previamente obtidos foram 942 testes aprovados, lint aprovado e build aprovado com aviso de orçamento.

| Situação frontend | Quantidade | Observação |
|---|---:|---|
| Achado corrigido | 1 | Atualização de dependências de produção Angular/Tailwind/PostCSS. |
| Achados pendentes | 2 | Alertas no grafo de desenvolvimento; tratamento global uniforme de 401. |
| Vulnerabilidade XSS confirmada | 0 | Não foram encontrados sinks explícitos de HTML confiável nas superfícies pesquisadas; isso não equivale a prova de ausência de XSS em toda entrada possível. |
| Divergência financeira confirmada na interface | 0 | Os componentes analisados exibem dados do contrato de relatório e passaram nos testes registrados; não houve reconciliação com base de produção. |

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
- O interceptor atual não centraliza a reação a respostas 401 posteriores à inicialização. Algumas páginas exibem mensagens locais de sessão expirada; não há um único mecanismo que limpe o store e redirecione em todos os fluxos. Não foi demonstrado acesso indevido à API, mas o estado visual pode ficar desatualizado até nova navegação/login.
- Logout chama o endpoint da API e limpa o estado local. A invalidação/revogação do token é uma responsabilidade do backend, descrita no relatório backend.

### XSS, erros e autorização visual

Angular interpola conteúdo como texto por padrão; a busca nas superfícies examinadas não encontrou uso explícito de innerHTML ou DomSanitizer.bypassSecurityTrust*. Respostas de IA/Telegram devem continuar sendo exibidas como texto, sem conversão em HTML confiável.

Mensagens 400/401/403/404 e falhas genéricas são tratadas principalmente por página/feature; a página de movimentações, por exemplo, mapeia esses códigos para mensagens não técnicas em [transactions-page.ts](../src/app/pages/transactions/transactions-page.ts#L1353). Há feedback de permissão 403, mas a ausência de um tratamento 401 global uniforme é a pendência FE-SEC-001. Guards de perfil administrativo só ocultam/protegem rotas no cliente e não substituem @PreAuthorize/controle contextual no backend.

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

As dependências Angular de produção foram atualizadas dentro da linha major 21; Tailwind/PostCSS também receberam versões corrigidas. Alterações em [package.json](../package.json) e package-lock.json fazem parte da auditoria. A auditoria npm foi novamente consultada durante a elaboração deste documento: produção segue sem alertas; o grafo completo mantém 13 alertas, todos associados a dependências de desenvolvimento segundo o resultado registrado na auditoria.

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

O resultado indicou correção disponível para os 13 alertas. Eles não foram atualizados automaticamente nesta auditoria para evitar ampliar o escopo/toolchain sem verificar compatibilidade. A classificação de impacto da aplicação considera que o scan de produção é limpo; severidade upstream não significa exploração confirmada no runtime.

## 10. Bugs encontrados e correções aplicadas

| ID | Severidade | Módulo | Evidência e impacto | Correção/recomendação | Testes relacionados | Estado |
|---|---|---|---|---|---|---|
| FE-DEP-001 | Alto (cadeia de build) | Dependências Angular | O grafo de produção possuía advisories em componentes Angular/toolchain. | Atualizadas dependências Angular, CDK, build/CLI e Tailwind/PostCSS dentro das linhas compatíveis; produção agora retorna zero alertas no scan repetido. | 942 testes, lint, build e npm audit --omit=dev aprovados no registro da auditoria; o scan omitindo dev foi repetido nesta etapa. | Corrigido |
| FE-DEP-002 | Médio | Dependências de desenvolvimento | npm audit lista os 13 pacotes da tabela acima; um aviso upstream é crítico, mas está no grafo dev. | Atualizar dependências afetadas em mudança dedicada, validar toolchain e reexecutar suíte/build/scan. | npm audit consultado nesta etapa; suíte completa não foi repetida. | Pendente |
| FE-SEC-001 | Médio | Sessão e tratamento de erros | O interceptor configura credenciais, mas não centraliza 401 posteriores ao bootstrap; stores/feedback podem não convergir imediatamente. | Adicionar tratamento global de 401 que limpe sessão, sem interceptar endpoints públicos indevidamente, e teste de regressão. | Guard/interceptor cobertos por testes existentes; cenário global de 401 pós-login não foi demonstrado por teste dedicado. | Pendente |

Nenhum bug financeiro exclusivo do frontend foi confirmado como causador de valor persistido incorreto. A falha de escala monetária observada na integração foi corrigida no backend, com validação da API mesmo que o cliente seja contornado.

## 11. Testes executados e resultados

Resultados de aplicação abaixo são os da auditoria anterior. Não foram repetidos durante a criação do relatório; apenas npm audit e npm audit --omit=dev foram consultados novamente para conferir dependências.

| Verificação | Resultado | Observações |
|---|---|---|
| Testes Angular (npm test -- --watch=false) | Aprovado | 105 arquivos / 942 testes; avisos do JSDOM/Canvas/Chart.js sem falhas. |
| Lint (npm run lint) | Aprovado | ESLint. |
| Build (npm run build) | Aprovado com aviso | Bundle inicial 545,63 kB; 45,63 kB acima do orçamento de aviso de 500 kB, abaixo do limite de erro. |
| Auditoria de produção (npm audit --omit=dev) | Aprovado | 0 alertas; conferida novamente durante esta documentação. |
| Auditoria completa (npm audit) | Parcial | 13 alertas no grafo de desenvolvimento: 1 crítico, 8 altos, 3 moderados e 1 baixo; todos indicavam correção disponível. Conferida novamente nesta etapa. |
| Testes de integração com backend real | Não executado | Sem ambiente de integração/produção utilizado para esta documentação. |

## 12. Problemas pendentes

- Os 13 advisories do grafo de desenvolvimento requerem atualização e validação do toolchain, apesar do scan de produção limpo.
- Tratamento global de sessão expirada deve ser padronizado para evitar store visual desatualizado após 401 emitido durante uso.
- Não houve auditoria visual automatizada AXE completa em navegadores/dispositivos nem teste E2E contra backend implantado; os testes unitários não substituem essas verificações.
- Confirmação de origem CORS, SameSite e Secure depende de configuração de produção e domínio implantado, não acessível nesta etapa.

## Plano de ação recomendado

### Crítica

- Nenhuma vulnerabilidade crítica de runtime frontend foi confirmada. O tar reportado como crítico está no grafo de desenvolvimento; manter CI isolado e tratar a atualização de dependência com prioridade alta.

### Alta

- Atualizar, em mudança controlada, os pacotes vulneráveis de desenvolvimento — incluindo o caminho transitivo de tar — e executar novamente testes, lint, build e npm audit; afeta package.json/lockfile e pipeline CI.
- Testar a interface em staging com a API para confirmar cookies, CORS e expiração de sessão nos domínios reais; afeta configuração de ambiente e fluxo de autenticação.

### Média

- Implementar e testar reação uniforme a 401 pós-login para limpar SessionStore, notificar e redirecionar; afeta interceptor, auth store e rotas.
- Executar axe/E2E em viewport móvel e desktop nas áreas autenticadas e revisar foco/contraste com a aplicação implantada.

### Baixa

- Considerar orçamento do bundle inicial de produção: reduzir/chunkificar o excedente de aviso se o crescimento continuar; não é falha de build atual.

## 13. Limitações da auditoria

Não foram usados dados financeiros reais, credenciais, serviços Telegram/Gemini externos, domínio de produção ou API em produção. Não foram reexecutados os 942 testes, lint ou build durante a geração deste arquivo. O relatório cobre o código e os testes inspecionados na auditoria registrada; não declara ausência total de vulnerabilidades ou bugs.
