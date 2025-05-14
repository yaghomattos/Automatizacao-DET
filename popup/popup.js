document.addEventListener('DOMContentLoaded', function() {
	const executarAcaoBtn = document.getElementById('executarAcaoBtn');
	const statusMessageDiv = document.getElementById('statusMessage');
  
	if (executarAcaoBtn) {
	  executarAcaoBtn.addEventListener('click', function() {
		statusMessageDiv.textContent = 'Processando...';
		statusMessageDiv.style.color = 'black';
  
		chrome.runtime.sendMessage({ action: "executar_acao_exemplo" }, function(response) {
		  if (chrome.runtime.lastError) {
			console.error("Erro ao enviar mensagem do popup:", chrome.runtime.lastError.message);
			statusMessageDiv.textContent = 'Erro: ' + chrome.runtime.lastError.message;
			statusMessageDiv.style.color = 'red';
		  } else if (response && response.status) {
			console.log("Resposta do background:", response.status);
			statusMessageDiv.textContent = response.status;
			if (response.status.toLowerCase().includes("sucesso")) {
			  statusMessageDiv.style.color = 'green';
			} else {
			  statusMessageDiv.style.color = 'orange'; // Para falhas parciais ou avisos
			}
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
  });