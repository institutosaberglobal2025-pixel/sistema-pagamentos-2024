/**
 * Script de Ping Semanal para Supabase
 * 
 * Este script faz uma requisição GET simples para manter o projeto Supabase ativo,
 * evitando que seja pausado por inatividade na versão gratuita.
 */

const https = require('https');
const url = require('url');

// Configurações do Supabase (obtidas do arquivo .env)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://guqwpqcthqzvxnkhlvmj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdwcWN0aHF6dnhua2hsdm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzM2NjEsImV4cCI6MjA3NjQ0OTY2MX0.iiQr3dHaH2dPNSreufukL5i82oiox_nbkdoq8BJktQ4';

// Endpoint para ping (consulta simples que não altera dados)
const PING_ENDPOINT = `${SUPABASE_URL}/rest/v1/students?select=id&limit=1`;

/**
 * Função para fazer o ping no Supabase
 */
async function pingSupabase() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = url.parse(PING_ENDPOINT);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Ping-Bot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = {
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          responseTime: responseTime,
          timestamp: new Date().toISOString(),
          endpoint: PING_ENDPOINT
        };

        if (result.success) {
          console.log(`✅ Ping bem-sucedido!`);
          console.log(`📊 Status: ${result.statusCode}`);
          console.log(`⏱️  Tempo de resposta: ${result.responseTime}ms`);
          console.log(`🕐 Timestamp: ${result.timestamp}`);
          resolve(result);
        } else {
          console.log(`❌ Ping falhou!`);
          console.log(`📊 Status: ${result.statusCode}`);
          console.log(`⏱️  Tempo de resposta: ${result.responseTime}ms`);
          console.log(`🕐 Timestamp: ${result.timestamp}`);
          reject(new Error(`HTTP ${result.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`❌ Erro na requisição!`);
      console.log(`🔥 Erro: ${error.message}`);
      console.log(`⏱️  Tempo decorrido: ${responseTime}ms`);
      console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
      
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout: Requisição demorou mais de 30 segundos'));
    });

    req.end();
  });
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando ping semanal do Supabase...');
  console.log(`🎯 Endpoint: ${PING_ENDPOINT}`);
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log('─'.repeat(50));

  try {
    const result = await pingSupabase();
    
    console.log('─'.repeat(50));
    console.log('🎉 Ping concluído com sucesso!');
    console.log('📝 O projeto Supabase permanece ativo.');
    
    // Log para GitHub Actions (se estiver rodando lá)
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::notice::Supabase ping successful - Status: ${result.statusCode}, Response time: ${result.responseTime}ms`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.log('─'.repeat(50));
    console.log('💥 Falha no ping!');
    console.log(`🔥 Erro: ${error.message}`);
    
    // Log de erro para GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::error::Supabase ping failed - ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { pingSupabase, main };