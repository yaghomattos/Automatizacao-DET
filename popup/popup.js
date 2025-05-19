document.addEventListener('DOMContentLoaded', function () {
	const executarAcaoBtn = document.getElementById('executarAcaoBtn');
	const statusMessageDiv = document.getElementById('statusMessage');
	const csvFileInput = document.getElementById('csvFile');

	let empresasData = [];
	let paginaValida = false;
	let arquivoValido = false;

	function atualizarEstadoBotao() {
		const fileMessageDiv = document.getElementById('fileMessage');
		const paginaMessageDiv = document.getElementById('paginaMessage');
		const statusMessageDiv = document.getElementById('statusMessage');

		fileMessageDiv.textContent = '';
		paginaMessageDiv.textContent = '';
		fileMessageDiv.className = 'validation-message';
		paginaMessageDiv.className = 'validation-message';
		statusMessageDiv.textContent = '';

		if (!paginaValida) {
			paginaMessageDiv.textContent = "Você deve estar logado na página de serviços do DET.";
			paginaMessageDiv.classList.add("error");
		} else {
			paginaMessageDiv.textContent = "✔ Você está logado!";
			paginaMessageDiv.classList.add("success");
		}

		if (!arquivoValido) {
			fileMessageDiv.textContent = "Selecione um arquivo .csv válido contendo os CNPJs.";
			fileMessageDiv.classList.add("error");
		} else {
			fileMessageDiv.textContent = "✔ Arquivo carregado com sucesso.";
			fileMessageDiv.classList.add("success");
		}

		if (paginaValida && arquivoValido) {
			statusMessageDiv.textContent = "✅ Pronto para iniciar.";
			statusMessageDiv.style.color = 'green';
		}

		executarAcaoBtn.disabled = !(paginaValida && arquivoValido);
	}


	function verificarPaginaAtiva() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const tab = tabs[0];
			if (tab?.url?.includes("/servicos") && !tab.url.includes("/login")) {
				paginaValida = true;
			} else {
				paginaValida = false;
			}
			atualizarEstadoBotao();
		});
	}

	if (csvFileInput) {
		csvFileInput.addEventListener('change', (event) => {
			const file = event.target.files[0];
			if (!file || !file.name.endsWith('.csv')) {
				arquivoValido = false;
				atualizarEstadoBotao();
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				const text = e.target.result;
				const linhas = text.split('\n').map(l => l.trim()).filter(Boolean);
				empresasData = linhas.slice(1).map(linha => {
					const [cnpj, nome, id] = linha.split(';').map(campo => campo.trim());
					return { cnpj, nome, id };
				});

				chrome.storage.local.set({ empresasCsv: empresasData }, () => {
					arquivoValido = true;
					atualizarEstadoBotao();
				});
			};
			reader.readAsText(file);
		});
	}

	if (executarAcaoBtn) {
		executarAcaoBtn.addEventListener('click', function () {
			statusMessageDiv.textContent = 'Processando...';
			statusMessageDiv.style.color = 'black';

			chrome.runtime.sendMessage({ action: "executar_acao_exemplo" }, function (response) {
				if (chrome.runtime.lastError) {
					console.error("Erro ao enviar mensagem do popup:", chrome.runtime.lastError.message);
					statusMessageDiv.textContent = 'Erro: ' + chrome.runtime.lastError.message;
					statusMessageDiv.style.color = 'red';
				} else if (response && response.status) {
					console.log("Resposta do background:", response.status);
					statusMessageDiv.textContent = response.status;
					statusMessageDiv.style.color = response.status.toLowerCase().includes("sucesso") ? 'green' : 'orange';
				} else {
					statusMessageDiv.textContent = 'Resposta inesperada ou nula do background script.';
					statusMessageDiv.style.color = 'red';
				}
			});
		});
	} else {
		console.error("Botão 'executarAcaoBtn' não encontrado no popup.");
		statusMessageDiv.textContent = "Erro interno no popup (botão não encontrado).";
		statusMessageDiv.style.color = 'red';
	}

	verificarPaginaAtiva();
	atualizarEstadoBotao();
});
