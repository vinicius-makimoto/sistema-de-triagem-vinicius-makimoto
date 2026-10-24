class PatientRegistration {
  constructor(state, dom, callbacks) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.lastRequestedCep = "";
    this.activeCepRequest = null;
  }

  init() {
    this.dom.patientForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearPatientForm.addEventListener("click", () => this.reset());
    this.dom.patientSearch.addEventListener("input", () => this.render());
    this.dom.patientList.addEventListener("click", (event) => this.handleListClick(event));
    this.dom.insurancePlan.addEventListener("change", () => this.updateInsuranceFields());
    this.updateInsuranceFields();
    this.initJQueryFeatures();
  }

  updateInsuranceFields() {
    const isPublicHealthcare = this.dom.insurancePlan.value === "SUS";
    [this.dom.insuranceName, this.dom.insuranceValidUntil].forEach((field) => {
      field.disabled = isPublicHealthcare;
      field.required = !isPublicHealthcare;
      if (isPublicHealthcare) {
        field.setCustomValidity("");
      }
    });
  }

  initJQueryFeatures() {
    if (!window.jQuery) {
      this.dom.cepMessage.textContent = "Não foi possível carregar jQuery; máscara e consulta de CEP estão indisponíveis.";
      return;
    }

    const $ = window.jQuery;
    const cepInput = $(this.dom.cep);

    $("#age").on("input change", (event) => {
      const ageInput = event.currentTarget;
      ageInput.setCustomValidity(ageInput.value !== "" && Number(ageInput.value) < 0
        ? "A idade não pode ser negativa."
        : "");
    });

    $("#insuranceValidUntil").on("input", (event) => {
      const input = event.currentTarget;
      const digits = input.value.replace(/\D/g, "").slice(0, 6);
      input.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      input.setCustomValidity(
        this.isCurrentOrFutureMonth(input.value) || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(input.value)
          ? ""
          : "A validade não pode ser anterior ao mês e ano atuais."
      );
    });

    cepInput.on("input", () => {
      const digits = cepInput.val().replace(/\D/g, "").slice(0, 8);
      cepInput.val(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
      if (digits.length !== 8) {
        this.lastRequestedCep = "";
        if (this.activeCepRequest) {
          this.activeCepRequest.abort();
          this.activeCepRequest = null;
        }
        this.clearAddressFields();
        this.dom.cepMessage.textContent = "Digite os 8 dígitos do CEP para consultar.";
        return;
      }
      if (digits === this.lastRequestedCep) {
        return;
      }
      this.lastRequestedCep = digits;
      this.clearAddressFields();
      this.dom.cepMessage.textContent = "Consultando ViaCEP...";
      if (this.activeCepRequest) {
        this.activeCepRequest.abort();
      }
      this.activeCepRequest = $.ajax({
        url: `https://viacep.com.br/ws/${digits}/json/`,
        method: "GET",
        dataType: "json"
      }).done((result) => {
        if (cepInput.val().replace(/\D/g, "") !== digits) {
          return;
        }
        if (result.erro) {
          this.lastRequestedCep = "";
          this.dom.cepMessage.textContent = "CEP não encontrado. Confira o número e tente novamente.";
          return;
        }
        this.dom.address.value = result.logradouro || "";
        this.dom.neighborhood.value = result.bairro || "";
        this.dom.city.value = result.localidade || "";
        this.dom.state.value = result.uf || "";
        this.dom.cepMessage.textContent = "Endereço preenchido pelo ViaCEP. Confira os dados.";
      }).fail((request, status) => {
        if (status !== "abort" && cepInput.val().replace(/\D/g, "") === digits) {
          this.lastRequestedCep = "";
          this.dom.cepMessage.textContent = "Falha ao consultar o ViaCEP. Verifique a conexão e tente novamente.";
        }
      }).always(() => {
        if (cepInput.val().replace(/\D/g, "") === digits) {
          this.activeCepRequest = null;
        }
      });
    });
  }

  clearAddressFields() {
    this.dom.address.value = "";
    this.dom.neighborhood.value = "";
    this.dom.city.value = "";
    this.dom.state.value = "";
  }

  handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.dom.patientForm);
    const ageValue = String(data.get("age") ?? "").trim();
    const age = Number(ageValue);
    const insuranceValidUntil = String(data.get("insuranceValidUntil") ?? "").trim();
    const street = String(data.get("address") ?? "").trim();
    const neighborhood = String(data.get("neighborhood") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    const state = String(data.get("state") ?? "").trim().toLocaleUpperCase("pt-BR");
    const cep = String(data.get("cep") ?? "").trim();
    const usesPrivateInsurance = data.get("insurancePlan") !== "SUS";
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const insuranceCard = String(data.get("insuranceCard") ?? "").trim();
    const location = [city, state].filter(Boolean).join(" - ");
    const address = [street, neighborhood, location, cep].filter(Boolean).join(", ");
    const patient = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      age: String(age),
      gender: String(data.get("gender") ?? ""),
      address: address || street,
      cep,
      neighborhood,
      city,
      state,
      insuranceName: String(data.get("insuranceName") ?? "").trim(),
      insuranceCard,
      insuranceValidUntil: usesPrivateInsurance ? this.toStorageMonth(insuranceValidUntil) : "",
      insurancePlan: String(data.get("insurancePlan") ?? ""),
      createdAt: new Date().toISOString()
    };
    if (!patient.firstName || !patient.lastName || !ageValue || !Number.isInteger(age) || age < 0 || age > 130
      || !patient.gender || !patient.address || (usesPrivateInsurance && !patient.insuranceName) || !patient.insuranceCard
      || !patient.insurancePlan
      || (usesPrivateInsurance && (!patient.insuranceValidUntil || !this.isCurrentOrFutureMonth(insuranceValidUntil)))
      || (cep && !/^\d{5}-?\d{3}$/.test(cep))) {
      this.callbacks.showMessage(this.dom.patientMessage, "Preencha os campos obrigatórios com valores válidos. A validade deve ser igual ou posterior ao mês atual.");
      return;
    }
    this.state.patients.push(patient);
    this.state.selectedPatientId = patient.id;
    this.state.save();
    this.reset();
    this.callbacks.showMessage(this.dom.patientMessage, "Paciente cadastrado.");
    this.callbacks.renderAll();
  }

  toStorageMonth(value) {
    const match = String(value ?? "").match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
    return match ? `${match[2]}-${match[1]}` : "";
  }

  isCurrentOrFutureMonth(value) {
    const match = String(value ?? "").match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
    if (!match) {
      return false;
    }
    const enteredMonth = Number(match[2]) * 12 + Number(match[1]);
    const currentDate = new Date();
    const currentMonth = currentDate.getFullYear() * 12 + currentDate.getMonth() + 1;
    return enteredMonth >= currentMonth;
  }

  async handleListClick(event) {
    const selectButton = event.target.closest("[data-select-patient]");
    const deleteButton = event.target.closest("[data-delete-patient]");
    if (selectButton) {
      this.state.selectedPatientId = selectButton.dataset.selectPatient;
      this.callbacks.setScreen("triagem");
      this.callbacks.renderAll();
    }
    if (deleteButton) {
      const patient = this.state.patients.find((item) => item.id === deleteButton.dataset.deletePatient);
      if (!patient) {
        return;
      }

      if (!window.Swal) {
        this.callbacks.showMessage(this.dom.patientMessage, "Confirmação indisponível: SweetAlert2 não foi carregado. O paciente não foi removido.");
        return;
      }

      const result = await window.Swal.fire({
        title: "Remover paciente?",
        text: `Deseja realmente excluir ${this.state.getPatientName(patient)}? Esta ação também removerá suas triagens.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim, remover",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#c0392b",
        reverseButtons: true
      });
      if (!result.isConfirmed) {
        return;
      }

      const index = this.state.patients.findIndex((item) => item.id === patient.id);
      const removed = index >= 0 ? this.state.patients.splice(index, 1)[0] : null;
      if (!removed) {
        return;
      }
      this.state.triages = this.state.triages.filter((triage) => triage.patientId !== removed.id);
      this.state.attended = this.state.attended.filter((record) => record.patientId !== removed.id);
      if (this.state.selectedPatientId === removed.id) {
        this.state.selectedPatientId = "";
      }
      this.state.save();
      this.callbacks.renderAll();
      await window.Swal.fire({
        title: "Paciente removido",
        text: `${this.state.getPatientName(removed)} foi excluído do sistema.`,
        icon: "success",
        confirmButtonText: "OK"
      });
    }
  }

  reset() {
    this.lastRequestedCep = "";
    if (this.activeCepRequest) {
      this.activeCepRequest.abort();
      this.activeCepRequest = null;
    }
    this.dom.patientForm.reset();
    this.updateInsuranceFields();
    this.dom.cepMessage.textContent = "Digite o CEP para preencher o endereço via ViaCEP.";
    this.dom.age.setCustomValidity("");
  }

  render() {
    const search = this.dom.patientSearch.value.trim().toLocaleLowerCase("pt-BR");
    const patients = this.state.patients.filter((patient) =>
      this.state.getPatientName(patient).toLocaleLowerCase("pt-BR").includes(search));
    if (patients.length === 0) {
      this.dom.patientList.innerHTML = `<div class="empty-state">Nenhum paciente na recepção.</div>`;
      return;
    }
    this.dom.patientList.innerHTML = patients.map((patient) => `
      <article class="patient-card">
        <header>
          <div>
            <strong>${window.escapeHTML(this.state.getPatientName(patient))}</strong>
            <small>${window.escapeHTML(patient.age)} anos · ${window.escapeHTML(patient.gender)}</small>
          </div>
          <span class="tag">${window.escapeHTML(patient.insurancePlan)}</span>
        </header>
        <div class="meta-line">${window.escapeHTML(patient.address)}</div>
        <div class="meta-line">${window.escapeHTML(patient.insuranceName)} · ${window.escapeHTML(patient.insuranceCard)}</div>
        <div class="patient-actions">
          <button class="small-button" data-select-patient="${window.escapeHTML(patient.id)}" type="button">Triar</button>
          <button class="small-button danger-button" data-delete-patient="${window.escapeHTML(patient.id)}" type="button">Remover</button>
        </div>
      </article>
    `).join("");
  }
}

window.PatientRegistration = PatientRegistration;
