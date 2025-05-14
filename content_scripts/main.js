console.log("Extensão: Script (main.js) carregado.");

// Verifica se estamos na página correta (opcional, mas bom para robustez)
if (window.location.href.includes("https://det.sit.trabalho.gov.br/")) {
    let campoNome = document.getElementById("searchtext-input");
    if (campoNome) {
        campoNome.value = "Dados a serem preenchidos";
    }

    let botaoEnviar = document.querySelector("button[type='submit']");
    if (botaoEnviar) {
        console.log("Botão de enviar encontrado, pronto para clicar.");
		// botaoEnviar.click();
    }
}