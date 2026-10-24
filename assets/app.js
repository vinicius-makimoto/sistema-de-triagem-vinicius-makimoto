const patientStorageKey = "ps_escola_pacientes";
const triageStorageKey = "ps_escola_triagens";
const attendedStorageKey = "ps_escola_atendidos";

const screenTitles = {
  cadastro: "Cadastro de paciente",
  triagem: "Determinação de triagem",
  fila: "Fila do pronto socorro",
  atendidos: "Pacientes atendidos"
};

const priorityLabels = {
  branco: "Branco",
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho"
};

const priorityColor = {
  branco: "#dbeafe",
  verde: "#51b56d",
  amarelo: "#f0b83c",
  vermelho: "#d94444"
};

const demoUsername = "recepcao";
const demoPassword = "triagem123";
const demoSessionKey = "ps_escola_demo_authenticated";

class NavigationController {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
  }

  init() {
    this.dom.navTabs.forEach((tab) => {
      tab.addEventListener("click", () => this.setScreen(tab.dataset.screen));
    });
  }

  setScreen(screen) {
    this.state.activeScreen = screen;
    this.dom.screenTitle.textContent = screenTitles[screen];
    this.dom.navTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.screen === screen);
    });
    this.dom.screens.forEach((section) => {
      section.classList.toggle("active", section.id === screen);
    });
  }
}

class DashboardController {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
  }

  init() {
    this.updateClock();
    window.setInterval(() => this.updateClock(), 30000);
  }

  updateClock() {
    const now = new Date();
    this.dom.shiftClock.textContent = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  renderCounters() {
    this.dom.patientCount.textContent = this.state.patients.length;
    this.dom.waitingCount.textContent = this.state.triages.length;
    this.dom.criticalCount.textContent = this.state.triages.filter((item) => item.classification === "vermelho").length;
    const triagedPatientIds = new Set(this.state.triages.map((triage) => triage.patientId));
    this.dom.awaitingTriageCount.textContent = this.state.patients.filter((patient) =>
      !patient.triaged && !triagedPatientIds.has(patient.id)).length;
    this.dom.attendedCount.textContent = new Set(this.state.attended.map((record) => record.patientId)).size;
  }
}

class TriageApp {
  constructor() {
    this.state = new AppState(patientStorageKey, triageStorageKey, attendedStorageKey);
    this.dom = this.createDomMap();
    this.navigation = new NavigationController(this.state, this.dom);
    this.dashboard = new DashboardController(this.state, this.dom);
    this.registration = new PatientRegistration(this.state, this.dom, {
      showMessage: (target, message) => this.showMessage(target, message),
      renderAll: () => this.renderAll(),
      setScreen: (screen) => this.navigation.setScreen(screen)
    });
    this.triage = new TriageController(this.state, this.dom, {
      showMessage: (target, message) => this.showMessage(target, message),
      renderAll: () => this.renderAll()
    }, priorityLabels);
    this.queue = new QueueController(this.state, this.dom, priorityLabels, priorityColor, {
      renderAll: () => this.renderAll(),
      showMessage: (message) => this.showMessage(null, message)
    });
  }

  createDomMap() {
    return {
      loginScreen: document.getElementById("loginScreen"),
      loginForm: document.getElementById("loginForm"),
      loginUsername: document.getElementById("loginUsername"),
      loginPassword: document.getElementById("loginPassword"),
      loginMessage: document.getElementById("loginMessage"),
      appShell: document.getElementById("appShell"),
      logoutButton: document.getElementById("logoutButton"),
      screenTitle: document.getElementById("screenTitle"),
      navTabs: document.querySelectorAll(".nav-tab"),
      screens: document.querySelectorAll(".screen"),
      shiftClock: document.getElementById("shiftClock"),
      patientForm: document.getElementById("patientForm"),
      clearPatientForm: document.getElementById("clearPatientForm"),
      patientMessage: document.getElementById("patientMessage"),
      age: document.getElementById("age"),
      insuranceName: document.getElementById("insuranceName"),
      insuranceValidUntil: document.getElementById("insuranceValidUntil"),
      insurancePlan: document.getElementById("insurancePlan"),
      patientSearch: document.getElementById("patientSearch"),
      patientList: document.getElementById("patientList"),
      cep: document.getElementById("cep"),
      cepMessage: document.getElementById("cepMessage"),
      address: document.getElementById("address"),
      neighborhood: document.getElementById("neighborhood"),
      city: document.getElementById("city"),
      state: document.getElementById("state"),
      triageForm: document.getElementById("triageForm"),
      clearTriageForm: document.getElementById("clearTriageForm"),
      triageMessage: document.getElementById("triageMessage"),
      triagePatient: document.getElementById("triagePatient"),
      patientSummary: document.getElementById("patientSummary"),
      vitalPreview: document.getElementById("vitalPreview"),
      suggestRisk: document.getElementById("suggestRisk"),
      riskSuggestion: document.getElementById("riskSuggestion"),
      queueBoard: document.getElementById("queueBoard"),
      attendedBoard: document.getElementById("attendedBoard"),
      callNext: document.getElementById("callNext"),
      patientCount: document.getElementById("patientCount"),
      criticalCount: document.getElementById("criticalCount"),
      waitingCount: document.getElementById("waitingCount"),
      awaitingTriageCount: document.getElementById("awaitingTriageCount"),
      attendedCount: document.getElementById("attendedCount")
    };
  }

  init() {
    this.dom.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.dom.loginUsername.value === demoUsername && this.dom.loginPassword.value === demoPassword) {
        sessionStorage.setItem(demoSessionKey, "true");
        this.dom.loginForm.reset();
        this.dom.loginMessage.textContent = "";
        this.setAuthenticated(true);
        return;
      }
      this.showMessage(this.dom.loginMessage, "Usuário ou senha incorretos.");
      this.dom.loginPassword.value = "";
    });
    this.dom.logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem(demoSessionKey);
      this.state.selectedPatientId = "";
      this.navigation.setScreen("cadastro");
      this.setAuthenticated(false);
    });
    this.navigation.init();
    this.dom.loginForm.addEventListener("invalid", (event) => this.showValidationAlert(event), true);
    this.dom.patientForm.addEventListener("invalid", (event) => this.showValidationAlert(event), true);
    this.dom.triageForm.addEventListener("invalid", (event) => this.showValidationAlert(event), true);
    this.dashboard.init();
    this.registration.init();
    this.triage.init();
    this.queue.init();
    this.renderAll();
    this.setAuthenticated(sessionStorage.getItem(demoSessionKey) === "true");
  }

  setAuthenticated(authenticated) {
    this.dom.loginScreen.hidden = authenticated;
    this.dom.appShell.hidden = !authenticated;
    if (!authenticated) {
      this.dom.loginUsername.focus();
    }
  }

  showMessage(target, message) {
    if (!window.Swal) {
      if (target) {
        target.textContent = message;
      } else {
        const fallbackMessage = document.createElement("p");
        fallbackMessage.className = "form-message";
        fallbackMessage.setAttribute("role", "alert");
        fallbackMessage.textContent = message;
        this.dom.queueBoard.prepend(fallbackMessage);
      }
      return;
    }
    const isError = /inválid|incorret|preencha|informe|falha|não foi possível|indisponível/i.test(message);
    window.Swal.fire({
      title: isError ? "Verifique os dados" : "Tudo certo",
      text: message,
      icon: isError ? "warning" : "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#2f80d8"
    });
  }

  showValidationAlert(event) {
    if (!window.Swal) {
      return;
    }
    event.preventDefault();
    if (window.Swal.isVisible()) {
      return;
    }
    const field = event.target;
    const validity = field.validity;
    let message = field.validationMessage;

    if (validity.customError) {
      message = field.validationMessage;
    } else if (validity.valueMissing) {
      const label = field.closest("label")?.querySelector("span")?.textContent.trim();
      message = label ? `O campo ${label} é obrigatório.` : "Preencha este campo obrigatório.";
    } else if (field.id === "insuranceValidUntil" && validity.patternMismatch) {
      message = "Informe a validade no formato MM/AAAA.";
    } else if (field.id === "insuranceValidUntil") {
      message = "A validade do convênio não pode ser anterior ao mês e ano atuais.";
    } else if (validity.rangeUnderflow) {
      message = field.id === "age"
        ? "A idade não pode ser negativa."
        : "O valor informado está abaixo do mínimo permitido.";
    } else if (validity.rangeOverflow) {
      message = field.id === "age"
        ? "A idade não pode ser maior que 130 anos."
        : "O valor informado ultrapassa o máximo permitido.";
    } else if (validity.patternMismatch) {
      const label = field.closest("label")?.querySelector("span")?.textContent.trim();
      message = label ? `Confira o formato do campo ${label}.` : "Confira o formato do valor informado.";
    } else if (!message || /please|enter|fill out|select/i.test(message)) {
      message = "Confira o valor informado e tente novamente.";
    }

    window.Swal.fire({
      title: "Confira o campo",
      text: message,
      icon: "warning",
      confirmButtonText: "Entendi",
      confirmButtonColor: "#2f80d8"
    });
  }

  renderAll() {
    this.dashboard.renderCounters();
    this.registration.render();
    this.triage.renderPatientOptions();
    this.triage.renderPatientSummary();
    this.triage.renderVitalPreview();
    this.queue.render();
    this.queue.renderAttended();
  }
}

const app = new TriageApp();
app.init();
