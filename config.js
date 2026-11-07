const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
window.ROBOOPS_CONFIG = { apiBase: localHost ? window.location.origin : "" };
