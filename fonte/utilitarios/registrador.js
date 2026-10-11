import { ambiente } from '../configuracao/ambiente.js';

/**
 * Log estruturado (uma linha JSON por evento). Regra: nunca registrar corpo de requisição, senhas,
 * tokens, query string nem dados pessoais ou emocionais. Só metadados técnicos.
 * (O histórico de quem acessou o quê, para auditoria, fica na tabela logs_auditoria.)
 */
function escrever(nivel, mensagem, contexto = {}) {
  if (ambiente.ehTeste) return;
  // `mensagem` vem DEPOIS do contexto: nenhum campo do contexto consegue trocar o nome do evento.
  const linha = JSON.stringify({ hora: new Date().toISOString(), nivel, ...contexto, mensagem });
  (nivel === 'erro' ? process.stderr : process.stdout).write(`${linha}\n`);
}

export const registrador = {
  info: (mensagem, contexto) => escrever('info', mensagem, contexto),
  aviso: (mensagem, contexto) => escrever('aviso', mensagem, contexto),
  erro: (mensagem, contexto) => escrever('erro', mensagem, contexto)
};

/**
 * Resume um erro sem vazar dados: mensagens de erros do Prisma podem trazer os argumentos da consulta
 * (inclusive hash de senha e conteúdo cifrado), então só o código e a primeira linha são mantidos.
 */
export function resumirErro(erro) {
  const primeiraLinha = String(erro?.message ?? '').split('\n')[0].slice(0, 300);
  const ehPrisma = erro?.name?.startsWith('PrismaClient');
  return {
    tipo: erro?.name,
    codigo: erro?.code,
    // Prisma repete os argumentos da consulta na mensagem e na pilha: nada disso vai para o log.
    // O campo NÃO pode se chamar "mensagem": ele sobrescreveria o nome do evento (`escrever` espalha o contexto).
    descricao: ehPrisma ? undefined : primeiraLinha,
    pilha: ambiente.ehProducao || ehPrisma ? undefined : String(erro?.stack ?? '').split('\n').slice(0, 6).join('\n')
  };
}
