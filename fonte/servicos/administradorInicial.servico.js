import { ambiente } from '../configuracao/ambiente.js';
import { PAPEIS } from '../configuracao/constantes.js';
import * as usuarioRepositorio from '../repositorios/usuario.repositorio.js';
import { ehViolacaoDeUnicidade } from '../utilitarios/erros.js';
import { registrador } from '../utilitarios/registrador.js';
import { gerarHashSenha } from '../utilitarios/senha.js';

/**
 * Primeiro administrador. Sem ele ninguém consegue cadastrar a equipe, então, na partida do servidor:
 *   - se JÁ existe algum administrador, não faz nada (a senha do .env nunca sobrescreve a senha real);
 *   - se não existe e ADMIN_EMAIL/ADMIN_SENHA estão definidos, cria a conta;
 *   - a conta nasce com senha PROVISÓRIA: no primeiro login é obrigatório trocá-la.
 */
export async function garantirAdministradorInicial() {
  if ((await usuarioRepositorio.contarAdministradores()) > 0) return;

  const inicial = ambiente.administradorInicial;
  if (!inicial) {
    registrador.aviso('sem_administrador', {
      dica: 'Defina ADMIN_EMAIL e ADMIN_SENHA no .env e reinicie para criar o primeiro administrador.'
    });
    return;
  }

  try {
    await usuarioRepositorio.criar({
      papel: PAPEIS.ADMINISTRADOR,
      nome: 'Administrador',
      email: inicial.email,
      senhaHash: await gerarHashSenha(inicial.senha),
      deveTrocarSenha: true
    });
    registrador.info('administrador_inicial_criado');
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) {
      registrador.aviso('administrador_inicial_nao_criado', { motivo: 'ADMIN_EMAIL já pertence a outra conta.' });
      return;
    }
    throw erro;
  }
}
