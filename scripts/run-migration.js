// Script para executar migração no banco de dados
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Obter credenciais do arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Deve ser a chave de serviço com permissões de administrador

// Verificar se as credenciais estão presentes
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY devem ser configurados no arquivo .env');
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Nome do arquivo de migração (pode ser passado como argumento)
const migrationFile = process.argv[2] || 'add_order_column.sql';
const migrationPath = path.join(__dirname, '../migrations', migrationFile);

// Função principal para executar a migração
async function runMigration() {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(migrationPath)) {
      console.error(`Erro: Arquivo de migração não encontrado: ${migrationPath}`);
      process.exit(1);
    }
    
    // Ler conteúdo do arquivo SQL
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir em comandos separados (básico - assume que cada comando termina com ponto e vírgula)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`Iniciando migração: ${migrationFile}`);
    console.log(`Total de comandos: ${commands.length}`);
    
    // Executar cada comando separadamente
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i] + ';'; // Adicionar ponto e vírgula de volta
      console.log(`Executando comando ${i + 1}/${commands.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: cmd });
      
      if (error) {
        console.error(`Erro ao executar comando: ${error.message}`);
        console.error('Comando que falhou:', cmd);
        process.exit(1);
      }
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração:', error.message);
    process.exit(1);
  }
}

// Executar migração
runMigration(); 