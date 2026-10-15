document.documentElement.style.visibility = "hidden";

(async function () {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("cosmos_user") || "null");
  } catch (error) {
    sessionStorage.removeItem("cosmos_user");
  }
  const currentPage = window.location.pathname.split("/").pop();

  function redirectToLogin() {
    window.location.replace(`./login.html?redirect=${encodeURIComponent(currentPage)}`);
  }

  if (!user || !Number.isInteger(Number(user.id)) || Number(user.id) < 1) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch("/usuarios/me", {
      headers: { "X-User-Id": String(user.id) },
    });

    // Só desloga quando o servidor confirma que a sessão é inválida (401/403).
    // Erros transitórios (rede, timeout, 5xx) NÃO devem apagar a sessão —
    // isso causava logout indevido ao navegar entre paginas protegidas.
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("cosmos_user");
      redirectToLogin();
      return;
    }

    // Qualquer outra resposta (ok ou erro transitorio) libera a pagina.
    document.documentElement.style.visibility = "visible";
  } catch (error) {
    // Falha de rede (fetch rejeitado): mantem a sessao e libera a pagina,
    // em vez de deslogar o usuario por um problema momentaneo de conexao.
    document.documentElement.style.visibility = "visible";
  }
})();