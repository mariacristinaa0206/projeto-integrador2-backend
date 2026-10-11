export function serializarVinculo(vinculo) {
  return {
    id: vinculo.id,
    status: vinculo.status,
    origem: vinculo.origem,
    aluno: {
      id: vinculo.aluno.id,
      nome: vinculo.aluno.nome,
      turma: vinculo.aluno.aluno?.turma ?? null,
      nivelEnsino: vinculo.aluno.aluno?.nivelEnsino ?? null
    },
    profissional: { id: vinculo.profissional.id, nome: vinculo.profissional.nome, papel: vinculo.profissional.papel },
    criadoEm: vinculo.criadoEm.toISOString(),
    encerradoEm: vinculo.encerradoEm?.toISOString() ?? null
  };
}
