class QueueController {
  constructor(state, dom, priorityLabels, priorityColor, callbacks) {
    this.state = state;
    this.dom = dom;
    this.priorityLabels = priorityLabels;
    this.priorityColor = priorityColor;
    this.callbacks = callbacks;
  }

  init() {
    this.dom.callNext.addEventListener("click", () => this.callNext());
  }

  isAgePriority(patient) {
    const age = Number(patient?.age);
    return Number.isFinite(age) && (age < 3 || age > 60);
  }

  getPriorityKey(triage) {
    const priorityOrder = { vermelho: 0, amarelo: 1, verde: 2, branco: 3 };
    const patient = this.state.patients.find((item) => item.id === triage.patientId);
    return [
      priorityOrder[triage.classification] ?? 4,
      this.isAgePriority(patient) ? 0 : 1
    ];
  }

  comparePriority(a, b) {
    const aKey = this.getPriorityKey(a);
    const bKey = this.getPriorityKey(b);
    return aKey[0] - bKey[0] || aKey[1] - bKey[1];
  }

  callNext() {
    if (this.state.triages.length === 0) {
      return;
    }
    if (!window.Swal) {
      this.callbacks.showMessage("Não foi possível chamar o próximo paciente porque SweetAlert2 não foi carregado.");
      return;
    }
    const nextIndex = this.state.triages
      .map((triage, index) => ({ triage, index }))
      .sort((a, b) => this.comparePriority(a.triage, b.triage) || a.index - b.index)[0].index;
    const called = this.state.triages.splice(nextIndex, 1)[0];
    const patient = this.state.patients.find((item) => item.id === called.patientId);
    if (patient) {
      patient.triaged = true;
      this.state.attended.unshift({
        id: crypto.randomUUID(),
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        gender: patient.gender,
        classification: called.classification,
        time: called.time,
        calledAt: new Date().toISOString(),
        symptoms: called.symptoms
      });
    }
    window.Swal.fire({
      title: "Paciente chamado",
      text: `${patient ? this.state.getPatientName(patient) : "Paciente"} encaminhado para atendimento.`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#2f80d8"
    });
    this.state.save();
    this.callbacks.renderAll();
  }

  render() {
    if (this.state.triages.length === 0) {
      this.dom.queueBoard.innerHTML = `<div class="empty-state">Nenhum paciente aguardando atendimento.</div>`;
      return;
    }
    this.dom.queueBoard.innerHTML = this.state.triages.map((triage, index) => ({ triage, index }))
      .sort((a, b) => this.comparePriority(a.triage, b.triage) || a.index - b.index)
      .map(({ triage }) => {
      const patient = this.state.patients.find((item) => item.id === triage.patientId);
      const patientName = patient ? this.state.getPatientName(patient) : "Paciente não encontrado";
      const classification = Object.hasOwn(this.priorityLabels, triage.classification) ? triage.classification : "branco";
      const agePriority = this.isAgePriority(patient);
      return `
        <article class="queue-card">
          <div class="risk-bar" style="background:${this.priorityColor[classification]}"></div>
          <div class="queue-body">
            <header>
              <div>
                <strong>${window.escapeHTML(patientName)}</strong>
                <small>Entrada ${window.escapeHTML(triage.time)}</small>
              </div>
              <div class="queue-tags">
                <span class="tag ${classification}">${this.priorityLabels[classification]}</span>
                ${agePriority ? `<span class="tag priority-age">Prioridade etária</span>` : ""}
              </div>
            </header>
            <div class="tag-row">
              <span class="tag">PA ${window.escapeHTML(triage.bloodPressure)}</span>
              <span class="tag">Temp ${window.escapeHTML(triage.temperature)} °C</span>
              <span class="tag">SpO2 ${window.escapeHTML(triage.oxygen)}%</span>
            </div>
            <p class="meta-line">${window.escapeHTML(triage.symptoms)}</p>
          </div>
        </article>
      `;
    }).join("");
  }

  renderAttended() {
    if (this.state.attended.length === 0) {
      this.dom.attendedBoard.innerHTML = `<div class="empty-state">Nenhum paciente foi chamado para atendimento.</div>`;
      return;
    }
    this.dom.attendedBoard.innerHTML = this.state.attended.map((record) => {
      const classification = Object.hasOwn(this.priorityLabels, record.classification) ? record.classification : "branco";
      const patientName = `${record.firstName} ${record.lastName}`;
      const calledAt = new Date(record.calledAt).toLocaleString("pt-BR");
      return `
        <article class="queue-card">
          <div class="risk-bar" style="background:${this.priorityColor[classification]}"></div>
          <div class="queue-body">
            <header>
              <div>
                <strong>${window.escapeHTML(patientName)}</strong>
                <small>${window.escapeHTML(record.age)} anos · Chamado em ${window.escapeHTML(calledAt)}</small>
              </div>
              <span class="tag ${classification}">${this.priorityLabels[classification]}</span>
            </header>
            <p class="meta-line">${window.escapeHTML(record.symptoms)}</p>
          </div>
        </article>
      `;
    }).join("");
  }
}

window.QueueController = QueueController;
