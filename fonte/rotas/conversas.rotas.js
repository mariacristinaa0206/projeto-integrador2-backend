import { Router } from 'express';
import { PAPEIS, PAPEIS_APOIO } from '../configuracao/constantes.js';
import * as controlador from '../controladores/conversa.controlador.js';
import { autenticar, exigirPapel } from '../intermediarios/autenticar.js';
import { corpoJson } from '../intermediarios/corpoJson.js';
import { limitadorEscrita, limitadorLeituraChat, limitadorMensagens } from '../intermediarios/limitadores.js';
import { validar } from '../intermediarios/validar.js';
import { parametrosIdEsquema } from '../validadores/comuns.js';
import { consultaMensagens, esquemaAbrirConversa, esquemaEnviarMensagem } from '../validadores/conversa.js';

const roteador = Router();

// Chat: só o aluno e a equipe de apoio. Dentro da conversa, só os dois participantes (o serviço responde 404 aos demais).
roteador.use(autenticar, exigirPapel(PAPEIS.ALUNO, ...PAPEIS_APOIO));

roteador.get('/', limitadorLeituraChat, controlador.listar);
roteador.post('/', limitadorEscrita, corpoJson(), validar({ corpo: esquemaAbrirConversa }), controlador.abrir);

// O front consulta `?depois=<último id>` a cada poucos segundos (polling incremental).
roteador.get(
  '/:id/mensagens',
  limitadorLeituraChat,
  validar({ parametros: parametrosIdEsquema, consulta: consultaMensagens }),
  controlador.lerMensagens
);
roteador.post(
  '/:id/mensagens',
  limitadorMensagens,
  corpoJson(),
  validar({ parametros: parametrosIdEsquema, corpo: esquemaEnviarMensagem }),
  controlador.enviar
);
roteador.post('/:id/lidas', limitadorLeituraChat, validar({ parametros: parametrosIdEsquema }), controlador.marcarComoLidas);

export default roteador;
