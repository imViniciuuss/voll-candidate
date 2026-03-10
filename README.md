# 🚀 Teste técnico - VOLL

---

## 🔗 Links

| Recurso | URL |
|---|---|
| 🌐 Aplicação em Produção | [DEPLOY DO PROJETO](https://voll-candidate-mu.vercel.app/) |
| 📦 Repositório GitHub | [REPOSITÓRIO](https://github.com/imViniciuuss/voll-candidate) |
| 🤖 Google AI Studio | [FORK DO AI STUDIO](https://ai.studio/apps/68b4d4b4-7d2a-45e1-97dc-0c4b68f45b6c) |

---

## ✨ Funcionalidades

- Exportação da listagem de alunos em CSV e PDF
<img width="1768" height="841" alt="image" src="https://github.com/user-attachments/assets/eef16157-64d8-47bd-a0f8-7c7065ded547" />
<img width="1917" height="913" alt="image" src="https://github.com/user-attachments/assets/ba5c13f2-d24a-42cb-acf0-eec24d33ccee" />


- Gerador de descrição de aula agendada para o aluno
<img width="1766" height="839" alt="image" src="https://github.com/user-attachments/assets/2e0ed037-89d3-4018-ade2-d492fd7eb024" />
<img width="1915" height="915" alt="image" src="https://github.com/user-attachments/assets/cce29b00-6245-4ccb-acc5-558a7f3a6f4a" />

- Feature implementada do tópico 3 da fase 4: Uma interface conversacional desenvolvida para facilitar a extração de insights do sistema. Através de uma
  integração com a API do Google Gemini, o chat interpreta perguntas em português e consulta a base de dados (Supabase)
  para retornar informações em tempo real.
<img width="1917" height="916" alt="image" src="https://github.com/user-attachments/assets/0848ad74-8ef8-4bb0-9730-6f36cc86011c" />


---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React + Vite |
| **Backend** | Node.js + Express |
| **Banco de Dados** | Supabase (PostgreSQL) |
| **IA** | Google Gemini API |
| **Deploy** | Vercel |

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos

- Node.js >= 18
- npm ou yarn
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Google AI Studio](https://aistudio.google.com)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

```env
# .env
GEMINI_API_KEY=sua_chave_gemini_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sua_chave_publica_supabase
```

### 4. Inicie o projeto

```bash
npm run dev
```

Acesse em: `http://localhost:3000`

---

## 🔒 Armazenamento das chaves da API

Sobre a gestão de chaves API no projeto:

- **Variáveis de Ambiente:** Todas as chaves sensíveis (GEMINI_API_KEY, SUPABASE_URL, e SUPABASE_KEY) são gerenciadas exclusivamente através de variáveis de ambiente (.env).
- **Proteção de Repositório:** O arquivo .env está devidamente listado no .gitignore, garantindo que nenhum segredo seja exposto no histórico do Git.
- **Isolamento Backend:** A chave do Gemini é mantida exclusivamente no lado do servidor (Node.js). O frontend nunca tem acesso a ela; todas as requisições de IA são intermediadas por uma rota de API protegida que injeta a credencial de forma segura.

## 🔒 Sobre a segurança

Tratando de segurança, alguns tópicos que poderiam ser colocados em prática em um ambiente real para garantir robustez e segurança:

- **Row Level Security (RLS) no Supabase:** Como o app consome dados diretamente do banco, a principal camada de defesa é a ativação de políticas de RLS. Isso garante que, mesmo que uma chave de frontend seja interceptada, o usuário só consiga acessar ou modificar os dados aos quais possui permissão explícita.
- **Prevenção de Prompt Injection:** No ChatWidget, as instruções do sistema (System Instructions) são isoladas do input do usuário no backend, mitigando tentativas de "burlar" as regras do assistente para extrair dados indevidos.
- **Sanitização de Inputs:** Implementação de validações em todas as rotas de API para prevenir ataques de Cross-Site Scripting (XSS) e injeção de scripts maliciosos.
- **Rate Limiting:** Para garantir que haja limitação nas requisições, evitando abuso.

## 🔒 Observações pessoais

Como este projeto se trata de um case técnico, optei por manter a estrutura base que foi disponibilizada originalmente, garantindo que todos os requisitos do teste fossem atendidos de forma fiel.

No entanto, em um projeto real de larga escala, minha abordagem para lidar com IA e Machine Learning seria mais robusta e segmentada, incluindo:

- **Frameworks de Orquestração:** Utilização de ferramentas como LangChain ou LlamaIndex para gerenciar fluxos complexos de conversa, memória de curto/longo prazo e encadeamento de tarefas (Chains).
- **RAG (Retrieval-Augmented Generation):** Em vez de apenas Function Calling, implementaria uma arquitetura de RAG com Bancos de Dados Vetoriais (como Pinecone ou pgvector) para permitir que a IA consultasse documentos densos e históricos de forma muito mais performática e barata (Aqui funcionaria muito bem na feature que adicionei do Widget com assistente)
