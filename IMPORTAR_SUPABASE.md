# Como Importar o Banco de Dados no Supabase

## 📦 Arquivos Exportados

Três arquivos foram gerados para você:

1. **`export_schema.sql`** (4.2 KB)
   - Contém apenas a estrutura das tabelas (DDL)
   - Use se quiser criar as tabelas manualmente primeiro

2. **`export_data.sql`** (281 KB)
   - Contém apenas os dados (INSERT statements)
   - Use após criar as tabelas

3. **`export_complete.sql`** (286 KB) ⭐ **RECOMENDADO**
   - Contém estrutura + dados completos
   - Importação em um único passo

## 🚀 Passo a Passo para Importar no Supabase

### Opção 1: Usando o SQL Editor do Supabase (Mais Fácil)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)

2. No menu lateral, clique em **SQL Editor**

3. Clique em **New Query**

4. Abra o arquivo `export_complete.sql` em um editor de texto

5. Copie todo o conteúdo e cole no SQL Editor do Supabase

6. Clique em **Run** para executar

7. Aguarde a execução (pode levar alguns segundos devido aos 1128+ registros)

### Opção 2: Usando o Terminal (psql)

Se você tiver acesso à connection string do Supabase:

```bash
# Pegue a connection string no Supabase (Database Settings > Connection String)
# Formato: postgresql://postgres:[SUA-SENHA]@[SEU-HOST].supabase.co:5432/postgres

psql "SUA_CONNECTION_STRING_AQUI" < export_complete.sql
```

### Opção 3: Importação em Duas Etapas

Se preferir fazer em duas etapas:

```sql
-- 1. Primeiro execute export_schema.sql
-- (Cria as tabelas vazias)

-- 2. Depois execute export_data.sql
-- (Popula os dados)
```

## 📋 Tabelas Incluídas

O banco contém **3 tabelas principais**:

### 1. `service_areas` (1128 registros)
- Áreas de serviço com localização geográfica
- Histórico de roçagem
- Previsões de próxima manutenção
- Informações de lote, bairro, endereço

### 2. `app_config` (1 registro)
- Configurações do sistema
- Taxas de produtividade por lote
- Parâmetros de agendamento

### 3. `teams` (vazia)
- Estrutura para gerenciamento de equipes
- Pronta para uso futuro

## ⚠️ Importante

### Conflitos de Dados
Se você já tem dados no Supabase, pode ocorrer conflito de IDs. Neste caso:

1. **Limpe as tabelas existentes** (se puder apagar):
```sql
TRUNCATE service_areas, app_config, teams RESTART IDENTITY CASCADE;
```

2. Ou **ajuste os IDs** manualmente antes de importar

### Sequences (Auto-incremento)
Os arquivos já incluem os comandos para ajustar as sequences:
- `service_areas_id_seq` → próximo ID: 1129
- `teams_id_seq` → próximo ID: 1

### Timezone
Datas estão em **UTC**. Se precisar ajustar para o fuso horário de Londrina (UTC-3):
```sql
-- Exemplo de ajuste (execute DEPOIS da importação se necessário)
ALTER TABLE service_areas 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Sao_Paulo';
```

## ✅ Verificação Pós-Importação

Execute estas queries para confirmar que tudo foi importado:

```sql
-- Verificar total de áreas
SELECT COUNT(*) FROM service_areas;
-- Esperado: 1128

-- Verificar áreas por lote
SELECT lote, COUNT(*) FROM service_areas GROUP BY lote;
-- Lote 1: ~581 áreas
-- Lote 2: ~547 áreas

-- Verificar configuração
SELECT * FROM app_config;
-- Deve retornar 1 registro com mowing_production_rate

-- Verificar áreas sem histórico de roçagem (devem aparecer laranjas no mapa)
SELECT COUNT(*) FROM service_areas WHERE ultima_rocagem IS NULL;
-- Esperado: ~1093 áreas
```

## 🔧 Troubleshooting

### Erro: "role does not exist"
- Ignore, os arquivos já estão sem informações de owner/privileges

### Erro: "relation already exists"
- As tabelas já existem, use TRUNCATE ou DROP antes de importar

### Erro de timeout
- Divida a importação: primeiro schema, depois dados em lotes menores
- Ou aumente o timeout do SQL Editor

### Caracteres especiais (acentos)
- Certifique-se que o encoding está em UTF-8
- Os arquivos já estão com `SET client_encoding = 'UTF8';`

## 📞 Suporte

Se tiver problemas na importação:
1. Verifique os logs de erro no Supabase
2. Confirme que tem permissões de CREATE TABLE e INSERT
3. Teste primeiro com `export_schema.sql` para validar a estrutura

## 🎯 Próximos Passos

Após a importação bem-sucedida:

1. **Configure a aplicação** para usar a connection string do Supabase
2. **Atualize a variável de ambiente** `DATABASE_URL`
3. **Teste a conexão** fazendo uma query de teste
4. **Configure backups automáticos** no Supabase (recomendado)

---

**Boa sorte com a migração! 🚀**
