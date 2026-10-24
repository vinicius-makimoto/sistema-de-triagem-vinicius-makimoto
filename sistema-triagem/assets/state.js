class AppState {
  constructor(patientStorageKey, triageStorageKey, attendedStorageKey) {
    this.patientStorageKey = patientStorageKey;
    this.triageStorageKey = triageStorageKey;
    this.attendedStorageKey = attendedStorageKey;
    this.patients = JSON.parse(localStorage.getItem(patientStorageKey) || "[]");
    this.triages = JSON.parse(localStorage.getItem(triageStorageKey) || "[]");
    this.attended = JSON.parse(localStorage.getItem(attendedStorageKey) || "[]");
    this.activeScreen = "cadastro";
    this.selectedPatientId = "";
  }

  save() {
    localStorage.setItem(this.patientStorageKey, JSON.stringify(this.patients));
    localStorage.setItem(this.triageStorageKey, JSON.stringify(this.triages));
    localStorage.setItem(this.attendedStorageKey, JSON.stringify(this.attended));
  }

  getPatientName(patient) {
    return `${patient.firstName} ${patient.lastName}`;
  }

  getSelectedPatient() {
    return this.patients.find((patient) => patient.id === this.selectedPatientId);
  }
}

window.escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
})[character]);

window.AppState = AppState;
