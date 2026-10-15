(function () {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("cosmos_user") || "null");
  } catch (error) {
    sessionStorage.removeItem("cosmos_user");
  }

  const isLoggedIn = Boolean(user && Number.isInteger(Number(user.id)) && Number(user.id) > 0);
  const nome =
    user && (user.username || user.nome)
      ? String(user.username || user.nome).split(" ")[0]
      : "sair";

  function pageOf(link) {
    try {
      return new URL(link.href, window.location.href).pathname.split("/").pop();
    } catch (error) {
      return "";
    }
  }

  function logout(event) {
    event.preventDefault();
    sessionStorage.removeItem("cosmos_user");
    window.location.href = "./index.html";
  }

  // Links de cada navbar, definidos de forma centralizada e consistente.
  // Deslogado: Início · Login · Cadastro
  // Logado:    Sistema Solar · Viagens Espaciais · Jogo · Comunidade · Perfil · Sair
  const linksDeslogado = [
    { href: "./index.html", text: "Início" },
    { href: "./login.html", text: "Login" },
    { href: "./cadastro.html", text: "Cadastro" },
  ];

  const linksLogado = [
    { href: "./software.html", text: "Sistema Solar" },
    { href: "./viagens.html", text: "Viagens Espaciais" },
    { href: "./jogo.html", text: "Jogo" },
    { href: "./comunidade.html", text: "Comunidade" },
    { href: "./perfil.html", text: "Perfil" },
  ];

  const currentPage = window.location.pathname.split("/").pop();

  document.querySelectorAll(".menu").forEach((menu) => {
    // Reconstroi o menu do zero para garantir consistencia em todas as paginas
    menu.innerHTML = "";

    const items = isLoggedIn ? linksLogado : linksDeslogado;
    items.forEach((item) => {
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.text;
      if (pageOf(a) === currentPage) {
        a.classList.add("active");
      }
      menu.appendChild(a);
    });

    // Botao "Sair (nome)" apenas quando logado
    if (isLoggedIn) {
      const sair = document.createElement("a");
      sair.href = "#";
      sair.id = "logoutLink";
      sair.textContent = `Sair (${nome})`;
      sair.addEventListener("click", logout);
      menu.appendChild(sair);
    }
  });
})();
