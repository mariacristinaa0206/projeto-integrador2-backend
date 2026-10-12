import { requisicaoInvalida } from '../utilitarios/erros.js';

/**
 * Valida corpo, query string e parâmetros de rota com zod e entrega o resultado já limpo/convertido
 * em `req.validado = { corpo, consulta, parametros }`. Os controladores só leem `req.validado`,
 * nunca `req.body`/`req.query` crus. (No Express 5 `req.query` é somente leitura, por isso não é reescrito.)
 *
 * `corpoOpcional`: rotas em que o corpo pode ser omitido (vale como `{}`).
 */
export const validar =
  ({ corpo, consulta, parametros, corpoOpcional = false }) =>
  (req, res, next) => {
    const fontes = [
      ['corpo', corpo, corpoOpcional ? (req.body ?? {}) : req.body],
      ['consulta', consulta, req.query],
      ['parametros', parametros, req.params]
    ];

    const validado = {};
    const detalhes = [];

    for (const [nome, esquema, valor] of fontes) {
      if (!esquema) continue;

      if (nome === 'corpo' && valor === undefined) {
        throw requisicaoInvalida('Envie o corpo da requisição em JSON (Content-Type: application/json).');
      }

      const resultado = esquema.safeParse(valor);
      if (resultado.success) {
        validado[nome] = resultado.data;
      } else {
        for (const problema of resultado.error.issues) {
          detalhes.push({ campo: [nome, ...problema.path].join('.'), mensagem: problema.message });
        }
      }
    }

    if (detalhes.length > 0) throw requisicaoInvalida('Dados inválidos.', detalhes);

    req.validado = validado;
    next();
  };
