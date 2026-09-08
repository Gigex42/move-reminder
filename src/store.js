const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_MESSAGES = [
  'Steh kurz auf und streck dich durch.',
  'Zeit für ein paar Schritte – geh eine kleine Runde.',
  'Trink ein Glas Wasser und lockere deine Schultern.',
  'Kurze Bewegungspause: ein paar Kniebeugen oder Dehnübungen.',
  'Steh auf, geh ans Fenster und schau kurz raus.',
  'Dreh ein paar Runden mit den Schultern und lockere den Nacken.',
  'Geh die Treppe hoch und runter, bevor du weiterarbeitest.',
  'Steh auf und mach ein paar tiefe Atemzüge am offenen Fenster.',
];

const DEFAULT_SETTINGS = {
  enabled: true,
  intervalMinutes: 60,
  displayMode: 'notification',
  skipWhenIdle: true,
  sound: 'chime',
  startTime: '09:00',
  endTime: '17:00',
  messages: DEFAULT_MESSAGES,
  days: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  },
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  const filePath = getSettingsPath();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      days: { ...DEFAULT_SETTINGS.days, ...(parsed.days || {}) },
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  const filePath = getSettingsPath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

module.exports = { loadSettings, saveSettings, DEFAULT_SETTINGS };
