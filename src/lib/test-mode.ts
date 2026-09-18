export function isShellTestMode() {
  return process.env.E2E_SHELL_TEST === "1";
}
