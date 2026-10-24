class TriageController {
  constructor(state, dom, callbacks, priorityLabels) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.priorityLabels = priorityLabels;
  }

  init() {
    this.dom.triagePatient.addEventListener("change", () => this.selectPatient());
    ["bloodPressure", "temperature", "oxygen", "heartRate"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => this.renderVitalPreview());
    });
    this.initVitalMasks();
    this.dom.suggestRisk.addEventListener("click", () => this.suggestRisk());
    this.dom.triageForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearTriageForm.addEventListener("click", () => this.reset());
  }

  initVitalMasks() {
    if (!window.jQuery) {
      return;
    }
    const $ = window.jQuery;

    $("#bloodPressure").on("input", (event) => {
      const input = event.currentTarget;
      const digits = input.value.replace(/\D/g, "").slice(0, 6);
      const firstThree = Number(digits.slice(0, 3));
      const systolicLength = digits.length >= 3 && (firstThree < 50 || firstThree > 300) ? 2 : 3;
      input.value = digits.length > systolicLength
        ? `${digits.slice(0, systolicLength)}/${digits.slice(systolicLength, systolicLength + 3)}`
        : digits;
    });

    $("#temperature").on("input", (event) => {
      const input = event.currentTarget;
      const raw = input.value.replace(/[^\d,.]/g, "");
      const separatorIndex = raw.search(/[,.]/);
      if (separatorIndex >= 0) {
        const integer = raw.slice(0, separatorIndex).replace(/\D/g, "").slice(0, 2);
        const fraction = raw.slice(separatorIndex + 1).replace(/\D/g, "").slice(0, 1);
        input.value = fraction ? `${integer},${fraction}` : `${integer},`;
      } else {
        const digits = raw.replace(/\D/g, "").slice(0, 3);
        input.value = digits.length === 3 ? `${digits.slice(0, 2)},${digits.slice(2)}` : digits;
      }
    });

    ["#oxygen", "#heartRate"].forEach((selector) => {
      $(selector).on("input", (event) => {
        event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 3);
      });
    });
  }

  selectPatient() {
    this.state.selectedPatientId = this.dom.triagePatient.value;
    this.renderPatientSummary();
  }

  parseBloodPressure(value) {
    const match = String(value).match(/^\s*(\d{2,3})\s*[/-]\s*(\d{2,3})\s*$/);
    if (!match) {
      return null;
    }
    const systolic = Number(match[1]);
    const diastolic = Number(match[2]);
    if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200) {
      return null;
    }
    return { systolic, diastolic };
  }

  getValidatedVitals() {
    const pressure = this.parseBloodPressure(document.getElementById("bloodPressure").value);
    const temperatureValue = document.getElementById("temperature").value;
    const oxygenValue = document.getElementById("oxygen").value;
    const heartRateValue = document.getElementById("heartRate").value;
    const temperature = temperatureValue === "" ? NaN : Number(temperatureValue.replace(",", "."));
    const oxygen = oxygenValue === "" ? NaN : Number(oxygenValue);
    const heartRate = heartRateValue === "" ? null : Number(heartRateValue);
    const symptoms = document.getElementById("symptoms").value.trim();

    if (!pressure || !Number.isFinite(temperature) || temperature < 25 || temperature > 45
      || !Number.isFinite(oxygen) || oxygen < 0 || oxygen > 100
      || (heartRate !== null && (!Number.isInteger(heartRate) || heartRate < 1 || heartRate > 300))
      || !symptoms) {
      return null;
    }
    return { pressure, temperature, oxygen, heartRate, symptoms };
  }

  calculateSuggestion() {
    const vitals = this.getValidatedVitals();
    if (!vitals) {
      return null;
    }
    const { pressure, temperature, oxygen, heartRate, symptoms } = vitals;
    const normalizedSymptoms = symptoms.toLocaleLowerCase("pt-BR");
    let risk = "verde";
    if (oxygen < 90 || pressure.systolic >= 180 || temperature >= 38.5
      || normalizedSymptoms.includes("dor no peito") || normalizedSymptoms.includes("convuls")) {
      risk = "vermelho";
    } else if (oxygen < 94 || pressure.systolic >= 160 || temperature >= 37.8
      || (heartRate !== null && heartRate > 120) || normalizedSymptoms.includes("falta de ar")) {
      risk = "amarelo";
    } else if (normalizedSymptoms.includes("receita") || normalizedSymptoms.includes("atestado")) {
      risk = "branco";
    }
    return risk;
  }

  suggestRisk() {
    const risk = this.calculateSuggestion();
    if (!risk) {
      this.callbacks.showMessage(this.dom.triageMessage, "Informe pressão, temperatura, oxigenação e sintomas válidos para sugerir uma classificação.");
      return;
    }
    const riskInput = document.querySelector(`[name="classification"][value="${risk}"]`);
    if (riskInput) {
      riskInput.checked = true;
    }
    this.dom.riskSuggestion.textContent = `Sugestão: ${this.priorityLabels[risk]}`;
  }

  handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.dom.triageForm);
    const classification = data.get("classification");
    const vitals = this.getValidatedVitals();
    if (!this.state.selectedPatientId || !vitals || !this.priorityLabels[classification]) {
      this.callbacks.showMessage(this.dom.triageMessage, "Preencha todos os dados da triagem com valores válidos e selecione uma classificação.");
      return;
    }
    this.state.triages.push({
      id: crypto.randomUUID(),
      patientId: this.state.selectedPatientId,
      bloodPressure: document.getElementById("bloodPressure").value.trim(),
      temperature: String(vitals.temperature),
      oxygen: String(vitals.oxygen),
      heartRate: vitals.heartRate === null ? "" : String(vitals.heartRate),
      symptoms: vitals.symptoms,
      classification,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });
    const patient = this.state.patients.find((item) => item.id === this.state.selectedPatientId);
    if (patient) {
      patient.triaged = true;
    }
    this.state.save();
    this.reset();
    this.callbacks.showMessage(this.dom.triageMessage, "Triagem registrada.");
    this.callbacks.renderAll();
  }

  reset() {
    this.dom.triageForm.reset();
    this.state.selectedPatientId = "";
    this.dom.riskSuggestion.textContent = "Sem sugestão";
    this.renderPatientOptions();
    this.renderPatientSummary();
    this.renderVitalPreview();
  }

  renderPatientOptions() {
    if (this.state.patients.length === 0) {
      this.dom.triagePatient.innerHTML = `<option value="">Nenhum paciente cadastrado</option>`;
      return;
    }
    this.dom.triagePatient.innerHTML = `<option value="">Selecionar paciente</option>` + this.state.patients.map((patient) => `
      <option value="${window.escapeHTML(patient.id)}">${window.escapeHTML(this.state.getPatientName(patient))}</option>
    `).join("");
    this.dom.triagePatient.value = this.state.selectedPatientId;
  }

  renderPatientSummary() {
    const patient = this.state.getSelectedPatient();
    if (!patient) {
      this.dom.patientSummary.innerHTML = `<div class="empty-state">Selecione um paciente para ver o resumo.</div>`;
      return;
    }
    this.dom.patientSummary.innerHTML = `
      <div class="summary-row"><span>Nome</span><strong>${window.escapeHTML(this.state.getPatientName(patient))}</strong></div>
      <div class="summary-row"><span>Idade</span><strong>${window.escapeHTML(patient.age)}</strong></div>
      <div class="summary-row"><span>Gênero</span><strong>${window.escapeHTML(patient.gender)}</strong></div>
      <div class="summary-row"><span>Convênio</span><strong>${window.escapeHTML(patient.insuranceName)}</strong></div>
      <div class="summary-row"><span>Plano</span><strong>${window.escapeHTML(patient.insurancePlan)}</strong></div>
    `;
  }

  renderVitalPreview() {
    const pressure = document.getElementById("bloodPressure").value || "--";
    const temperature = document.getElementById("temperature").value || "--";
    const oxygen = document.getElementById("oxygen").value || "--";
    const oxygenNumber = Number(oxygen);
    const oxygenClass = oxygenNumber < 90 ? "alert" : "";
    this.dom.vitalPreview.innerHTML = `
      <div class="vital-row"><span>Pressão</span><strong>${window.escapeHTML(pressure)}</strong></div>
      <div class="vital-row"><span>Temperatura</span><strong>${window.escapeHTML(temperature)} °C</strong></div>
      <div class="vital-row"><span>Oxigenação</span><strong class="${oxygenClass}">${window.escapeHTML(oxygen)}%</strong></div>
    `;
  }
}

window.TriageController = TriageController;
