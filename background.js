async function lerCNPJsDoCSV() {
	const response = await fetch(chrome.runtime.getURL("empresas.csv"));
	const texto = await response.text();

    const linhas = texto
		.split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    // remove cabeçalho
    const dados = linhas.slice(1).map(linha => {
        const [cnpj, nome, id] = linha.split(";").map(campo => campo.trim());
        return { cnpj, nome, id };
    });

    return dados
}


async function executarParaCNPJ(tabId, cnpj) {
	return new Promise((resolve) => {
		chrome.scripting.executeScript({
			target: { tabId },
			func: execucao,
			args: [cnpj]
		}, (results) => {
			console.log(`CNPJ ${cnpj} executado`, results);
			const result = results?.[0]?.result || {};
			resolve({ cnpj, ...result });
		});
	});
}


function gerarCSV(resultados) {
	const linhas = [["id", "nome", "data", "mensagem"]];
	console.log('resultado', resultados)
	for (const r of resultados) {
		if (r.success && Array.isArray(r.result)) {
            for (const msg of r.result) {
                const data = msg?.data || "";
                const texto = msg?.mensagem || ""
                linhas.push([r.id, r.nome, data, `"${texto}"`]);
            }
        }
	}
	return "\uFEFF" + linhas.map(l => l.join(";")).join("\n");
}

async function gerarRelatorioNaAba(tabId, resultados) {
	const csv = gerarCSV(resultados);
	chrome.scripting.executeScript({
		target: { tabId },
		func: (conteudo) => {
			const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" });
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = "resultado_cnpjs.csv";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		args: [csv]
	});
}

async function lerCNPJsEExecutar() {
	const empresas = await lerCNPJsDoCSV();
	if (!empresas.length) {
		console.warn("Nenhum CNPJ válido encontrado no arquivo.");
		return;
	}

	const tabs = await new Promise(resolve => {
		chrome.tabs.query({ active: true, currentWindow: true }, resolve);
	});

	const activeTab = tabs[0];
	const activeTabId = activeTab.id;

	const resultados = [];

	for (const empresa of empresas) {
		const { cnpj, nome, id } = empresa;
		console.log("Processando:", cnpj, nome, id);
		const resultado = await executarParaCNPJ(activeTabId, cnpj);
		resultados.push({ ...empresa, ...resultado });
		await new Promise(r => setTimeout(r, 5000));
	}

	console.log("Todos os CNPJs foram processados.");
	await gerarRelatorioNaAba(activeTabId, resultados);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "executar_acao_exemplo") {
		console.log("Background: Mensagem 'executar_acao_exemplo' recebida do popup.");

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || tabs.length === 0) {
				console.error("Background: Nenhuma aba ativa encontrada.");
				sendResponse({ status: "Falha: Nenhuma aba ativa." });
				return;
			}
			const activeTab = tabs[0];
			const activeTabId = activeTab.id;

			if (activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://")) && activeTab.url.includes("gov.br")) {
				console.log("Background: Injetando script na aba:", activeTabId, "URL:", activeTab.url);
				lerCNPJsEExecutar().finally(() => sendResponse?.({ status: "Execução em lote finalizada." }));
			} else {
				console.warn("Background: A aba ativa não é uma página DET válida ou acessível. URL:", activeTab.url);
				sendResponse({ status: "Falha: A aba ativa não é uma página DET válida ou a extensão não tem permissão para acessá-la." });
			}
		});
		return true;
	}
});

function execucao(cnpjAlvo) {
	console.log("Script Injetado: Executando robô agora para CNPJ:", cnpjAlvo);

	if (document.body) {
		const trocar_perfil = document.getElementsByClassName("is-secondary br-button");
		if (trocar_perfil) {
			trocar_perfil[0].click()

			async function selecionarOpcaoEInserirCnpj(cnpjAlvo) {

				// --- Constantes ---
				const MAX_TENTATIVAS_POLLING = 10;
				const INTERVALO_POLLING_MS = 100;
				const DELAY_ESTADO_POS_INTERACAO_MS = 300;
				const DELAY_PAINEL_OPCOES_MS = 200;
				const DELAY_POS_SCROLL_MS = 200;
				const DELAY_POS_FOCO_MS = 100;
				const DELAY_ENTRE_EVENTOS_MS = 100;
				const DELAY_ANTES_CLIQUE_FINAL_MS = 200;

				const SELECTOR_BR_SELECT_PERFIL_FC = 'br-select[formcontrolname="perfil"]';
				const SELECTOR_BR_SELECT_GENERICO = 'br-select';
				const SELECTOR_LABEL_PERFIL_TEXTO = 'label span.texto';
				const SELECTOR_NG_SELECT_INTERNO = 'ng-select';
				const SELECTOR_INPUT_COMBOBOX = "input[role='combobox']";
				const SELECTOR_ARROW_WRAPPER = ".ng-arrow-wrapper";
				const SELECTOR_VALUE_CONTAINER = ".ng-value-container";
				const SELECTOR_DROPDOWN_PANEL = "ng-dropdown-panel";
				const SELECTOR_PAINEL_VISIVEL_A = "ng-select.ng-select-opened ng-dropdown-panel[style*='opacity: 1']";
				const SELECTOR_PAINEL_VISIVEL_B_NGSELECT = "ng-select.ng-select-opened, ng-select[aria-expanded='true']";
				const SELECTOR_PAINEL_VISIVEL_C_OPCOES = "ng-dropdown-panel div.ng-dropdown-panel-items div.ng-option";
				const SELECTOR_OPCAO_SPAN = "div.ng-dropdown-panel-items div.ng-option > span.ng-option-label";
				const SELECTOR_OPCAO_DIV_CONTAINER = "div.ng-option";
				const SELECTOR_BR_INPUT_CNPJ_FC = 'br-input[formcontrolname="niRepresentado"]';
				const SELECTOR_INPUT_CNPJ_PLACEHOLDER = 'input[placeholder="Informe CNPJ ou CPF"]';
				const SELECTOR_BOTAO_SELECIONAR_PRIMARIO = 'button.br-button.is-primary';

				const TEXTO_LABEL_PERFIL = "Perfil";
				const TEXTO_OPCAO_PROCURADOR = "Procurador";
				const TEXTO_BOTAO_SELECIONAR = "Selecionar";

				// --- Funções Auxiliares ---
				const sleep = (ms) => new Promise(r => setTimeout(r, ms));

				const isPanelVisivel = (panelElement) => {
					if (!panelElement) return false;
					try {
						const cs = window.getComputedStyle(panelElement);
						return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && cs.height !== '0px';
					} catch (e) { return false; } // Pode dar erro se o elemento for removido durante a checagem
				};

				const getNgSelectState = (ngSelectElement) => {
					if (!ngSelectElement) return { ngSelectClasses: 'N/A', inputAriaExpanded: 'N/A', panelExists: false, isPanelVisibleComputed: false };
					const inputElement = ngSelectElement.querySelector(SELECTOR_INPUT_COMBOBOX);
					const panelElement = ngSelectElement.querySelector(SELECTOR_DROPDOWN_PANEL);
					const panelVisible = isPanelVisivel(panelElement);
					return {
						ngSelectClasses: ngSelectElement.className,
						inputAriaExpanded: inputElement ? inputElement.getAttribute('aria-expanded') : 'N/A',
						panelExists: !!panelElement,
						isPanelVisibleComputed: panelVisible
					};
				};

				const abrirDropdownPerfil = async (brSelectElement) => {
					const ngSelectInterno = brSelectElement.querySelector(SELECTOR_NG_SELECT_INTERNO);
					if (!ngSelectInterno) return { success: false, message: "<ng-select> interno não localizado.", stateBefore: null, stateAfter: null };

					const stateBefore = getNgSelectState(ngSelectInterno);
					if (stateBefore.isPanelVisible && (stateBefore.ngSelectClasses.includes('ng-select-opened') || stateBefore.inputAriaExpanded === 'true')) {
						return { success: true, alreadyOpen: true, stateBefore: stateBefore, stateAfter: stateBefore };
					}

					const inputElement = ngSelectInterno.querySelector(SELECTOR_INPUT_COMBOBOX);
					let interactionSuccess = false;
					if (inputElement) {
						try {
							if (typeof inputElement.focus === 'function') inputElement.focus();
							await sleep(DELAY_POS_FOCO_MS);
							inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
							await sleep(DELAY_ENTRE_EVENTOS_MS);
							inputElement.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true }));
							interactionSuccess = true;
						} catch (e) { interactionSuccess = false; }
					} else { interactionSuccess = false; }

					await sleep(DELAY_ESTADO_POS_INTERACAO_MS);
					const stateAfterInteraction = getNgSelectState(ngSelectInterno);
					return { success: interactionSuccess, alreadyOpen: false, method: "KeyboardEvents", stateBefore: stateBefore, stateAfter: stateAfterInteraction };
				};

				const encontrarPainelOpcoesVisivel = () => {
					let painel = document.querySelector(SELECTOR_PAINEL_VISIVEL_A);
					if (isPanelVisivel(painel)) return painel;

					const ngSelectsAtivos = document.querySelectorAll(SELECTOR_PAINEL_VISIVEL_B_NGSELECT);
					for (const ngSelect of ngSelectsAtivos) {
						const tempPanel = ngSelect.querySelector(SELECTOR_DROPDOWN_PANEL);
						if (isPanelVisivel(tempPanel)) return tempPanel;
					}

					const todosOsPaineisComOpcoes = document.querySelectorAll(SELECTOR_PAINEL_VISIVEL_C_OPCOES);
					if (todosOsPaineisComOpcoes.length > 0) {
						const primeiroPainel = todosOsPaineisComOpcoes[0].closest(SELECTOR_DROPDOWN_PANEL);
						if (isPanelVisivel(primeiroPainel)) return primeiroPainel;
					}
					return null;
				};

				const clicarNaOpcaoProcurador = () => {
					return new Promise(async (resolve) => {
						await sleep(DELAY_PAINEL_OPCOES_MS);
						const painelVisivel = encontrarPainelOpcoesVisivel();
						if (!painelVisivel) { resolve({ success: false, message: "Painel de opções não encontrado/visível." }); return; }

						const spansDasOpcoes = painelVisivel.querySelectorAll(SELECTOR_OPCAO_SPAN);
						let divOpcaoAlvo = null;
						for (const spanOpcao of spansDasOpcoes) { if (spanOpcao.textContent && spanOpcao.textContent.trim() === TEXTO_OPCAO_PROCURADOR) { divOpcaoAlvo = spanOpcao.closest(SELECTOR_OPCAO_DIV_CONTAINER); break; } }

						if (divOpcaoAlvo) {
							if (typeof divOpcaoAlvo.scrollIntoView === 'function') { divOpcaoAlvo.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' }); }
							await sleep(DELAY_POS_SCROLL_MS);
							if (typeof divOpcaoAlvo.click === 'function') {
								try { divOpcaoAlvo.click(); resolve({ success: true, message: `Opção '${TEXTO_OPCAO_PROCURADOR}' clicada.` }); }
								catch (e) { resolve({ success: false, error: "Erro ao clicar: " + e.message, message: "Falha no clique da opção." }); }
							} else { resolve({ success: false, error: "Opção não clicável.", message: "Erro: Opção encontrada mas não clicável." }); }
						} else { resolve({ success: false, message: `Opção '${TEXTO_OPCAO_PROCURADOR}' não encontrada.` }); }
					});
				};

				const inserirCnpj = async (cnpjValue) => {
					let inputCnpj = null; let tentativasInput = 0;
					while (tentativasInput < MAX_TENTATIVAS_POLLING && !inputCnpj) {
						const brInputWrapper = document.querySelector(SELECTOR_BR_INPUT_CNPJ_FC);
						if (brInputWrapper) inputCnpj = brInputWrapper.querySelector(SELECTOR_INPUT_CNPJ_PLACEHOLDER);
						if (inputCnpj) break;
						tentativasInput++;
						if (tentativasInput < MAX_TENTATIVAS_POLLING) await sleep(INTERVALO_POLLING_MS);
					}
					if (inputCnpj) {
						try {
							if (typeof inputCnpj.focus === 'function') inputCnpj.focus();
							await sleep(DELAY_POS_FOCO_MS);
							inputCnpj.value = cnpjValue;
							inputCnpj.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); await sleep(DELAY_ENTRE_EVENTOS_MS);
							inputCnpj.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); await sleep(DELAY_ENTRE_EVENTOS_MS);
							inputCnpj.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
							return { success: true, message: "CNPJ inserido." };
						} catch (e) { return { success: false, error: e.message, message: "Erro ao inserir CNPJ." }; }
					} else { return { success: false, message: "Campo CNPJ não encontrado." }; }
				};

				const clicarBotaoSelecionar = async () => {
					let botaoAlvo = null;
					// Tenta encontrar o botão primário com o texto específico
					let botoes = document.querySelectorAll(SELECTOR_BOTAO_SELECIONAR_PRIMARIO);
					for (const botao of botoes) {
						if (botao.textContent && botao.textContent.trim() === TEXTO_BOTAO_SELECIONAR) {
							botaoAlvo = botao;
							break;
						}
					}

					// Fallback: Tenta qualquer br-button com o texto (caso a classe 'is-primary' mude ou não seja a única)
					if (!botaoAlvo) {
						botoes = document.querySelectorAll('button.br-button');
						for (const botao of botoes) {
							if (botao.textContent && botao.textContent.trim() === TEXTO_BOTAO_SELECIONAR) {
								botaoAlvo = botao;
								break;
							}
						}
					}

					// Fallback mais geral: qualquer botão com o texto
					if (!botaoAlvo) {
						botoes = document.querySelectorAll('button');
						for (const botao of botoes) {
							if (botao.textContent && botao.textContent.trim() === TEXTO_BOTAO_SELECIONAR) {
								botaoAlvo = botao;
								break;
							}
						}
					}

					if (botaoAlvo) {
						if (typeof botaoAlvo.click === 'function') {
							try {
								// Adiciona um pequeno delay antes do clique final, caso a UI precise de um momento
								// após o preenchimento do CNPJ e seus eventos.
								await sleep(DELAY_ANTES_CLIQUE_FINAL_MS);
								botaoAlvo.click();
								return { success: true, message: `Botão '${TEXTO_BOTAO_SELECIONAR}' clicado.` };
							} catch (e) {
								return { success: false, error: "Erro ao clicar: " + e.message, message: `Falha no clique do botão '${TEXTO_BOTAO_SELECIONAR}'.` };
							}
						} else {
							return { success: false, error: "Botão não é clicável.", message: `Erro: Botão '${TEXTO_BOTAO_SELECIONAR}' encontrado mas não é clicável.` };
						}
					} else {
						return { success: false, message: `Botão '${TEXTO_BOTAO_SELECIONAR}' não encontrado na página.` };
					}
				};

				async function esperarElementoSumir(seletor, { timeout = 10000 } = {}) {
					return new Promise((resolve, reject) => {
						const intervalo = 100;
						let tempoDecorrido = 0;

						const checar = () => {
							const elemento = document.querySelector(seletor);
							const aindaVisivel = elemento && (
								elemento.offsetWidth > 0 ||
								elemento.offsetHeight > 0 ||
								elemento.getClientRects().length > 0
							);

							if (!elemento || !aindaVisivel) {
								resolve();
							} else if (tempoDecorrido >= timeout) {
								reject(new Error(`O modal "${seletor}" ainda está visível após ${timeout}ms.`));
							} else {
								tempoDecorrido += intervalo;
								setTimeout(checar, intervalo);
							}
						};

						checar();
					});
				}

				async function clicarCaixaPostal() {
					const itemCaixaPostal = Array.from(document.querySelectorAll('.cardListItem')).find(item => {
						const titulo = item.querySelector('.title');
						return titulo && titulo.textContent.trim() === 'CAIXA POSTAL';
					});

					if (itemCaixaPostal) {
						const clickElement = itemCaixaPostal.querySelector('div');
						if (clickElement) {
							clickElement.click();
							console.log('Clique realizado na Caixa Postal!');
						} else {
							console.log('Elemento clicável não encontrado.');
						}
					} else {
						console.log('Caixa Postal não encontrada.');
					}
				}

				async function clicarBotaoInicio() {
					const botaoInicio = Array.from(document.querySelectorAll('a.br-button.circle')).find(botao => {
						return botao.getAttribute('aria-label') === 'Início';
					});

					if (botaoInicio) {
						if (typeof botaoInicio.click === 'function') {
							botaoInicio.click();
							console.log('Clique realizado no botão "Início"!');
						} else {
							console.warn('Elemento "Início" encontrado, mas não é clicável.');
						}
					} else {
						console.warn('Botão "Início" não encontrado na página.');
					}
				}

				async function extrairHoraEMensagem() {
					const linhas = document.querySelectorAll('.tabela.mensagens .linha');
					if (!linhas.length) {
						console.warn("Nenhuma linha de mensagem encontrada.");
						return [];
					}

					const mensagensRecentes = [];
					const hoje = new Date();

					for (const linha of linhas) {
						const dataSpan = linha.querySelector('.hora span');
						const tituloSpan = linha.querySelector('.titulo span');

						const dataTexto = dataSpan?.textContent?.trim();
						const mensagem = tituloSpan?.textContent?.trim();

						if (!dataTexto || !mensagem) continue;

						// Parse manual da data no formato "22 abr 25"
						const [diaStr, mesStr, anoStr] = dataTexto.split(' ');
						const meses = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
						const dia = parseInt(diaStr, 10);
						const mes = meses[mesStr.toLowerCase()];
						const ano = 2000 + parseInt(anoStr, 10); // Assume formato 2 dígitos

						if (isNaN(dia) || isNaN(mes) || isNaN(ano)) {
							console.error("Data inválida:", dataTexto); // Ou tratar o erro
						}

						const dataMensagem = new Date(ano, mes, dia);

						const primeiroDiaDoMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
						primeiroDiaDoMesAnterior.setHours(0, 0, 0, 0);

						const umMesAtras = new Date();
						umMesAtras.setMonth(umMesAtras.getMonth() - 1);

						if (dataMensagem >= primeiroDiaDoMesAnterior && dataMensagem <= hoje) {
							mensagensRecentes.push({
								data: dataTexto,
								mensagem
							});
						}
					}

					return mensagensRecentes;
				}
				// 	return { data, mensagem };
				// }

				async function fecharModal() {
					const modal = document.querySelector('modal-container.modal.show');
					const botaoFechar = modal?.querySelector('button[aria-label="Fechar"]');

					if (botaoFechar && typeof botaoFechar.click === 'function') {
						try {
							botaoFechar.scrollIntoView({ block: "center" });
							await sleep(300);
							botaoFechar.click();
							console.log("Clique no botão 'Fechar' realizado com sucesso.");
							await sleep(1000);
						} catch (erro) {
							console.warn("Erro ao tentar clicar em 'Fechar':", erro.message);
						}
					} else {
						console.warn("Botão 'Fechar' não encontrado ou inacessível.");
					}
				}

				// --- LÓGICA PRINCIPAL ORQUESTRADA ---
				let brSelectPerfil = null;
				for (let i = 0; i < MAX_TENTATIVAS_POLLING; i++) {
					brSelectPerfil = document.querySelector(SELECTOR_BR_SELECT_PERFIL_FC);
					if (brSelectPerfil) break;
					const todosBrSelects = document.querySelectorAll(SELECTOR_BR_SELECT_GENERICO);
					if (todosBrSelects.length > 0) {
						for (const brSelect of todosBrSelects) {
							const label = brSelect.querySelector(SELECTOR_LABEL_PERFIL_TEXTO);
							if (label && label.textContent && label.textContent.trim() === TEXTO_LABEL_PERFIL) {
								brSelectPerfil = brSelect; break;
							}
						}
					}
					if (brSelectPerfil) break;
					if (i < MAX_TENTATIVAS_POLLING - 1) await sleep(INTERVALO_POLLING_MS);
				}

				if (!brSelectPerfil) {
					return { success: false, stage: 'find_select', message: `Componente '${TEXTO_LABEL_PERFIL}' não encontrado.` };
				}

				// Tentar abrir o dropdown
				const resultadoAbertura = await abrirDropdownPerfil(brSelectPerfil);
				let dropdownAbriu = false;
				if (resultadoAbertura.success !== false) {
					if (resultadoAbertura.alreadyOpen) { dropdownAbriu = true; }
					else if (resultadoAbertura.stateAfter && resultadoAbertura.stateAfter.isPanelVisibleComputed) { dropdownAbriu = true; }
					else if (resultadoAbertura.stateAfter && ((resultadoAbertura.stateAfter.ngSelectClasses || "").includes('ng-select-opened') || resultadoAbertura.stateAfter.inputAriaExpanded === 'true')) { dropdownAbriu = true; } // Fallback check
				}

				if (!dropdownAbriu) {
					return { success: false, stage: 'open_dropdown', message: "Não foi possível abrir/confirmar dropdown 'Perfil'." };
				}

				// Clicar na opção 'Procurador'
				const resultadoSelecao = await clicarNaOpcaoProcurador();
				if (!resultadoSelecao.success) {
					return { success: false, stage: 'select_option', message: resultadoSelecao.message };
				}

				// Inserir o CNPJ (passado como argumento para a função principal)
				const resultadoCnpj = await inserirCnpj(cnpjAlvo);
				if (!resultadoCnpj.success) {
					return { success: false, stage: 'input_cnpj', message: resultadoCnpj.message };
				}

				// Selecionar o CNPJ 
				const resultadoCliqueFinal = await clicarBotaoSelecionar();
				if (!resultadoCliqueFinal.success) {
					resolve({ success: false, stage: 'click_final_button', message: resultadoCliqueFinal.message, details: resultadoCliqueFinal });
					return;
				}

				// Acessar Caixa Postal
				try {
					await esperarElementoSumir("modal-container.modal.show", { timeout: 10000 })
					await sleep(2000);
					await clicarCaixaPostal();
				} catch (e) {
					console.warn("Modal não sumiu dentro do tempo esperado:", e.message);
					await sleep(2000);
					await fecharModal();
					await sleep(2000);
					return { success: false, stage: 'espera_modal', message: e.message };
				}

				// Extrair informacoes
				await sleep(2000);
				const resultado = await extrairHoraEMensagem();
				await sleep(2000);

				// Voltar a home
				await sleep(2000);
				await clicarBotaoInicio();
				await sleep(2000);

				return { success: true, stage: 'complete', message: "Processo concluído com sucesso!", result: resultado };
			}

			return selecionarOpcaoEInserirCnpj(cnpjAlvo)

			// return { message: "Perfil Trocado!" };
		} else {
			return { message: "Mensagem de feedback adicionada (Trocar Perfil não encontrado para modificar)." };
		}
	} else {
		return { error: "document.body não foi encontrado na página.", message: "Falha ao executar ação: document.body não encontrado." };
	}
}