export function calcularDeslocamento({ pagina, limite }) {
  return { pular: (pagina - 1) * limite, tomar: limite };
}

export function respostaPaginada(itens, total, { pagina, limite }) {
  return { itens, total, pagina, limite, totalPaginas: Math.max(1, Math.ceil(total / limite)) };
}
