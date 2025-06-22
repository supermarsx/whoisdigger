"use strict";
// jshint esversion: 8, -W104, -W069
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Base path --> assets/html
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const $ = __importStar(require("jquery"));
require("./renderer/index");
const settings_1 = require("./common/settings");
window.$ = $;
window.jQuery = $;
let settings = (0, settings_1.loadSettings)();
function sendDebug(message) {
    const payload = { channel: 'app:debug', message };
    electron_1.ipcRenderer.send(payload.channel, payload.message);
}
/*
  $(document).ready(function() {...});
    When document is ready
 */
$(document).ready(function () {
    const { 'custom.configuration': configuration } = settings;
    sendDebug('Document is ready');
    // Load custom configuration at startup
    if (fs.existsSync(electron_1.remote.app.getPath('userData') + configuration.filepath)) {
        sendDebug('Reading persistent configurations');
        settings = JSON.parse(fs.readFileSync(electron_1.remote.app.getPath('userData') + configuration.filepath, 'utf8'));
    }
    else {
        sendDebug('Using default configurations');
    }
    startup();
    require('./renderer/navigation');
    return;
});
/*
  startup
    Application startup checks
 */
function startup() {
    const { 'app.window.navigation': navigation } = settings;
    sendDebug("'navigation.developerTools': {0}".format(String(navigation.developerTools)));
    if (navigation.developerTools)
        $('#navTabDevtools').removeClass('is-force-hidden');
    sendDebug("'navigation.extendedcollapsed': {0}".format(String(navigation.extendedCollapsed)));
    if (navigation.extendedCollapsed) {
        $('#navButtonExpandedmenu').toggleClass('is-active');
        $('.is-specialmenu').toggleClass('is-hidden');
    }
    sendDebug("'navigation.extendedmenu': {0}".format(String(navigation.enableExtendedMenu)));
    if (navigation.enableExtendedMenu)
        $('#navButtonExpandedmenu').addClass('is-force-hidden');
    return;
}
