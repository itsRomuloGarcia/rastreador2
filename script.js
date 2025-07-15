document.addEventListener("DOMContentLoaded", function () {
  // Elementos DOM
  const docInput = document.getElementById("docInput");
  const searchBtn = document.getElementById("searchBtn");
  const loading = document.getElementById("loading");
  const resultContainer = document.getElementById("resultContainer");
  const notFound = document.getElementById("notFound");
  const themeSwitch = document.getElementById("checkbox");
  const themeText = document.querySelector(".theme-text");

  // URL da API (substitua pela sua URL real)
  const API_URL =
    "https://script.google.com/macros/s/AKfycbyKN_w7D77M0l2fqR0PW0cQsOaHCDxaAR7c6_w3RZ6A2bySLFuFFNh6aP_XC0L090RI-A/exec";

  // ==================== FUNÇÕES PRINCIPAIS ====================

  // Formatação automática de CPF/CNPJ
  docInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length <= 11) {
      // CPF
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ
      value = value
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    e.target.value = value;
  });

  // Validação de documento
  function validateDocument(doc) {
    const cleaned = doc.replace(/\D/g, "");
    return {
      type: cleaned.length === 11 ? "CPF" : "CNPJ",
      isValid: cleaned.length === 11 || cleaned.length === 14,
      cleaned,
    };
  }

  // Busca com Enter
  docInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") searchOrder();
  });

  searchBtn.addEventListener("click", searchOrder);
  themeSwitch.addEventListener("change", toggleTheme);

  // ==================== LÓGICA DE BUSCA ====================

  async function searchOrder() {
    const { type, isValid, cleaned } = validateDocument(docInput.value);

    if (!isValid) {
      Swal.fire({
        icon: "error",
        title: "Documento inválido",
        text: `Digite um ${type} válido (${
          type === "CPF" ? "11" : "14"
        } dígitos)`,
      });
      return;
    }

    showLoading();
    await fetchOrderData(cleaned, type);
  }

  async function fetchOrderData(docNumber, docType) {
    try {
      // Verifica conexão antes de fazer a requisição
      if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet");
      }

      const response = await fetch(
        `${API_URL}?doc=${docNumber}&type=${docType}`,
        {
          redirect: "follow", // Importante para Apps Script
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Tratamento especial para redirecionamento do Google
      if (response.redirected) {
        console.warn("A API foi redirecionada:", response.url);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.warning) {
        showNotFound();
        Swal.fire({
          icon: "info",
          title: "Nenhum pedido encontrado",
          text: data.warning,
        });
        return;
      }

      if (data.length > 0) {
        displayOrderData(data);
      } else {
        showNotFound();
      }
    } catch (error) {
      console.error("Erro detalhado:", error);

      let errorMessage = error.message;
      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Falha ao conectar ao servidor. Verifique:";
        errorMessage += "\n1. Sua conexão com a internet";
        errorMessage += "\n2. Se a URL da API está correta";
        errorMessage += "\n3. Se o serviço Google Apps Script está ativo";
      }

      Swal.fire({
        icon: "error",
        title: "Erro na busca",
        html: `<div style="text-align:left">${errorMessage.replace(
          /\n/g,
          "<br>"
        )}</div>`,
        footer: `<small>Tente novamente mais tarde</small>`,
      });
    } finally {
      hideLoading();
    }
  }

  // ==================== EXIBIÇÃO DE RESULTADOS ====================

  function displayOrderData(orders) {
    resultContainer.innerHTML = "";

    orders.forEach((order) => {
      const orderCard = document.createElement("div");
      orderCard.className = "order-card";
      orderCard.innerHTML = `
        <div class="card mb-3">
          <div class="card-header">
            <h5>Pedido: ${order.pedido || "N/A"}</h5>
            <span class="badge ${getStatusClass(order.status)}">${
        order.status || "N/A"
      }</span>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <p><strong>Razão Social:</strong> ${
                  order.razaoSocial || "N/A"
                }</p>
                <p><strong>Nome Fantasia:</strong> ${
                  order.nomeFantasia || "N/A"
                }</p>
                <p><strong>Marca:</strong> ${order.marca || "N/A"}</p>
              </div>
              <div class="col-md-6">
                <p><strong>Nota Fiscal:</strong> ${
                  order.notaFiscal || "N/A"
                }</p>
                <p><strong>Transportadora:</strong> ${
                  order.transportadora || "N/A"
                }</p>
                <p><strong>Local:</strong> ${order.cidade || "N/A"}/${
        order.uf || "N/A"
      }</p>
              </div>
            </div>
            <hr>
            <div class="dates">
              <p><strong>Data do Pedido:</strong> ${
                formatDate(order.data) || "N/A"
              }</p>
              <div class="row">
                <div class="col-md-4">
                  <p><small>Prev. Saída:</small><br>${
                    formatDate(order.dataPrevSaida) || "N/A"
                  }</p>
                </div>
                <div class="col-md-4">
                  <p><small>Saída Real:</small><br>${
                    formatDate(order.dataRealSaida) || "N/A"
                  }</p>
                </div>
                <div class="col-md-4">
                  <p><small>Entrega Real:</small><br>${
                    formatDate(order.dataEntrega) || "N/A"
                  }</p>
                </div>
              </div>
            </div>
            ${renderComprovante(order.comprovante)}
          </div>
        </div>
      `;
      resultContainer.appendChild(orderCard);
    });

    showResults();
  }

  function renderComprovante(comprovanteUrl) {
    if (!comprovanteUrl)
      return '<p class="text-muted">Comprovante não disponível</p>';

    const fileId = comprovanteUrl.match(/[-\w]{25,}/)?.[0];
    if (!fileId) return '<p class="text-muted">Formato de URL inválido</p>';

    return `
      <div class="comprovante mt-3">
        <h6>Comprovante:</h6>
        <div class="ratio ratio-16x9 mb-2">
          <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                  allow="autoplay" 
                  class="border rounded"></iframe>
        </div>
        <a href="${comprovanteUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
          Abrir comprovante completo
        </a>
      </div>
    `;
  }

  // ==================== FUNÇÕES AUXILIARES ====================

  function formatDate(dateValue) {
    if (!dateValue) return null;

    try {
      // Converte timestamp do Google Sheets ou string de data
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? dateValue
        : date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return dateValue;
    }
  }

  function getStatusClass(status) {
    if (!status) return "bg-secondary";

    status = status.toLowerCase();
    if (status.includes("entreg") || status.includes("concluíd"))
      return "bg-success";
    if (status.includes("transit") || status.includes("rota"))
      return "bg-primary";
    if (status.includes("pendent") || status.includes("aguard"))
      return "bg-warning text-dark";
    if (status.includes("cancel") || status.includes("devolv"))
      return "bg-danger";
    return "bg-secondary";
  }

  // ==================== CONTROLES DE UI ====================

  function showLoading() {
    loading.style.display = "block";
    resultContainer.style.display = "none";
    notFound.style.display = "none";
  }

  function hideLoading() {
    loading.style.display = "none";
  }

  function showResults() {
    resultContainer.style.display = "block";
    notFound.style.display = "none";
  }

  function showNotFound() {
    notFound.style.display = "block";
    resultContainer.style.display = "none";
  }

  // ==================== TEMA ====================

  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeText.textContent = isDark ? "Modo Light" : "Modo Dark";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
      themeSwitch.checked = false;
      themeText.textContent = "Modo Light";
    } else {
      document.body.classList.remove("dark-mode");
      themeSwitch.checked = true;
      themeText.textContent = "Modo Dark";
    }
  }

  // Inicialização
  initTheme();
});
