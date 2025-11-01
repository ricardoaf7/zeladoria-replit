# CMTU-LD Operations Dashboard

Dashboard operacional para gestão de serviços urbanos em Londrina, Brasil.

## 🚀 Deploy na Vercel com Supabase

### 1. Criar Banco de Dados no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Aguarde a criação do banco de dados
4. Vá em **Settings** → **Database**
5. Copie a **Connection String** (formato: `postgresql://...`)

### 2. Configurar Migrations e Seed

No seu ambiente local, configure a variável de ambiente:

```bash
export DATABASE_URL="sua-connection-string-do-supabase"
```

Execute as migrations para criar as tabelas:

```bash
npm run db:generate
npm run db:migrate
```

Popule o banco com dados iniciais:

```bash
npm run db:seed
```

### 3. Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New** → **Project**
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - `DATABASE_URL`: sua connection string do Supabase
5. Clique em **Deploy**

### 4. Configurar Domínio (Opcional)

1. No painel da Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio customizado

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento local
npm run dev

# Gerar migrations do Drizzle
npm run db:generate

# Aplicar migrations
npm run db:migrate

# Popular banco com dados iniciais
npm run db:seed

# Build para produção
npm run build

# Iniciar em produção
npm start
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas

- **service_areas**: Áreas de serviço (roçagem, jardins)
- **teams**: Equipes de campo
- **app_config**: Configurações do sistema

### Campos Importantes

#### service_areas
- `manualSchedule`: Flag para proteger agendamentos manuais
- `scheduledDate`: Data de início do serviço
- `proximaPrevisao`: Próxima data prevista
- `history`: Histórico de manutenções (JSONB)
- `polygon`: Polígono da área (JSONB)

## 🎨 Funcionalidades

- ✅ Mapa interativo com Leaflet.js
- ✅ Seleção múltipla de áreas
- ✅ Agendamento em lote manual
- ✅ Agendamento automático inteligente
- ✅ Histórico de manutenções
- ✅ Visualização de equipes em tempo real
- ✅ Dark mode e paleta de cores customizada

## 🔐 Variáveis de Ambiente

### Desenvolvimento
```env
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=development
```

### Produção (Vercel)
Configure no painel da Vercel:
- `DATABASE_URL`: Connection string do Supabase

## 💡 Dicas

### Trocar entre MemStorage e DbStorage

A aplicação detecta automaticamente:
- Se `DATABASE_URL` está definida → usa PostgreSQL (DbStorage)
- Se não → usa memória (MemStorage)

### Backup do Banco

```bash
# Export via Supabase Dashboard
# Settings → Database → Database Settings → Connection Pooling
```

### Monitoramento

- Logs da aplicação: Painel da Vercel
- Logs do banco: Painel do Supabase

## 🆘 Troubleshooting

### Erro de conexão com banco
- Verifique se a DATABASE_URL está correta
- Confirme que o IP da Vercel está autorizado no Supabase
- Supabase permite todas as conexões por padrão

### Migrations não aplicam
```bash
# Force push schema
npm run db:push
```

### Dados não aparecem
```bash
# Execute seed novamente
npm run db:seed
```

## 📞 Suporte

Para issues ou dúvidas, abra uma issue no repositório.

## 📄 Licença

MIT
