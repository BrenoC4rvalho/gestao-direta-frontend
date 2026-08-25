# Gestão Direta Web

Frontend do Gestão Direta, uma aplicação de gestão financeira para pequenos produtores rurais. A interface reúne a experiência de uso para acompanhar fazendas, safras, receitas, despesas e informações operacionais.

## Sobre o projeto

Esta SPA Angular consome a API do Gestão Direta. Ela possui uma landing page pública e uma área autenticada para gestão financeira por fazenda. Não há cadastro público: usuários e permissões são administrados pela API e refletidos nas telas e guards.

## Funcionalidades

- Landing page, login, logout, sessão, lembrar de mim, troca e recuperação de senha.
- Dashboard, fazendas, usuários, vínculos de fazenda e perfil.
- Cadastro unificado de categorias financeiras e atividades produtivas.
- Movimentações, agenda, alertas, relatórios financeiros, safras e atividades produtivas.
- Vínculo Telegram e revisão de movimentações identificadas por mensagem.

## Tecnologias

| Tecnologia | Versão/configuração | Uso |
| --- | --- | --- |
| Angular | `21.0.0` | Framework da aplicação. |
| Angular CLI | `21.0.5` | Desenvolvimento, build e testes. |
| TypeScript | `5.9.2` | Linguagem, com configuração estrita. |
| Tailwind CSS | `4.3.1` | Estilização e tokens visuais. |
| Lucide Angular | `1.21.0` | Ícones. |
| RxJS | `7.8.0` | Requisições e fluxos assíncronos. |
| Chart.js / ng2-charts | `4.5.1` / `10.0.0` | Gráficos financeiros. |
| Vitest | `4.0.8` | Testes unitários via Angular CLI. |
| ESLint | `9.39.5` | Análise estática. |
| Playwright | `1.62.1` | Roteiro de vídeo demonstrativo. |

## Arquitetura do frontend

O projeto usa componentes standalone, carregamento lazy por rota, `ChangeDetectionStrategy.OnPush`, Reactive Forms e Angular Signals. Services centralizam a comunicação HTTP; stores baseados em Signals mantêm sessão, tema, fazenda selecionada, acesso à fazenda, toasts e pendências financeiras.

```text
src/
├── app/
│   ├── core/                 # guards, interceptor, models, services, stores e ícones
│   ├── layouts/              # layouts e navegação responsiva
│   ├── pages/                # páginas e componentes de cada área
│   ├── routes/               # rotas
│   └── shared/               # UI, formulários, overlays, pipes e utilitários
├── environments/             # URL da API por ambiente
├── styles.css                # Tailwind, tokens globais e temas
└── main.ts

public/
└── assets/                   # logos e imagens da aplicação
```

## Pré-requisitos e instalação

- Node.js e npm. O repositório não fixa versão mínima de Node em `package.json`, `.nvmrc` ou `.node-version`.
- npm `11.6.2`, informado em `packageManager`. A validação atual usou Node `24.12.0` e npm `11.6.2`.
- Backend disponível para utilizar as telas integradas.

O projeto usa npm e `package-lock.json`. Em um clone novo, instale as dependências travadas com:

```bash
npm ci
```

Use `npm install` apenas quando a atualização de dependências for intencional.

## Configuração e integração com o backend

A URL da API está nos arquivos abaixo; não há `.env` nem proxy Angular no projeto.

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

Atualmente ambos usam `http://localhost:8080/api`. Para outra instância, altere `apiUrl` no ambiente apropriado. Nunca inclua segredos, tokens ou credenciais no bundle.

## Executando localmente

```bash
npm start
```

O script executa `ng serve` com a configuração de desenvolvimento. A aplicação fica em `http://localhost:4200` e recarrega ao detectar alterações.

Para acompanhar um build de desenvolvimento:

```bash
npm run watch
```

## Autenticação e sessão

O backend autentica com cookie de sessão HTTP-only. O `credentialsInterceptor` aplica `withCredentials: true` a todas as requisições; o frontend não armazena token.

O `SessionStore` mantém o usuário e o estado da sessão. Rotas privadas verificam a disponibilidade da API e a autenticação, redirecionando sessões inválidas para `/login`. Há fluxos de recuperação de senha e solicitação de código via Telegram quando o contato é elegível.

Mantenha a origem do frontend permitida no CORS do backend com credenciais.

## Navegação e rotas

As páginas são carregadas sob demanda. Os grupos principais são:

- `/`: landing page pública.
- `/login` e `/forgot-password/*`: autenticação e recuperação.
- `/dashboard` e `/farms`: resumo e fazendas.
- `/people`: usuários e vínculos, com guard de gestão de pessoas.
- `/registrations`: Cadastro, com Categorias e Atividades produtivas.
- `/transactions` e `/transactions/pending-approvals`: movimentações e revisão de pendências.
- `/reports/financial`, `/harvests`, `/upcoming-bills` e `/profile`: relatório, safras, agenda e perfil.

As rotas antigas `/users`, `/farm-users`, `/categories` e `/production-activities` redirecionam para as áreas unificadas.

## Fazenda selecionada, Signals e RxJS

O `SelectedFarmStore` mantém a fazenda ativa; páginas e permissões usam esse contexto para consultar dados da fazenda selecionada. Signals e `computed()` são o padrão de estado local e compartilhado; RxJS é usado para HTTP e fluxos assíncronos.

O store de pendências consulta a API a cada 15 segundos, atualiza o badge e notifica novas movimentações com toast.

## Design System e componentes compartilhados

O Design System é definido em `design-system.md` e nos tokens de `src/styles.css`. A interface usa Tailwind CSS 4, tema claro/escuro, paleta verde, foco visível e abordagem mobile-first.

Reutilize os componentes existentes antes de criar padrões isolados:

- UI: `gd-button`, `gd-card`, `gd-badge`, `gd-skeleton`, `gd-empty-state`, `gd-error-state`, `gd-list-filters`, `gd-summary-card` e `gd-tooltip`.
- Formulários: `gd-input`, `gd-select`, `gd-textarea` e `gd-field-error`.
- Overlays: `gd-drawer`, `gd-confirm-dialog` e `gd-toast-container`.

Formulários usam Reactive Forms. Novas telas devem tratar loading, erro, vazio e sucesso com os componentes e toasts compartilhados.

## Landing page e mensageria

A landing apresenta a gestão por fazenda e safra e o fluxo de movimentações por mensagem, sempre revisadas antes da confirmação. Telegram é o canal funcional apresentado: contas podem ser vinculadas no perfil e suas movimentações ficam pendentes para revisão.

WhatsApp aparece apenas como **Em breve**. O link comercial da landing não representa uma integração funcional com WhatsApp.

## Testes

Os testes unitários usam o Angular CLI com Vitest:

```bash
npm test
```

O projeto também possui configuração Playwright e um roteiro de vídeo:

```bash
npm run demo:video
```

Esse roteiro exige backend, credenciais e uma fazenda de demonstração; cria e atualiza uma atividade com prefixo `[DEMO]`. Leia `demo/README.md` antes de executá-lo.

## Qualidade e build

```bash
npm run lint
npm run build
```

O lint usa ESLint. Há configuração Prettier em `package.json`, mas não existe script de formatação. O build padrão usa a configuração de produção, com otimizações, hash de saída e budgets definidos em `angular.json`.

## Boas práticas de desenvolvimento

1. Analise uma tela semelhante e reutilize services, models, stores, componentes e ícones existentes.
2. Mantenha componentes standalone, pequenos e com `OnPush`; use Signals e Reactive Forms conforme o padrão.
3. Preserve o design mobile-first e valide desktop, tablet e mobile.
4. Use HTML semântico, labels, foco visível, contraste e `aria-label` em controles somente com ícone.
5. Não duplique componentes ou adicione bibliotecas de UI quando a stack atual atende à necessidade.
6. Regras centrais de domínio permanecem no backend; validações de interface não as substituem.
7. Atualize testes relevantes e execute lint, testes e build antes de enviar alterações.

## Troubleshooting

### Backend indisponível

Confirme a API em execução e a propriedade `apiUrl`. As rotas privadas vão para `/server-error` quando a verificação de status falha.

### CORS ou sessão não persistida

Confira se o backend permite `http://localhost:4200` com credenciais. O frontend envia cookies por meio de `withCredentials`.

### Porta 4200 ocupada

```bash
npm start -- --port 4201
```

Ao usar outra origem, atualize o CORS do backend.

### Dependências ou build após atualização

Restaure instalações consistentes com `npm ci` e confira a versão de Node/npm usada pelo time, pois Node não é fixado no repositório.
