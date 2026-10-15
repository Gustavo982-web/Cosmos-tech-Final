# 🚀 Cosmos-TECH

Plataforma educacional interativa sobre o universo — aprenda sobre o Sistema Solar e viagens espaciais através de conteúdos e quizzes.

## 📋 Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** JSON para desenvolvimento local ou MySQL gerenciado no Amazon RDS
- **Frontend:** HTML5, CSS3, JavaScript, Chart.js
- **Infraestrutura:** Docker + Docker Compose

## 📁 Estrutura do Projeto

```
Cosmos-TECH/
├── app.js                    # Ponto de entrada da aplicação
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example              # Modelo de configuração do RDS
├── docker/
│   └── mysql/
│       └── init.sql          # Script de inicialização do banco
├── src/
│   ├── database/
│   │   └── config.js         # Connection pool com suporte a SSL/RDS
│   ├── controllers/
│   │   ├── usuarioController.js
│   │   └── quizController.js
│   ├── models/
│   │   ├── usuarioModel.js
│   │   └── quizModel.js
│   └── routes/
│       ├── index.js
│       ├── usuarios.js
│       └── quiz.js
└── Site/app/
    ├── global.css            # Estilos globais (variáveis, navbar, footer)
    ├── index.html            # Landing page
    ├── login.html/css        # Tela de login
    ├── cadastro.html/css     # Tela de cadastro
    ├── software.html/css     # Quiz Sistema Solar
    ├── viagens.html/css      # Quiz Viagens Espaciais
    └── dashboard.html/css    # Dashboard de resultados
```

## 🚀 Como Rodar

### Desenvolvimento local com Docker

O Compose inicia somente a aplicação em modo JSON. Nenhum banco de dados é iniciado em container.

```bash
docker compose up --build
```

O app fica disponível em http://localhost:3333. Para alterar a porta no host, defina `COSMOS_HOST_PORT`.

### Executar a aplicação local apontando ao RDS

Copie `.env.example` para `.env`, configure o endpoint e as credenciais do RDS, então execute:

```bash
docker build -t cosmos-tech:local .
docker run --rm --env-file .env -p 3000:3000 cosmos-tech:local
```

Não envie o arquivo `.env` ao Git ou ao Docker Hub.

### Opção 2: Rodar Local (sem Docker)

```bash
# Instalar dependências
npm install

# Desenvolvimento (precisa de MySQL rodando local)
npm run dev

# Produção
npm start
```

## 🗄️ Configuração do RDS MySQL na AWS

Para conectar com o Amazon RDS:

1. **Crie uma instância RDS MySQL 8.0** na AWS
2. **Configure o Security Group** para permitir conexões na porta 3306 do IP/VPC da sua aplicação
3. **Crie o banco de dados `cosmos`** no RDS:
   ```sql
   CREATE DATABASE cosmos;
   ```
4. **Execute o script de tabelas** (`docker/mysql/init.sql`) no RDS usando um client MySQL:
   ```bash
   mysql -h seu-endpoint.rds.amazonaws.com -u admin -p cosmos < docker/mysql/init.sql
   ```
4. O app cria as tabelas e os quizzes na inicialização; o usuário do RDS precisa de permissão para criar tabelas e ler/escrever dados.
5. Configure o endpoint, nome do banco e credenciais no ambiente da aplicação. No ECS, use Secrets Manager para usuário e senha.

> O Security Group do RDS deve aceitar a porta 3306 somente a partir do Security Group das tasks ECS. Não exponha o RDS publicamente. Configure `DB_SSL=true` para validar TLS.

## ☁️ Docker Hub e Amazon ECS Fargate

O modelo `deploy/ecs/task-definition.json` executa somente o container da aplicação em Fargate, na porta 3000, e conecta ao RDS pela rede da VPC. O banco não faz parte da imagem nem da task.

1. Crie um repositório **público** no Docker Hub. Construa e publique a imagem manualmente:
   ```bash
   docker login --username DOCKERHUB_USERNAME
   docker buildx build --platform linux/amd64 -t DOCKERHUB_USERNAME/cosmos-tech:latest --push .
   ```
2. No ECS, crie os segredos do usuário e da senha do RDS no Secrets Manager. Substitua cada `REPLACE_WITH_*` em `deploy/ecs/task-definition.json`: username Docker Hub, endpoint do RDS, ARNs dos segredos, região e ARN da role de execução.
3. A role de execução do ECS precisa permitir leitura dos segredos e escrita no CloudWatch Logs. Para segredos criptografados com uma chave KMS própria, permita também o uso dessa chave.
4. Crie o banco `cosmos` no RDS, configure conectividade privada pela VPC e permita TCP 3306 do Security Group do ECS ao Security Group do RDS. A task definition define `DB_MODE=mysql` e a porta do app como 3000.
5. Crie o log group `/ecs/cosmos-tech` no CloudWatch Logs e registre a task definition:
   ```bash
   aws logs create-log-group --log-group-name /ecs/cosmos-tech --region SUA_REGIAO
   aws ecs register-task-definition --cli-input-json file://deploy/ecs/task-definition.json --region SUA_REGIAO
   ```
6. Crie o serviço ECS Fargate na mesma VPC do RDS. Para acesso público, configure um Application Load Balancer ou uma solução de entrada apropriada; não exponha a porta do banco. Considere custos de Fargate, balanceador, IPv4, CloudWatch Logs, RDS e transferência de dados.

Configure um AWS Budget antes de criar recursos. Nunca grave credenciais AWS ou do banco na imagem, no JSON da task definition ou no repositório. O push para Docker Hub e a criação/registro de recursos AWS são etapas manuais; não são executadas pelo projeto.

## 🛑 Parar a Aplicação

```bash
# Parar a aplicação
docker compose down
```

## 📝 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente (development/production) | `production` |
| `DB_HOST` | Host do banco de dados | `endpoint.rds.amazonaws.com` |
| `DB_DATABASE` | Nome do banco | `cosmos` |
| `DB_USER` | Usuário do banco | `admin` |
| `DB_PASSWORD` | Senha do banco | `sua-senha` |
| `DB_PORT` | Porta do banco | `3306` |
| `DB_SSL` | Validar TLS com o RDS | `true` |
| `PORT` | Porta interna da aplicação | `3000` |
| `APP_HOST` | Host da aplicação | `0.0.0.0` |

## 👨‍💻 Autor

Gustavo Henrique — © 2025
